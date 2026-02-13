import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { auth, googleProvider, db } from '../config/firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import '../styles/Login.css';

export const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register' | 'request'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEmailAllowed = async (userEmail: string): Promise<boolean> => {
    try {
      // Admin email bez whitelistu
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();
      if (userEmail.toLowerCase() === adminEmail) {
        console.log('Admin email - bypass whitelist');
        return true;
      }

      console.log('Kontrolujem email:', userEmail.toLowerCase());
      const allowedEmailsRef = collection(db, 'allowedEmails');
      
      // Stiahni VŠETKY emaily aby sme videli čo je tam
      const allEmails = await getDocs(allowedEmailsRef);
      console.log('Všetky emaily v DB:', allEmails.docs.map(doc => doc.data().email));
      
      // Teraz kontroluj konkrétny email
      const q = query(allowedEmailsRef, where('email', '==', userEmail.toLowerCase()));
      const querySnapshot = await getDocs(q);
      console.log('Query výsledok:', querySnapshot.empty ? 'PRÁZDNY' : 'NÁJDENÝ');
      console.log('Počet zhodných emailov:', querySnapshot.size);
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Chyba pri kontrole emailu:', error);
      return false;
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Skontroluj, či je email na whitelist
      const allowed = await isEmailAllowed(user.email!);
      
      if (!allowed) {
        await signOut(auth);
        setError('Tento email nemá prístup k aplikácii');
        return;
      }

      // Kontrola, či užívateľ už v databáze existuje
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Vytvorenie nového užívateľa s rolou 'user'
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'user',
          createdAt: new Date(),
        });
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('Chyba pri prihlásení:', error);
      setError('Chyba pri prihlásení cez Google');
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Skontroluj whitelist pred prihlásením
      const allowed = await isEmailAllowed(email);
      
      if (!allowed) {
        setError('Tento email nemá prístup k aplikácii');
        setLoading(false);
        return;
      }

      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Chyba pri prihlásení:', error);
      if (error.code === 'auth/user-not-found') {
        setError('Užívateľ nenájdený');
      } else if (error.code === 'auth/wrong-password') {
        setError('Nesprávne heslo');
      } else {
        setError('Chyba pri prihlásení');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Skontroluj whitelist pred registráciou
      const allowed = await isEmailAllowed(email);
      
      if (!allowed) {
        setError('');
        setLoading(false);
        return;
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Nastaviť displayName
      if (displayName) {
        await updateProfile(user, { displayName });
      }

      // Skontroluj či existuje dokument s transformovaným emailom (z admin schválenia)
      const normalizedEmail = email.toLowerCase().replace(/\./g, '_');
      const existingDocRef = doc(db, 'users', normalizedEmail);
      const existingDocSnap = await getDoc(existingDocRef);

      if (existingDocSnap.exists()) {
        // Dokument existuje (bol schválený adminom), aktualizuj ho s novým UID
        console.log('Aktualizujem existujúci dokument s UID:', user.uid);
        
        // Vytvor nový dokument s UID a skopíruj dáta
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: displayName || existingDocSnap.data().displayName || 'Užívateľ',
          photoURL: '',
          role: existingDocSnap.data().role || 'user',
          createdAt: existingDocSnap.data().createdAt || new Date(),
        });

        // Vymaž starý dokument s transformovaným emailom
        await deleteDoc(existingDocRef);
        console.log('Starý dokument vymazaný');
      } else {
        // Dokument neexistuje, vytvor nový
        console.log('Vytváram nový dokument s UID:', user.uid);
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: displayName || 'Užívateľ',
          photoURL: '',
          role: 'user',
          createdAt: new Date(),
        });
      }

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Chyba pri registrácii:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Email sa už používa');
      } else if (error.code === 'auth/weak-password') {
        setError('Heslo musí mať aspoň 6 znakov');
      } else {
        setError('Chyba pri registrácii');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Prihlásenie</h1>
        
        <div className="mode-tabs">
          <button
            className={`mode-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Prihlásenie
          </button>
          <button
            className={`mode-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Registrácia
          </button>
          <button
            className={`mode-tab ${mode === 'request' ? 'active' : ''}`}
            onClick={() => {
              setMode('request');
              setError('');
            }}
          >
            Žiadosť o prístup
          </button>
        </div>

        {mode === 'login' ? (
          <>
            <form onSubmit={handleEmailSignIn} className="auth-form">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
              />
              <input
                type="password"
                placeholder="Heslo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
              />
              {error && <div className="error-message">{error}</div>}
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Prihlasuje sa...' : 'Prihlásiť sa'}
              </button>
            </form>
          </>
        ) : mode === 'register' ? (
          <>
            <form onSubmit={handleEmailRegister} className="auth-form">
              <input
                type="text"
                placeholder="Meno a priezvisko"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="form-input"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
              />
              <input
                type="password"
                placeholder="Heslo (min. 6 znakov)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
              />
              {error && <div className="error-message">{error}</div>}
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Registruje sa...' : 'Registrovať sa'}
              </button>
            </form>
          </>
        ) : (
          <div className="request-info">
            <p>Nemáte ešte prístup? Vyplňte formulár s vašim emailom a počkajte na schválenie administrátora.</p>
            <button
              className="request-link-btn"
              onClick={() => navigate('/access-request')}
            >
              Prejsť na žiadosť o prístup
            </button>
          </div>
        )}
        

      {/*}

        <div className="divider">alebo</div>


        <button onClick={handleGoogleSignIn} className="google-signin-btn">
          <svg className="google-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Prihlásiť sa cez Google
        </button>
      */}


      </div>
    </div>
  );
};

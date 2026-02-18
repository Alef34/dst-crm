/*

import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, addDoc, query, where, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import '../styles/PendingRegistrations.css';

interface PendingRegistration {
  id: string;
  email: string;
  message: string;
  requestedAt: Date;
  status: string;
}

export const PendingRegistrations = () => {
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    try {
      const q = query(
        collection(db, 'pendingRegistrations'),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      const registrationsList: PendingRegistration[] = [];
      querySnapshot.forEach((doc) => {
        registrationsList.push({
          id: doc.id,
          email: doc.data().email,
          message: doc.data().message || '',
          requestedAt: doc.data().requestedAt?.toDate(),
          status: doc.data().status,
        });
      });
      setRegistrations(registrationsList.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime()));
    } catch (error) {
      console.error('Chyba pri načítaní žiadostí:', error);
      setMessage('Chyba pri načítaní žiadostí');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, email: string) => {
    try {
      console.log('Schváľujem email:', email);
      
      // Skontroluj či email už v whitelist
      const allowedQuery = query(
        collection(db, 'allowedEmails'),
        where('email', '==', email)
      );
      const existing = await getDocs(allowedQuery);

      if (!existing.empty) {
        setMessage('Tento email je už v whitelist');
        setMessageType('error');
        return;
      }

      // Pridaj do whitelist
      await addDoc(collection(db, 'allowedEmails'), {
        email: email,
        addedAt: new Date(),
        approvedFrom: 'registration',
      });
      console.log('Email pridaný do whitelist');

      // Vytvor záznam v users kolekcii
      const userDocId = email.replace(/[.]/g, '_'); // Nahraď bodky podčiarkami pre ID
      console.log('Vytváram user záznam s ID:', userDocId);
      
      await setDoc(doc(db, 'users', userDocId), {
        email: email,
        displayName: '',
        photoURL: '',
        role: 'user',
        createdAt: new Date(),
        status: 'pending_authentication', // Čaká na vytvorenie účtu
      });
      console.log('User záznam vytvorený');

      // Vymaž žiadosť
      await deleteDoc(doc(db, 'pendingRegistrations', id));
      console.log('Žiadosť vymazaná');

      setMessage(`Email ${email} bol schválený. Užívateľ sa môže teraz zaregistrovať.`);
      setMessageType('success');
      loadRegistrations();
    } catch (error) {
      console.error('Chyba pri schválení:', error);
      setMessage('Chyba pri schválení žiadosti');
      setMessageType('error');
    }
  };

  const handleReject = async (id: string, email: string) => {
    try {
      await deleteDoc(doc(db, 'pendingRegistrations', id));
      setMessage(`Žiadosť od ${email} bola zamietnutá`);
      setMessageType('success');
      loadRegistrations();
    } catch (error) {
      console.error('Chyba pri zamietnutí:', error);
      setMessage('Chyba pri zamietnutí žiadosti');
      setMessageType('error');
    }
  };

  if (loading) {
    return <div className="pending-reg-container">Načítavam...</div>;
  }

  return (
    <div className="pending-reg-container">
      <div className="pending-reg-header">
        <h2>Čakajúce registrácie</h2>
        <p>Schválite alebo zamietните žiadosti o prístup</p>
      </div>

      {message && (
        <div className={`message message-${messageType}`}>
          {message}
        </div>
      )}

      <div className="pending-reg-card">
        {registrations.length === 0 ? (
          <p className="empty-message">Žiadne čakajúce žiadosti</p>
        ) : (
          <div className="registrations-list">
            {registrations.map((reg) => (
              <div key={reg.id} className="registration-item">
                <div className="registration-info">
                  <h3>{reg.email}</h3>
                  <p className="date">
                    Požiadané: {reg.requestedAt?.toLocaleDateString('sk-SK')} o{' '}
                    {reg.requestedAt?.toLocaleTimeString('sk-SK', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {reg.message && (
                    <p className="message-text">
                      <strong>Poznámka:</strong> {reg.message}
                    </p>
                  )}
                </div>
                <div className="registration-actions">
                  <button
                    className="approve-btn"
                    onClick={() => handleApprove(reg.id, reg.email)}
                  >
                    Schváliť
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => handleReject(reg.id, reg.email)}
                  >
                    Zamietnuť
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
*/
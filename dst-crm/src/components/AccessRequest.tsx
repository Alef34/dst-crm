import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import '../styles/AccessRequest.css';

export const AccessRequest = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validácia emailu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Neplatný email formát');
      setLoading(false);
      return;
    }

    try {
      await addDoc(collection(db, 'pendingRegistrations'), {
        email: email.toLowerCase(),
        message: message.trim(),
        requestedAt: new Date(),
        status: 'pending',
      });

      setSubmitted(true);
      setEmail('');
      setMessage('');
      
      // Presmerovať na login po 3 sekundách
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      console.error('Chyba pri odoslaní žiadosti:', error);
      setError('Chyba pri odoslaní žiadosti');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="access-request-container">
        <div className="success-message">
          <h2>✓ Žiadosť odoslaná</h2>
          <p>Vaša žiadosť o prístup bola odoslaná. Čakajte na schválenie administrátora.</p>
          <p className="redirect-text">Presmerovávam vás na prihlásenie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="access-request-container">
      <div className="request-card">
        <h2>Žiadosť o prístup</h2>
        <p>Nemáte ešte účet? Vyplňte formulár a počkajte na schválenie administrátora.</p>

        <form onSubmit={handleSubmit} className="request-form">
          <input
            type="email"
            placeholder="Vaš email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="form-input"
          />

          <textarea
            placeholder="Dôvod prístupu (voliteľne)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="form-textarea"
          />

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Odosielam...' : 'Odoslať žiadosť'}
          </button>
        </form>
      </div>
    </div>
  );
};

import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { ImportStudents } from './ImportStudents';
import { AllowedEmails } from './AllowedEmails';
import { PendingRegistrations } from './PendingRegistrations';
import { UsersManagement } from './UsersManagement';
import { useState } from 'react';
import '../styles/Dashboard.css';
import { UserProfile } from './UserProfile';



export const Dashboard = () => {
  const [adminTab, setAdminTab] = useState<'import' | 'emails' | 'pending' | 'users'>('import');
  const { user, role, isAdmin } = useAuth();
  const navigate = useNavigate();

  //changing email and password
  const [showCreds, setShowCreds] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [credError, setCredError] = useState('');
  const [credMsg, setCredMsg] = useState('');
  const [credLoading, setCredLoading] = useState(false);

  

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Chyba pri odhlášení:', error);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Vitajte, {user?.displayName}</h1>
          <div className="user-info">
            <span className={`role-badge ${role}`}>{role === 'admin' ? 'Administrátor' : 'Užívateľ'}</span>
            {user?.photoURL && (
              <img src={user.photoURL} alt={user.displayName || 'Profil'} className="user-avatar" />
            )}
          </div>
        </div>
        <button onClick={handleLogout} className="logout-btn">Odhlásiť sa</button>
        <button onClick={() => setShowCreds(!showCreds)} className="change-credentials-btn">Prihlasavacie údaje</button>

        


      </header>

      <main className="dashboard-main">
        {isAdmin ? (
          <div className="admin-section">
            <div className="admin-tabs">
              <button
                className={`tab-btn ${adminTab === 'pending' ? 'active' : ''}`}
                onClick={() => setAdminTab('pending')}
              >
                Čakajúce registrácie
              </button>
              <button
                className={`tab-btn ${adminTab === 'import' ? 'active' : ''}`}
                onClick={() => setAdminTab('import')}
              >
                Import študentov
              </button>
              <button
                className={`tab-btn ${adminTab === 'emails' ? 'active' : ''}`}
                onClick={() => setAdminTab('emails')}
              >
                Povolené emaily
              </button>
              <button
                className={`tab-btn ${adminTab === 'users' ? 'active' : ''}`}
                onClick={() => setAdminTab('users')}
              >
                Správa užívateľov
              </button>
            </div>
            {adminTab === 'pending' && <PendingRegistrations />}
            {adminTab === 'import' && <ImportStudents />}
            {adminTab === 'emails' && <AllowedEmails />}
            {adminTab === 'users' && <UsersManagement />}
          </div>
        ) : (
          <UserProfile />
        )}
      </main>
    </div>
  );
};

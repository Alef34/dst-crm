import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import '../styles/UsersManagement.css';

interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

export const UsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersList: User[] = [];
      querySnapshot.forEach((doc) => {
        usersList.push({
          id: doc.id,
          email: doc.data().email || '',
          displayName: doc.data().displayName || '',
          role: doc.data().role || 'user',
          createdAt: doc.data().createdAt?.toDate(),
        });
      });
      setUsers(usersList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Chyba pri načítaní užívateľov:', error);
      setMessage('Chyba pri načítaní užívateľov');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
      });

      setMessage(`Rola používateľa bola zmenená na ${newRole === 'admin' ? 'Administrátor' : 'Užívateľ'}`);
      setMessageType('success');
      loadUsers();
    } catch (error) {
      console.error('Chyba pri zmene roly:', error);
      setMessage('Chyba pri zmene roly');
      setMessageType('error');
    }
  };

  if (loading) {
    return <div className="users-management-container">Načítavam...</div>;
  }

  return (
    <div className="users-management-container">
      <div className="users-management-header">
        <h2>Správa užívateľov</h2>
        <p>Spravujte role a oprávnenia užívateľov</p>
      </div>

      {message && (
        <div className={`message message-${messageType}`}>
          {message}
        </div>
      )}

      <div className="users-management-card">
        {users.length === 0 ? (
          <p className="empty-message">Žiadni užívatelia v systéme</p>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Meno</th>
                  <th>Rola</th>
                  <th>Registrovaný</th>
                  <th>Akcia</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="email-cell">{user.email}</td>
                    <td>{user.displayName || '-'}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role === 'admin' ? 'Administrátor' : 'Užívateľ'}
                      </span>
                    </td>
                    <td>{user.createdAt?.toLocaleDateString('sk-SK')}</td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'user')}
                        className="role-select"
                      >
                        <option value="user">Užívateľ</option>
                        <option value="admin">Administrátor</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

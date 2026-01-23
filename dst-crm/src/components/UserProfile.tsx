import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import '../styles/UserProfile.css';

interface StudentData {
  Name: string;
  Surname: string;
  Region: string;
  School: string;
  Mail: string;
  TelephoneNumber: string;
  TypeOfPayment: string;
  Period: string;
  AMount: string;
  IBAN: string;
  Note: string;
  VS: string;
  [key: string]: string;
}

// Funkcia tvoriaca komponent UserProfile --> uzivatelsky profil

export const UserProfile = () => { 
  //premene
  const { user } = useAuth();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editedData, setEditedData] = useState<StudentData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [studentDocId, setStudentDocId] = useState<string>('');

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user?.email) return;

      try {
        const q = query(collection(db, 'students'), where('Mail', '==', user.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const studentDoc = querySnapshot.docs[0];
          const data = studentDoc.data() as StudentData;
          setStudentData(data);
          setEditedData(data);
          setStudentDocId(studentDoc.id);
        }
        setLoading(false);
      } catch (error) {
        console.error('Chyba pri načítaní údajov študenta:', error);
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedData((prev) => prev ? { ...prev, [name]: value } : null);
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedData((prev) => prev ? { ...prev, [name]: value } : null);
  };

  const handleSave = async () => {
    if (!editedData || !studentDocId) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'students', studentDocId), editedData);
      setStudentData(editedData);
      setIsEditing(false);
    } catch (error) {
      console.error('Chyba pri uložení údajov:', error);
      alert('Chyba pri uložení údajov');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedData(studentData);
    setIsEditing(false);
  };

  if (loading) {
    return <div className="loading">Načítavanie údajov...</div>;
  }

  if (!studentData) {
    return <div className="error">Študentský záznam nenájdený</div>;
  }

  return (
    <div className="user-profile-container">
      <div className="profile-header">
        <h2>Môj profil</h2>
        {!isEditing && (
          <button className="edit-btn" onClick={() => setIsEditing(true)}>
            Upraviť
          </button>
        )}
      </div>

      <div className="profile-card">
        {isEditing ? (
          <form className="profile-form">
            <div className="form-group">
              <label htmlFor="Name">Meno</label>
              <input id="Name" type="text" name="Name" value={editedData?.Name || ''} onChange={handleInputChange} placeholder="Vaše meno" />
            </div>
            <div className="form-group">
              <label htmlFor="Surname">Priezvisko</label>
              <input id="Surname" type="text" name="Surname" value={editedData?.Surname || ''} onChange={handleInputChange} placeholder="Vaše priezvisko" />
            </div>
            <div className="form-group">
              <label htmlFor="Region">Región</label>
              <input id="Region" type="text" name="Region" value={editedData?.Region || ''} onChange={handleInputChange} placeholder="Váš región" />
            </div>
            <div className="form-group">
              <label htmlFor="School">Škola</label>
              <input id="School" type="text" name="School" value={editedData?.School || ''} onChange={handleInputChange} placeholder="Vaša škola" />
            </div>
            <div className="form-group">
              <label htmlFor="Mail">Email</label>
              <input id="Mail" type="email" name="Mail" value={editedData?.Mail || ''} onChange={handleInputChange} placeholder="Váš email" disabled />
            </div>
            <div className="form-group">
              <label htmlFor="TelephoneNumber">Telefónne číslo</label>
              <input id="TelephoneNumber" type="tel" name="TelephoneNumber" value={editedData?.TelephoneNumber || ''} onChange={handleInputChange} placeholder="Vaše telefónne číslo" />
            </div>
            <div className="form-group">
              <label htmlFor="TypeOfPayment">Typ platby</label>
              <input id="TypeOfPayment" type="text" name="TypeOfPayment" value={editedData?.TypeOfPayment || ''} onChange={handleInputChange} placeholder="Typ platby" />
            </div>
            <div className="form-group">
              <label htmlFor="Period">Obdobie</label>
              <input id="Period" type="text" name="Period" value={editedData?.Period || ''} onChange={handleInputChange} placeholder="Obdobie" />
            </div>
            <div className="form-group">
              <label htmlFor="AMount">Suma</label>
              <input id="AMount" type="text" name="AMount" value={editedData?.AMount || ''} onChange={handleInputChange} placeholder="Suma" />
            </div>
            <div className="form-group">
              <label htmlFor="IBAN">IBAN</label>
              <input id="IBAN" type="text" name="IBAN" value={editedData?.IBAN || ''} onChange={handleInputChange} placeholder="Váš IBAN" />
            </div>
            <div className="form-group">
              <label htmlFor="VS">Variabilný symbol</label>
              <input id="VS" type="text" name="VS" value={editedData?.VS || ''} onChange={handleInputChange} placeholder="Variabilný symbol" />
            </div>
            <div className="form-group form-group-full">
              <label htmlFor="Note">Poznámka</label>
              <textarea id="Note" name="Note" value={editedData?.Note || ''} onChange={handleTextAreaChange} placeholder="Poznámka" rows={4} />
            </div>
            <div className="form-actions">
              <button type="button" className="save-btn" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Ukladám...' : 'Uložiť'}
              </button>
              <button type="button" className="cancel-btn" onClick={handleCancel} disabled={isSaving}>
                Zrušiť
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-view">
            <div className="profile-field">
              <span className="field-label">Meno:</span>
              <span className="field-value">{studentData?.Name || '-'}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Priezvisko:</span>
              <span className="field-value">{studentData?.Surname || '-'}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Región:</span>
              <span className="field-value">{studentData?.Region || '-'}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Škola:</span>
              <span className="field-value">{studentData?.School || '-'}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Email:</span>
              <span className="field-value">{studentData?.Mail || '-'}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Telefónne číslo:</span>
              <span className="field-value">{studentData?.TelephoneNumber || '-'}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Typ platby:</span>
              <span className="field-value">{studentData?.TypeOfPayment || '-'}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Obdobie:</span>
              <span className="field-value">{studentData?.Period || '-'}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Suma:</span>
              <span className="field-value">{studentData?.AMount || '-'}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">IBAN:</span>
              <span className="field-value">{studentData?.IBAN || '-'}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Variabilný symbol:</span>
              <span className="field-value">{studentData?.VS || '-'}</span>
            </div>
            <div className="profile-field profile-field-full">
              <span className="field-label">Poznámka:</span>
              <span className="field-value">{studentData?.Note || '-'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

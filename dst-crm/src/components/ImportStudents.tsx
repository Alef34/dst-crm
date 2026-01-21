import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import '../styles/ImportStudents.css';

interface StudentRecord {
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
}

export const ImportStudents = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setMessage('');
    }
  };

  const handleImport = async () => {
    if (!file) {
      setMessage('Vyberte JSON súbor');
      setMessageType('error');
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const students: StudentRecord[] = JSON.parse(text);

      if (!Array.isArray(students)) {
        throw new Error('JSON musí obsahovať pole študentov');
      }

      let successCount = 0;
      let errorCount = 0;

      for (const student of students) {
        try {
          // Validácia povinných polí
          if (!student.Mail || !student.Name || !student.Surname) {
            errorCount++;
            continue;
          }

          // Uloženie do Firestore
          await addDoc(collection(db, 'students'), {
            Name: student.Name,
            Surname: student.Surname,
            Region: student.Region || '',
            School: student.School || '',
            Mail: student.Mail,
            TelephoneNumber: student.TelephoneNumber || '',
            TypeOfPayment: student.TypeOfPayment || '',
            Period: student.Period || '',
            AMount: student.AMount || '',
            IBAN: student.IBAN || '',
            Note: student.Note || '',
            VS: student.VS || '',
            importedAt: new Date(),
          });

          successCount++;
        } catch (error) {
          console.error('Chyba pri importovaní študenta:', student.Mail, error);
          errorCount++;
        }
      }

      setMessage(`Úspešne importovaných: ${successCount}, Chyby: ${errorCount}`);
      setMessageType('success');
      setFile(null);
      (document.getElementById('file-input') as HTMLInputElement).value = '';
    } catch (error) {
      console.error('Chyba pri parsovaní JSON:', error);
      setMessage('Chyba pri čítaní JSON súboru. Skontrolujte formát.');
      setMessageType('error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="import-students-container">
      <div className="import-header">
        <h2>Import študentov</h2>
        <p>Nahrajte JSON súbor so študentami</p>
      </div>

      <div className="import-card">
        <div className="file-input-wrapper">
          <label htmlFor="file-input" className="file-input-label">
            Vyberte JSON súbor
          </label>
          <input
            id="file-input"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="file-input"
          />
          <span className="file-name">{file?.name || 'Žiadny súbor nie je vybraný'}</span>
        </div>

        <div className="format-info">
          <h3>Formát JSON súboru:</h3>
          <pre>{`[
  {
    "Name": "Meno",
    "Surname": "Priezvisko",
    "Region": "Región",
    "School": "Škola",
    "Mail": "email@example.com",
    "TelephoneNumber": "+421950123456",
    "TypeOfPayment": "Bankový prevod",
    "Period": "2025-2026",
    "AMount": "500",
    "IBAN": "SK1234567890",
    "VS": "123456",
    "Note": "Poznámka"
  }
]`}</pre>
        </div>

        <button
          className="import-btn"
          onClick={handleImport}
          disabled={!file || importing}
        >
          {importing ? 'Importujem...' : 'Importovať'}
        </button>

        {message && (
          <div className={`message message-${messageType}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

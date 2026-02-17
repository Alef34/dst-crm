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
interface PaymentInfo {
  VS:string;
  amount: string;
  date:Date;
  message:string;
  senderIban:string;
  senderName:string
}

export const ImportStudents = () => {
  const [file, setFile] = useState<File | null>(null);
  const [filePayments, setFilePayments ] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importingPayments, setImportingPayments  ] = useState(false);
  const [message, setMessage] = useState('');
  const [messagePayments, setMessagePayments] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [messageTypePayments, setMessageTypePayments] = useState<'successPayments' | 'errorPayments'>('successPayments');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      //console.log("Vybrán soubor pro platby:", e.target.files[0].name);
      setFile(e.target.files[0]);
      setMessage('');
    }
    //console.log("Soubor pro platby po změně:", file);
  };

  const handleFilePaymentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      //console.log("Vybrán soubor pro platby:", e.target.files[0].name);
      setFilePayments(e.target.files[0]);
      setMessagePayments('');
    }
    //console.log("Soubor pro platby po změně:", file);
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

    const handleImportPayments = async () => {

      if (!filePayments) {
      setMessage('Vyberte JSON súbor');
      setMessageType('error');
      return;
    }

    setImportingPayments(true);

    try {
      const text = await filePayments.text();
      const payments: PaymentInfo[] = JSON.parse(text);

      if (!Array.isArray(payments)) {
        throw new Error('JSON musí obsahovať pole platieb');
      }

      let successCount = 0;
      let errorCount = 0;

      for (const payment of payments) {
        try {
          

          // Uloženie do Firestore
          await addDoc(collection(db, 'payments'), {
            Date: payment.date,
            Amount: payment.amount,
            senderIban: payment.senderIban || '',
            senderName: payment.senderName || '',
            vs: payment.VS || '',
            message: payment.message || '',
          });

          successCount++;
        } catch (error) {
            console.error('Chyba pri importovaní platby:', payment.VS, error);
          errorCount++;
        }
      }

      setMessagePayments(`Úspešne importovaných: ${successCount}, Chyby: ${errorCount}`);
      setMessageTypePayments('successPayments');
      setFilePayments(null);
      (document.getElementById('file-input-payments') as HTMLInputElement).value = '';
    } catch (error) {
        console.error('Chyba pri parsovaní JSON:', error);
        setMessagePayments('Chyba pri čítaní JSON súboru. Skontrolujte formát.');
        setMessageTypePayments('errorPayments');
    } finally {
        setImportingPayments(false);
    }
  };

  return (
    <div className="import-students-container">
      <div className="import-header">
        <h2>Import</h2>
        <p>Nahrajte JSON súbor </p>
      </div>
       <div style={{display: "flex"}}>
      <div style={{flex: 1,backgroundColor: "#f0f0f0"}}>
        
        Študenti
        <div className="import-card">
          <div className="file-input-wrapper">
            <label htmlFor="file-input" className="file-input-label">
              JSON súbor študentov:
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
      <div style={{flex: 1,backgroundColor: "#e0e0e0"}}>
        Platby

        <div className="import-card">
          <div className="file-input-wrapper">
            <label htmlFor="file-input-payments" className="file-input-label">
              JSON súbor platieb:
            </label>
            <input
              id="file-input-payments"
              type="file"
              accept=".json"
              onChange={handleFilePaymentsChange}
              className="file-input"
            />
            <span className="file-name">{filePayments?.name || 'Žiadny súbor nie je vybraný'}</span>
          </div>

          <div className="format-info">
            <h3>Formát JSON súboru:</h3>
            <pre>{`[
                    {
    "date": "Dátum platby",
    "amount": "suma",
    "senderIban": "číslo účtu",
    "message": "popis platby",
    "senderName": "meno odosielateľa",
    "VS": "variabilný symbol"
  },

                  ]`}</pre>
          </div>

          <button
            className="import-btn"
            onClick={handleImportPayments}
            disabled={!filePayments || importingPayments}
          >
            {importingPayments ? 'Importujem...' : 'Importovať'}
          </button>

          {messagePayments && (
            <div className={`message message-${messageTypePayments}`}>
              {messagePayments}
            </div>
          )}
        </div>


      </div>
      </div>
    </div>
    
  );
};

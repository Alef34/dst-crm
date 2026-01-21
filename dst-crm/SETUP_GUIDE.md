# Sprievodca nastavením autentifikácie

## Kroky na nastavenie Firebase Google Sign-in:

### 1. Firebase projekt
- Prejdite na https://console.firebase.google.com
- Vytvorte nový projekt alebo vyberte existujúci

### 2. Nastavenie autentifikácie
- V Firebase konzole prejdite na "Authentication"
- Kliknite na "Get started"
- V "Sign-in method" pridajte "Google"
- Aktivujte Google provider

### 3. Konfigurácia Web SDK
- V "Project settings" skopírujte Web API kľúč
- Nahraďte hodnoty v `.env.local` súbore

### 4. Firestore databáza
- V Firebase konzole vytvorte "Cloud Firestore"
- Zvolite "Start in test mode" (pre vývoj)
- Vytvorte kolekciu "users"

### 5. Pravidlá bezpečnosti Firestore

Nahraďte pravidlá v Firestore konzoľe nasledujúcimi:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Užívateľ môže čítať a upravovať len svoje údaje
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Admin môže čítať všetko
    match /{document=**} {
      allow read: if request.auth.token.admin == true;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

### 6. Nastavenie Admin roly

Pre nastavenie admin roly:
- Prejdite do Firestore
- Kolekcia "users"
- Otvorte dokument konkrétneho užívateľa
- Zmeňte pole "role" z "user" na "admin"

Príklad dokumentu:
```json
{
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": "https://...",
  "role": "admin",
  "createdAt": "2024-01-21T..."
}
```

### 7. Spustenie aplikácie

```bash
npm run dev
```

## Štruktúra komponentov

- **Login.tsx** - Login stránka s Google Sign-in
- **Dashboard.tsx** - Dashboard s role-based pohľadmi
- **ProtectedRoute.tsx** - Ochrana trás vyžadujúcich autentifikáciu
- **AuthContext.tsx** - Správa stavu autentifikácie a rolí

## Použitie v komponentoch

```typescript
import { useAuth } from './context/AuthContext';

export const MyComponent = () => {
  const { user, role, isAdmin, loading } = useAuth();
  
  if (loading) return <div>Načítavanie...</div>;
  
  if (isAdmin) {
    return <div>Admin panel</div>;
  }
  
  return <div>Užívateľský panel</div>;
};
```

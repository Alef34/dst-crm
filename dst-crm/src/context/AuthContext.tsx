import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export type UserRole = 'admin' | 'student' | 'team' | null;

const normalizeRole = (rawRole: unknown): Exclude<UserRole, null> => {
  const role = String(rawRole ?? '').toLowerCase().trim();
  if (role === 'admin') return 'admin';
  if (role === 'team') return 'team';
  // Default/fallback behavior: all other values (including legacy "user") are students.
  return 'student';
};

const pickHigherPriorityRole = (
  a: Exclude<UserRole, null>,
  b: Exclude<UserRole, null>
): Exclude<UserRole, null> => {
  const score = (role: Exclude<UserRole, null>) => (role === 'admin' ? 3 : role === 'team' ? 2 : 1);
  return score(a) >= score(b) ? a : b;
};

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  isAdmin: boolean;
  isTeam: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Load the user's role from Firestore
        try {
          const [userDoc, usersByEmailSnap] = await Promise.all([
            getDoc(doc(db, 'users', currentUser.uid)),
            currentUser.email
              ? getDocs(query(collection(db, 'users'), where('email', '==', currentUser.email.toLowerCase())))
              : Promise.resolve(null as any),
          ]);

          let resolvedRole: Exclude<UserRole, null> = 'student';

          if (userDoc.exists()) {
            resolvedRole = normalizeRole(userDoc.data().role);
          }

          if (usersByEmailSnap && !usersByEmailSnap.empty) {
            usersByEmailSnap.docs.forEach((d: any) => {
              const candidate = normalizeRole(d.data().role);
              resolvedRole = pickHigherPriorityRole(resolvedRole, candidate);
            });
          }

          setRole(resolvedRole);
        } catch (error) {
          console.error('Error loading user role:', error);
          setRole('student');
        }
      } else {
        setRole(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    role,
    loading,
    isAdmin: role === 'admin',
    isTeam: role === 'team',
    isStudent: role === 'student',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

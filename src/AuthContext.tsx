import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  groups: string[];
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Update user info and check roles
        try {
          // Save/Update basic user info in 'users' collection
          const userRef = doc(db, 'users', firebaseUser.uid);
          await setDoc(userRef, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            lastLogin: new Date().toISOString()
          }, { merge: true });

          const roleRef = doc(db, 'roles', firebaseUser.uid);
          
          // Save/Update basic user info for readability in admin panel
          await setDoc(roleRef, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            lastSeen: new Date().toISOString()
          }, { merge: true });

          const roleDoc = await getDoc(roleRef);
          if (roleDoc.exists()) {
            const data = roleDoc.data();
            setIsAdmin(data?.isAdmin === true);
            setGroups(data?.groups || []);
          } else {
            setIsAdmin(false);
            setGroups([]);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setIsAdmin(false);
          setGroups([]);
        }
      } else {
        // User is not logged in
        setIsAdmin(false);
        setGroups([]);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    isAdmin,
    groups,
    loading,
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

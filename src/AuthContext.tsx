import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  isGlobalAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check for test overrides in URL
    const params = new URLSearchParams(window.location.search);
    const testUser = params.get('test_user');
    const testAdmin = params.get('test_admin');

    if (testUser) {
      setUser({
        uid: testUser,
        email: `${testUser}@example.com`,
        displayName: `Test User ${testUser}`,
      } as User);
      setIsGlobalAdmin(testAdmin === 'true');
      setLoading(false);
      return;
    }

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

          // Role check is now read-only for most users
          const roleRef = doc(db, 'roles', firebaseUser.uid);
          const roleDoc = await getDoc(roleRef);
          
          if (roleDoc.exists()) {
            const data = roleDoc.data();
            setIsGlobalAdmin(data?.isAdmin === true);
            
            // Only update roles metadata if they ARE an admin
            if (data?.isAdmin) {
              await setDoc(roleRef, {
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                lastSeen: new Date().toISOString()
              }, { merge: true });
            }
          } else {
            setIsGlobalAdmin(false);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setIsGlobalAdmin(false);
        }
      } else {
        // User is not logged in
        setIsGlobalAdmin(false);
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
    isGlobalAdmin,
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

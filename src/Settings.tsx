import React from 'react';
import { useAuth } from './AuthContext';

export default function Settings() {
  const { user, isAdmin, loading, signInWithGoogle, logout } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="settings">
        <h2>Settings</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="settings">
      <h2>Settings</h2>
      <div className="setting-item">
        <h3>Authentication</h3>
        {user ? (
          <div>
            <p>Signed in as: <strong>{user.email}</strong></p>
            <p>Role: <strong>{isAdmin ? 'Admin' : 'User'}</strong></p>
            <button onClick={handleSignOut}>Sign Out</button>
          </div>
        ) : (
          <div>
            <p>You are currently browsing as a guest.</p>
            <button onClick={handleSignIn}>Sign In with Google</button>
            <p className="setting-hint">Sign in to access admin features if you have permission.</p>
          </div>
        )}
      </div>
    </div>
  );
}

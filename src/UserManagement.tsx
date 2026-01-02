import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';

interface UserRole {
  id: string; // This is the UID
  isAdmin: boolean;
  groups: string[];
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ uid: '', isAdmin: false, groups: '' });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'roles'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRole[];
      setUsers(data);
    });
    return () => unsubscribe();
  }, []);

  async function handleUpdateUser(uid: string, isAdmin: boolean, groups: string[]) {
    try {
      await updateDoc(doc(db, 'roles', uid), {
        isAdmin,
        groups
      });
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user.');
    }
  }

  async function handleAddUser() {
    if (!newUser.uid) {
      alert('Please enter a UID.');
      return;
    }
    try {
      await setDoc(doc(db, 'roles', newUser.uid), {
        isAdmin: newUser.isAdmin,
        groups: newUser.groups.split(',').map(s => s.trim()).filter(s => s)
      });
      setNewUser({ uid: '', isAdmin: false, groups: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user.');
    }
  }

  async function handleDeleteRole(uid: string) {
    if (!window.confirm('Are you sure you want to remove this user\'s roles?')) return;
    try {
      await deleteDoc(doc(db, 'roles', uid));
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Failed to delete role.');
    }
  }

  return (
    <div className="user-management">
      <h2>User & Group Management</h2>
      <p style={{ fontSize: '0.9em', color: '#666', marginBottom: 20 }}>
        Manage which users have Admin privileges and which groups they belong to.
      </p>

      {!isAdding ? (
        <button 
          onClick={() => setIsAdding(true)}
          style={{ marginBottom: 20, padding: '8px 16px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          + Add User Role
        </button>
      ) : (
        <div style={{ border: '1px solid #ccc', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          <h3>Add New User Role</h3>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12 }}>User UID</label>
            <input 
              value={newUser.uid} 
              onChange={e => setNewUser(prev => ({ ...prev, uid: e.target.value }))} 
              placeholder="Paste Firebase UID here"
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              <input 
                type="checkbox" 
                checked={newUser.isAdmin} 
                onChange={e => setNewUser(prev => ({ ...prev, isAdmin: e.target.checked }))} 
              /> Admin Privileges
            </label>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12 }}>Groups (comma separated)</label>
            <input 
              value={newUser.groups} 
              onChange={e => setNewUser(prev => ({ ...prev, groups: e.target.value }))} 
              placeholder="e.g. staff, moderators"
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <button onClick={handleAddUser}>Save User Role</button>
          <button onClick={() => setIsAdding(false)} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
            <th style={{ padding: 12 }}>UID</th>
            <th style={{ padding: 12 }}>Admin</th>
            <th style={{ padding: 12 }}>Groups</th>
            <th style={{ padding: 12 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 12, fontSize: 12, fontFamily: 'monospace' }}>{u.id}</td>
              <td style={{ padding: 12 }}>
                <input 
                  type="checkbox" 
                  checked={u.isAdmin || false} 
                  onChange={e => handleUpdateUser(u.id, e.target.checked, u.groups || [])} 
                />
              </td>
              <td style={{ padding: 12 }}>
                <input 
                  value={(u.groups || []).join(', ')} 
                  onChange={e => handleUpdateUser(u.id, u.isAdmin || false, e.target.value.split(',').map(s => s.trim()).filter(s => s))} 
                  style={{ width: '100%' }}
                />
              </td>
              <td style={{ padding: 12 }}>
                <button 
                  onClick={() => handleDeleteRole(u.id)}
                  style={{ backgroundColor: '#ff4d4f', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

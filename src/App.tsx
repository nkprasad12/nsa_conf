import React, { useState, useEffect } from 'react';
import './App.css';
import CalendarView from './CalendarView';
import Settings from './Settings';
import UserManagement from './UserManagement';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
import { canEdit, PermissibleItem } from './permissions';

const TABS = [
  { label: 'Announcements', key: 'announcements' },
  { label: 'Calendar', key: 'calendar' },
  { label: 'Brett Calendar', key: 'brett-calendar' },
  { label: 'Settings', key: 'settings' },
] as const;

interface Announcement extends PermissibleItem {
  id: string;
  title: string;
  body: string;
  createdAt?: any;
}

function Announcements({ announcements, user, isAdmin, groups, userLookup }: {
  announcements: Announcement[];
  user: any;
  isAdmin: boolean;
  groups: string[];
  userLookup: Record<string, { email?: string; displayName?: string }>;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<{ title: string; body: string; allowedEditors: string[]; allowedGroups: string[] }>({ 
    title: '', 
    body: '',
    allowedEditors: [],
    allowedGroups: []
  });
  const [isAdding, setIsAdding] = React.useState(false);
  const [newAnnouncement, setNewAnnouncement] = React.useState({ 
    title: '', 
    body: '',
    allowedEditors: [] as string[],
    allowedGroups: [] as string[]
  });

  function startEdit(a: Announcement) {
    setEditingId(a.id);
    setDraft({ 
      title: a.title, 
      body: a.body,
      allowedEditors: a.allowedEditors || [],
      allowedGroups: a.allowedGroups || []
    });
  }

  async function saveEdit(id: string) {
    try {
      const announcementRef = doc(db, 'announcements', id);
      await updateDoc(announcementRef, {
        title: draft.title,
        body: draft.body,
        allowedEditors: draft.allowedEditors,
        allowedGroups: draft.allowedGroups
      });
      setEditingId(null);
    } catch (error) {
      console.error('Error updating announcement:', error);
      alert('Failed to save changes. You might not have permission.');
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Failed to delete. You might not have permission.');
    }
  }

  async function handleAddAnnouncement() {
    if (!user) {
      alert('You must be signed in to add announcements.');
      return;
    }
    if (!newAnnouncement.title || !newAnnouncement.body) {
      alert('Please fill in both title and body.');
      return;
    }

    try {
      await addDoc(collection(db, 'announcements'), {
        title: newAnnouncement.title,
        body: newAnnouncement.body,
        ownerId: user.uid,
        allowedEditors: newAnnouncement.allowedEditors,
        allowedGroups: newAnnouncement.allowedGroups,
        createdAt: serverTimestamp()
      });
      setNewAnnouncement({ title: '', body: '', allowedEditors: [], allowedGroups: [] });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding announcement:', error);
      alert('Failed to add announcement. You might not have permission.');
    }
  }

  function cancelEdit() {
    setEditingId(null);
  }

  const authInfo = user ? { uid: user.uid, isAdmin, groups } : null;

  return (
    <div className="announcements">
      {isAdmin && !isAdding && (
        <button 
          onClick={() => setIsAdding(true)} 
          style={{ marginBottom: 20, padding: '8px 16px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          + New Announcement
        </button>
      )}

      {isAdding && (
        <div className="announcement" style={{ border: '2px dashed #646cff', padding: 16, marginBottom: 20 }}>
          <h3>New Announcement</h3>
          <input 
            placeholder="Title" 
            value={newAnnouncement.title} 
            onChange={e => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))} 
            style={{ width: '100%', marginBottom: 8, padding: 8 }} 
          />
          <textarea 
            placeholder="Body" 
            value={newAnnouncement.body} 
            onChange={e => setNewAnnouncement(prev => ({ ...prev, body: e.target.value }))} 
            style={{ width: '100%', minHeight: 100, marginBottom: 8, padding: 8 }} 
          />
          
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: '0.8em', marginBottom: 4 }}>Allowed Editors (UIDs, comma separated)</label>
            <input 
              placeholder="e.g. uid1, uid2"
              value={(newAnnouncement.allowedEditors || []).join(', ')} 
              onChange={e => setNewAnnouncement(prev => ({ ...prev, allowedEditors: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))} 
              style={{ width: '100%', padding: 8 }} 
            />
            <div style={{ fontSize: '0.7em', color: '#666', marginTop: 4 }}>
              Resolved: {(newAnnouncement.allowedEditors || []).map(uid => userLookup[uid]?.email || uid).join(', ')}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.8em', marginBottom: 4 }}>Allowed Groups (comma separated)</label>
            <input 
              placeholder="e.g. staff, moderators"
              value={(newAnnouncement.allowedGroups || []).join(', ')} 
              onChange={e => setNewAnnouncement(prev => ({ ...prev, allowedGroups: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))} 
              style={{ width: '100%', padding: 8 }} 
            />
          </div>

          <div>
            <button onClick={handleAddAnnouncement}>Post Announcement</button>
            <button onClick={() => setIsAdding(false)} style={{ marginLeft: 8 }}>Cancel</button>
          </div>
        </div>
      )}

      {announcements.map(a => (
        <div key={a.id} className="announcement">
          {editingId === a.id ? (
            <div>
              <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} style={{ width: '100%', marginBottom: 8 }} />
              <textarea value={draft.body} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))} style={{ width: '100%', minHeight: 100, marginBottom: 8 }} />
              
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: '0.8em', marginBottom: 4 }}>Allowed Editors (UIDs or Emails, comma separated)</label>
                <input 
                  value={(draft.allowedEditors || []).join(', ')} 
                  onChange={e => setDraft(d => ({ ...d, allowedEditors: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))} 
                  style={{ width: '100%', padding: 8 }} 
                />
                <div style={{ fontSize: '0.7em', color: '#666', marginTop: 4 }}>
                  Resolved: {(draft.allowedEditors || []).map(uid => userLookup[uid]?.email || uid).join(', ')}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8em', marginBottom: 4 }}>Allowed Groups (comma separated)</label>
                <input 
                  value={(draft.allowedGroups || []).join(', ')} 
                  onChange={e => setDraft(d => ({ ...d, allowedGroups: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))} 
                  style={{ width: '100%', padding: 8 }} 
                />
              </div>

              <div>
                <button onClick={() => saveEdit(a.id)}>Save</button>
                <button onClick={cancelEdit} style={{ marginLeft: 8 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h3 style={{ display: 'inline-block', marginRight: 8 }}>{a.title}</h3>
              {canEdit(a, authInfo) && (
                <div style={{ display: 'inline-block' }}>
                  <button onClick={() => startEdit(a)} style={{ marginLeft: 8 }}>Edit</button>
                  <button onClick={() => deleteAnnouncement(a.id)} style={{ marginLeft: 8, backgroundColor: '#ff4d4f', color: 'white' }}>Delete</button>
                </div>
              )}
              <p>{a.body}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default function App(): React.ReactElement {
  const { user, isAdmin, groups } = useAuth();
  const [userLookup, setUserLookup] = useState<Record<string, { email?: string; displayName?: string }>>({});
  
  const availableTabs = React.useMemo(() => {
    const tabs = [...TABS];
    if (isAdmin) {
      // @ts-ignore - adding a dynamic tab
      tabs.splice(2, 0, { label: 'Users', key: 'users' });
    }
    return tabs;
  }, [isAdmin]);

  const [activeTab, setActiveTab] = useState<string>(TABS[0].key);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setAnnouncements(data);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Fetch roles to resolve UIDs to names/emails
    const unsubscribe = onSnapshot(collection(db, 'roles'), (snapshot) => {
      const lookup: Record<string, { email?: string; displayName?: string }> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        lookup[doc.id] = { email: data.email, displayName: data.displayName };
      });
      setUserLookup(lookup);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="app-container">
      <h1 className="app-title">NSA Conference Portal</h1>
      <div className="tabs">
        {availableTabs.map(tab => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {activeTab === 'announcements' && (
          <Announcements 
            announcements={announcements} 
            user={user} 
            isAdmin={isAdmin} 
            groups={groups} 
            userLookup={userLookup}
          />
        )}
        {activeTab === 'calendar' && <CalendarView userLookup={userLookup} />}
        {activeTab === 'brett-calendar' && <CalendarView userLookup={userLookup} />}
        {activeTab === 'users' && isAdmin && <UserManagement />}
        {activeTab === 'settings' && (
          <Settings />
        )}
      </div>
    </div>
  );
}

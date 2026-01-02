import React, { useState, useEffect } from 'react';
import './App.css';
import CalendarView from './CalendarView';
import Settings from './Settings';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { canEdit, PermissibleItem } from './permissions';

const TABS = [
  { label: 'Announcements', key: 'announcements' },
  { label: 'Calendar', key: 'calendar' },
  { label: 'Settings', key: 'settings' },
] as const;

interface Announcement extends PermissibleItem {
  id: string;
  title: string;
  body: string;
}

function Announcements({ announcements, user, isAdmin, groups }: {
  announcements: Announcement[];
  user: any;
  isAdmin: boolean;
  groups: string[];
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<{ title: string; body: string }>({ title: '', body: '' });

  function startEdit(a: Announcement) {
    setEditingId(a.id);
    setDraft({ title: a.title, body: a.body });
  }

  async function saveEdit(id: string) {
    try {
      const announcementRef = doc(db, 'announcements', id);
      await updateDoc(announcementRef, {
        title: draft.title,
        body: draft.body
      });
      setEditingId(null);
    } catch (error) {
      console.error('Error updating announcement:', error);
      alert('Failed to save changes. You might not have permission.');
    }
  }

  function cancelEdit() {
    setEditingId(null);
  }

  const authInfo = user ? { uid: user.uid, isAdmin, groups } : null;

  return (
    <div className="announcements">
      {announcements.map(a => (
        <div key={a.id} className="announcement">
          {editingId === a.id ? (
            <div>
              <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} style={{ width: '100%', marginBottom: 8 }} />
              <textarea value={draft.body} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))} style={{ width: '100%', minHeight: 100, marginBottom: 8 }} />
              <div>
                <button onClick={() => saveEdit(a.id)}>Save</button>
                <button onClick={cancelEdit} style={{ marginLeft: 8 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h3 style={{ display: 'inline-block', marginRight: 8 }}>{a.title}</h3>
              {canEdit(a, authInfo) && <button onClick={() => startEdit(a)} style={{ marginLeft: 8 }}>Edit</button>}
              <p>{a.body}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['key']>(TABS[0].key);
  const { user, isAdmin, groups } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setAnnouncements(data);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="app-container">
      <h1 className="app-title">NSA Conference Portal</h1>
      <div className="tabs">
        {TABS.map(tab => (
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
          <Announcements announcements={announcements} user={user} isAdmin={isAdmin} groups={groups} />
        )}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'settings' && (
          <Settings />
        )}
      </div>
    </div>
  );
}

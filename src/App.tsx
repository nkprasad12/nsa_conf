import React, { useState, useEffect } from 'react';
import './App.css';
import CalendarV2View from './CalendarV2';
import Settings from './Settings';
import UserManagement from './UserManagement';
import { useAuth } from './AuthContext';
import { useConference } from './ConferenceContext';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, query, orderBy, deleteDoc, setDoc } from 'firebase/firestore';
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
  createdAt?: any;
}

function Announcements({ announcements, user, isAdmin, isGlobalAdmin, groups, userLookup, conferenceId }: {
  announcements: Announcement[];
  user: any;
  isAdmin: boolean;
  isGlobalAdmin: boolean;
  groups: string[];
  userLookup: Record<string, { email?: string; displayName?: string }>;
  conferenceId: string;
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
      const announcementRef = doc(db, 'conferences', conferenceId, 'announcements', id);
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
      await deleteDoc(doc(db, 'conferences', conferenceId, 'announcements', id));
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
      await addDoc(collection(db, 'conferences', conferenceId, 'announcements'), {
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

  const authInfo = user ? { uid: user.uid, isAdmin, isGlobalAdmin, groups } : null;

  return (
    <div className="announcements">
      {(isAdmin || isGlobalAdmin) && !isAdding && (
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
                <button onClick={() => setEditingId(null)} style={{ marginLeft: 8 }}>Cancel</button>
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

function SystemAdmin() {
  const [conferences, setConferences] = useState<any[]>([]);
  const [newConf, setNewConf] = useState({ id: '', name: '', startDate: '', endDate: '' });

  useEffect(() => {
    return onSnapshot(collection(db, 'conferences'), (snapshot) => {
      setConferences(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  async function handleCreate() {
    if (!newConf.id || !newConf.name) return alert('Fill ID and Name');
    try {
      await setDoc(doc(db, 'conferences', newConf.id), {
        name: newConf.name,
        startDate: newConf.startDate,
        endDate: newConf.endDate,
      });
      setNewConf({ id: '', name: '', startDate: '', endDate: '' });
    } catch (e) {
      console.error(e);
      alert('Failed to create conference. Only Global Admins can do this.');
    }
  }

  return (
    <div className="admin-content">
      <h2>System Administration</h2>
      <div style={{ padding: 16, border: '1px solid #ccc', marginBottom: 20 }}>
        <h3>Create New Conference</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input placeholder="Slug (e.g. nsa-2026)" value={newConf.id} onChange={e => setNewConf({ ...newConf, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
          <input placeholder="Name" value={newConf.name} onChange={e => setNewConf({ ...newConf, name: e.target.value })} />
          <div>
            <label>Start Date: </label>
            <input type="date" value={newConf.startDate} onChange={e => setNewConf({ ...newConf, startDate: e.target.value })} />
          </div>
          <div>
            <label>End Date: </label>
            <input type="date" value={newConf.endDate} onChange={e => setNewConf({ ...newConf, endDate: e.target.value })} />
          </div>
          <button onClick={handleCreate} style={{ padding: '8px', backgroundColor: '#646cff', color: 'white', border: 'none' }}>Create Conference</button>
        </div>
      </div>
      <div>
        <h3>Existing Conferences</h3>
        <div style={{ display: 'grid', gap: '10px' }}>
          {conferences.map(c => (
            <div key={c.id} style={{ padding: 10, border: '1px solid #eee' }}>
              <strong>{c.name}</strong> (<code>{c.id}</code>)<br/>
              <span style={{ fontSize: '0.8em' }}>{c.startDate} to {c.endDate}</span><br/>
              <a href={`/c/${c.id}`} style={{ color: '#646cff' }}>View Site</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Navbar({ 
  title, 
  availableTabs, 
  activeTab, 
  onTabClick, 
  isMenuOpen, 
  setIsMenuOpen 
}: { 
  title: string; 
  availableTabs: Array<{ label: string, key: string }>; 
  activeTab: string; 
  onTabClick: (key: string) => void; 
  isMenuOpen: boolean; 
  setIsMenuOpen: (open: boolean) => void; 
}) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">{title}</div>
        
        <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
        </button>

        <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          {availableTabs.map(tab => (
            <button
              key={tab.key}
              className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => {
                onTabClick(tab.key);
                setIsMenuOpen(false);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default function App(): React.ReactElement {
  const { user, isGlobalAdmin } = useAuth();
  const { conferenceId, tabId, conference, isAdmin, groups, loading: confLoading, error: confError } = useConference();
  const [userLookup, setUserLookup] = useState<Record<string, { email?: string; displayName?: string }>>({});
  const [activeTab, setActiveTab] = useState<string>(tabId || 'announcements');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const availableTabs = React.useMemo(() => {
    if (!conferenceId) {
      return isGlobalAdmin ? [
        { label: 'System Admin', key: 'sysadmin' }, 
        { label: 'Settings', key: 'settings' }
      ] : [
        { label: 'Settings', key: 'settings' }
      ];
    }

    // If we have a conference but user is not logged in, only show Settings (or let them see Announcements if public? Prompt says prompt for login)
    // The requirement says: "If the user visits a deep link but isn't logged in, then prompt them for login."
    if (!user) {
      return [{ label: 'Settings', key: 'settings' }];
    }

    const tabs = [...TABS];
    if (isAdmin || isGlobalAdmin) {
      // @ts-ignore
      tabs.splice(2, 0, { label: 'Users', key: 'users' });
    }
    if (isGlobalAdmin) {
      // @ts-ignore
      tabs.splice(tabs.length - 1, 0, { label: 'System Admin', key: 'sysadmin' });
    }
    return tabs;
  }, [conferenceId, isAdmin, isGlobalAdmin, user]);

  // Handle URL sync
  useEffect(() => {
    if (conferenceId) {
      const currentPath = window.location.pathname;
      const expectedPath = `/c/${conferenceId}/${activeTab}`;
      if (currentPath !== expectedPath) {
        window.history.pushState({ tab: activeTab }, '', expectedPath);
      }
    }
  }, [activeTab, conferenceId]);

  // Handle browser navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const path = window.location.pathname;
      const match = path.match(/\/c\/[^/]+\/([^/]+)/);
      if (match && match[1]) {
        setActiveTab(match[1]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(t => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab]);

  useEffect(() => {
    if (!conferenceId) return;
    const q = query(collection(db, 'conferences', conferenceId, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setAnnouncements(data);
    });

    return () => unsubscribe();
  }, [conferenceId]);

  useEffect(() => {
    // Resolve UIDs globally
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

  if (confLoading) return <div className="app-container">Loading conference...</div>;
  if (confError) return <div className="app-container"><h1>Error</h1><p>{confError}</p></div>;

  const hasNoAccess = conferenceId && user && !isAdmin && groups.length === 0 && !isGlobalAdmin;
  const showLoginPrompt = conferenceId && !user;

  return (
    <div className="app-container">
      <Navbar 
        title={conference ? conference.name : 'NSA Conference Portal'}
        availableTabs={availableTabs}
        activeTab={activeTab}
        onTabClick={setActiveTab}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />
      
      <div className="main-content">
        {conferenceId && conference && !showLoginPrompt && !hasNoAccess && (
          <div style={{ textAlign: 'center', marginBottom: '1rem', opacity: 0.7 }}>
            <p>{conference.startDate} - {conference.endDate}</p>
          </div>
        )}
        
        {!conferenceId && !isGlobalAdmin && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <h2>Welcome</h2>
            <p>Please use an official conference link to access materials.</p>
            <p>If you are an organizer, please <button onClick={() => setActiveTab('settings')} style={{ background: 'none', border: 'none', color: '#646cff', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}>sign in</button>.</p>
          </div>
        )}

        {showLoginPrompt && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <h2>Sign In Required</h2>
            <p>You must be signed in to view this conference content.</p>
            <button 
              onClick={() => setActiveTab('settings')} 
              style={{ marginTop: 16, padding: '10px 20px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
            >
              Go to Sign In
            </button>
          </div>
        )}

        {hasNoAccess && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <h2 style={{ color: '#ff4d4f' }}>Access Denied</h2>
            <p>You do not have permission to access the <strong>{conference?.name}</strong> portal.</p>
            <p style={{ marginTop: 8, fontSize: '0.9em' }}>Signed in as: {user?.email}</p>
            <button 
              onClick={() => setActiveTab('settings')} 
              style={{ marginTop: 16, padding: '8px 16px', backgroundColor: '#f3f3f3', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer' }}
            >
              Check Settings / Logout
            </button>
          </div>
        )}

        {!showLoginPrompt && !hasNoAccess && (
          <div className="tab-content">
            {activeTab === 'announcements' && conferenceId && (
              <Announcements 
                announcements={announcements} 
                user={user} 
                isAdmin={isAdmin}
                isGlobalAdmin={isGlobalAdmin}
                groups={groups} 
                userLookup={userLookup}
                conferenceId={conferenceId}
              />
            )}
            {activeTab === 'calendar' && conferenceId && <CalendarV2View />}
            {activeTab === 'users' && conferenceId && (isAdmin || isGlobalAdmin) && <UserManagement />}
            {activeTab === 'sysadmin' && isGlobalAdmin && <SystemAdmin />}
            {activeTab === 'settings' && (
              <Settings />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

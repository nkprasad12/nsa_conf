import React, { useState, useEffect } from 'react';
import './App.css';
import CalendarView from './CalendarView';
import Settings from './Settings';
import { useAuth } from './AuthContext';

const TABS = [
  { label: 'Announcements', key: 'announcements' },
  { label: 'Calendar', key: 'calendar' },
  { label: 'Settings', key: 'settings' },
] as const;

const fakeAnnouncements = [
  { id: 1, title: 'Welcome to NSA Conf!', body: 'Conference starts next week. Get ready!' },
  { id: 2, title: 'Schedule Released', body: 'Check out the full schedule on our website.' },
  { id: 3, title: 'Keynote Speaker', body: 'Dr. Jane Doe will deliver the keynote address.' },
];

function Announcements({ announcements, setAnnouncements, isAdmin }: {
  announcements: { id: number; title: string; body: string }[];
  setAnnouncements: React.Dispatch<React.SetStateAction<{ id: number; title: string; body: string }[]>>;
  isAdmin: boolean;
}) {
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<{ title: string; body: string }>({ title: '', body: '' });

  function startEdit(a: { id: number; title: string; body: string }) {
    setEditingId(a.id);
    setDraft({ title: a.title, body: a.body });
  }

  function saveEdit(id: number) {
    setAnnouncements(prev => prev.map(p => (p.id === id ? { ...p, title: draft.title, body: draft.body } : p)));
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  return (
    <div className="announcements">
      {announcements.map(a => (
        <div key={a.id} className="announcement">
          {editingId === a.id ? (
            <div>
              <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
              <textarea value={draft.body} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))} />
              <div>
                <button onClick={() => saveEdit(a.id)}>Save</button>
                <button onClick={cancelEdit}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h3 style={{ display: 'inline-block', marginRight: 8 }}>{a.title}</h3>
              {isAdmin && <button onClick={() => startEdit(a)} style={{ marginLeft: 8 }}>Edit</button>}
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
  const { isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState(() => fakeAnnouncements);

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
          <Announcements announcements={announcements} setAnnouncements={setAnnouncements} isAdmin={isAdmin} />
        )}
        {activeTab === 'calendar' && <CalendarView isAdmin={isAdmin} />}
        {activeTab === 'settings' && (
          <Settings />
        )}
      </div>
    </div>
  );
}

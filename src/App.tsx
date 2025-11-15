import React, { useState, useEffect } from 'react';
import './App.css';
import CalendarView from './CalendarView';
import Settings from './Settings';

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

function Announcements() {
  return (
    <div className="announcements">
      {fakeAnnouncements.map(a => (
        <div key={a.id} className="announcement">
          <h3>{a.title}</h3>
          <p>{a.body}</p>
        </div>
      ))}
    </div>
  );
}

export default function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['key']>(TABS[0].key);
  const [adminMode, setAdminMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('adminMode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('adminMode', adminMode ? 'true' : 'false');
    } catch {
      // ignore storage errors
    }
  }, [adminMode]);

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
        {activeTab === 'announcements' && <Announcements />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'settings' && (
          <Settings adminMode={adminMode} setAdminMode={setAdminMode} />
        )}
      </div>
    </div>
  );
}

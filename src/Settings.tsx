import React from 'react';

interface SettingsProps {
  adminMode: boolean;
  setAdminMode: (value: boolean) => void;
}

export default function Settings({ adminMode, setAdminMode }: SettingsProps) {
  return (
    <div className="settings">
      <h2>Settings</h2>
      <div className="setting-item">
        <label htmlFor="admin-toggle">
          <input
            id="admin-toggle"
            type="checkbox"
            checked={adminMode}
            onChange={e => setAdminMode(e.target.checked)}
          />
          Enable Admin Mode
        </label>
        <p className="setting-hint">Admin mode enables additional management features.</p>
      </div>
    </div>
  );
}

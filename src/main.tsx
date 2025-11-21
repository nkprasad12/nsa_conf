import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './AuthContext';

const rootEl = document.getElementById('root') as HTMLElement | null;
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>
  );
}

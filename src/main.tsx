import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testConnection } from './firebase.ts';

// Catch and suppress third-party browser extension injection errors (e.g. MetaMask in iframe sandbox)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : reason?.message || '';
    if (
      msg.includes('Failed to connect to MetaMask') ||
      msg.includes('MetaMask') ||
      msg.includes('User rejected') ||
      reason?.stack?.includes('chrome-extension://')
    ) {
      event.preventDefault();
      console.warn('[Handled Web3 Extension Notice]:', msg);
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    const filename = event.filename || '';
    if (
      msg.includes('Failed to connect to MetaMask') ||
      filename.includes('chrome-extension://') ||
      event.error?.stack?.includes('chrome-extension://')
    ) {
      event.preventDefault();
      console.warn('[Handled Web3 Extension Error]:', msg);
    }
  });
}

// Test connection to Firestore on initial boot
testConnection();

createRoot(document.getElementById('root')!).render(<App />);

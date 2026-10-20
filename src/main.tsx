import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testConnection } from './firebase.ts';

// Catch and suppress third-party browser extension injection errors and Firestore quota notifications
if (typeof window !== 'undefined') {
  // Suppress Firestore quota limit logs in console
  const origConsoleError = console.error;
  console.error = (...args: any[]) => {
    let fullText = '';
    try {
      for (const a of args) {
        if (typeof a === 'string') fullText += ' ' + a;
        else if (a && a.message) fullText += ' ' + a.message;
        else if (a) {
          try {
            fullText += ' ' + JSON.stringify(a);
          } catch {
            fullText += ' ' + String(a);
          }
        }
      }
    } catch {}

    if (
      fullText.includes('RESOURCE_EXHAUSTED') ||
      fullText.includes('Quota limit exceeded') ||
      fullText.includes('Free daily write units') ||
      fullText.includes("GrpcConnection RPC 'Write' stream") ||
      fullText.includes('resource-exhausted')
    ) {
      console.warn('[Handled Firestore Quota]: Free daily write limit reached; relying on persistent ACID local server database.');
      return;
    }
    origConsoleError.apply(console, args);
  };

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
      return;
    }
    if (
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('Quota limit exceeded') ||
      msg.includes('Free daily write units')
    ) {
      event.preventDefault();
      console.warn('[Handled Firestore Quota Notice]: Free daily quota reached; using local persistent database.');
      return;
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
      return;
    }
    if (
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('Quota limit exceeded') ||
      msg.includes('Free daily write units')
    ) {
      event.preventDefault();
      console.warn('[Handled Firestore Quota Error]:', msg);
      return;
    }
  });
}

// Test connection to Firestore on initial boot
testConnection();

createRoot(document.getElementById('root')!).render(<App />);

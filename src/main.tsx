import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testConnection } from './firebase.ts';

// Catch and gracefully handle third-party browser extension injection errors, MetaMask inpage timeouts, and Firestore quota notices
if (typeof window !== 'undefined') {
  const origConsoleError = console.error;
  console.error = (...args: any[]) => {
    let fullText = '';
    try {
      for (const a of args) {
        if (typeof a === 'string') fullText += ' ' + a;
        else if (a && a.message) fullText += ' ' + a.message;
        else if (a && a.stack) fullText += ' ' + a.stack;
        else if (a) {
          try {
            fullText += ' ' + JSON.stringify(a);
          } catch {
            fullText += ' ' + String(a);
          }
        }
      }
    } catch {}

    // Suppress third-party browser extension injected communication errors (e.g., MetaMask inpage.js)
    if (
      fullText.includes('Failed to connect to MetaMask') ||
      fullText.includes('MetaMask') ||
      fullText.includes('chrome-extension://') ||
      fullText.includes('inpage.js') ||
      fullText.includes('User rejected') ||
      fullText.includes('WALLET_TIMEOUT')
    ) {
      console.warn('[Handled Web3 Extension Notice]:', fullText.slice(0, 150));
      return;
    }

    // Suppress Firestore quota limit notices in console
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

  // Capture phase unhandled rejection listener
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason;
      const msg = String(typeof reason === 'string' ? reason : (reason?.message || reason?.stack || reason || ''));
      if (
        msg.includes('Failed to connect to MetaMask') ||
        msg.includes('MetaMask') ||
        msg.includes('User rejected') ||
        msg.includes('WALLET_TIMEOUT') ||
        msg.includes('chrome-extension://') ||
        msg.includes('inpage.js') ||
        reason?.stack?.includes('chrome-extension://')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn('[Handled Web3 Extension Notice]:', msg.slice(0, 150));
        return;
      }
      if (
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('Quota limit exceeded') ||
        msg.includes('Free daily write units')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn('[Handled Firestore Quota Notice]: Free daily quota reached; using local persistent database.');
        return;
      }
    },
    { capture: true }
  );

  // Capture phase error event listener
  window.addEventListener(
    'error',
    (event) => {
      const msg = String(event.message || event.error?.message || '');
      const filename = String(event.filename || '');
      const stack = String(event.error?.stack || '');
      if (
        msg.includes('Failed to connect to MetaMask') ||
        msg.includes('MetaMask') ||
        filename.includes('chrome-extension://') ||
        filename.includes('inpage.js') ||
        stack.includes('chrome-extension://') ||
        stack.includes('inpage.js')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn('[Handled Web3 Extension Error]:', msg.slice(0, 150));
        return;
      }
      if (
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('Quota limit exceeded') ||
        msg.includes('Free daily write units')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn('[Handled Firestore Quota Error]:', msg.slice(0, 150));
        return;
      }
    },
    { capture: true }
  );

  // Global window.onerror fallback
  const prevOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msg = String(message || error?.message || '');
    const src = String(source || '');
    if (
      msg.includes('Failed to connect to MetaMask') ||
      msg.includes('MetaMask') ||
      src.includes('chrome-extension://') ||
      src.includes('inpage.js')
    ) {
      return true; // Suppress from bubbling as unhandled fatal error
    }
    if (typeof prevOnError === 'function') {
      return prevOnError(message, source, lineno, colno, error);
    }
    return false;
  };
}

// Test connection to Firestore on initial boot
testConnection().catch(() => {});

createRoot(document.getElementById('root')!).render(<App />);

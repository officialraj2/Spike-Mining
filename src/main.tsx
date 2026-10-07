import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testConnection } from './firebase.ts';

// Test connection to Firestore on initial boot
testConnection();

createRoot(document.getElementById('root')!).render(<App />);

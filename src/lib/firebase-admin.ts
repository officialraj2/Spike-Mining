import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let projectId: string | undefined;
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    projectId = raw.projectId;
  }
} catch {}

if (!getApps().length) {
  initializeApp({
    projectId: projectId || 'glassy-fountain-lsmzh',
  });
}

export const adminAuth = getAuth();

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  doc,
  Firestore,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

function readEnvOrFallback(envVal: string | undefined, fallback: string): string {
  const trimmed = envVal?.trim();
  if (!trimmed || trimmed.startsWith('your_')) {
    return fallback;
  }
  return trimmed;
}

/**
 * Firebase configuration supports standard Vite environment variables
 * (for GitHub + Vercel deployments) and falls back seamlessly to the
 * provisioned firebase-applet-config.json.
 */
const firebaseConfig = {
  apiKey: readEnvOrFallback(import.meta.env.VITE_FIREBASE_API_KEY, appletConfig.apiKey),
  authDomain: readEnvOrFallback(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, appletConfig.authDomain),
  projectId: readEnvOrFallback(import.meta.env.VITE_FIREBASE_PROJECT_ID, appletConfig.projectId),
  storageBucket: readEnvOrFallback(
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    appletConfig.storageBucket
  ),
  messagingSenderId: readEnvOrFallback(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appletConfig.messagingSenderId
  ),
  appId: readEnvOrFallback(import.meta.env.VITE_FIREBASE_APP_ID, appletConfig.appId),
};

const databaseId = readEnvOrFallback(
  import.meta.env.VITE_FIREBASE_DATABASE_ID,
  appletConfig.firestoreDatabaseId
);

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createFirestoreInstance(): Firestore {
  const targetDatabaseId = databaseId && databaseId !== '(default)' ? databaseId : undefined;
  try {
    return initializeFirestore(
      app,
      { experimentalForceLongPolling: true },
      targetDatabaseId
    );
  } catch {
    return targetDatabaseId ? getFirestore(app, targetDatabaseId) : getFirestore(app);
  }
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Verify Firestore connectivity on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration: Firestore client is offline.');
    }
  }
}

void testConnection();

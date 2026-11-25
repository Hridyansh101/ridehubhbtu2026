import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import {
  doc,
  Firestore,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

function cleanEnv(envVal: string | undefined): string {
  return (envVal ?? '').trim().replace(/^["']|["']$/g, '').trim();
}

const hasProvisionedAppletConfig =
  Boolean(appletConfig.projectId) &&
  appletConfig.projectId !== 'remixed-project-id' &&
  typeof appletConfig.apiKey === 'string' &&
  appletConfig.apiKey.startsWith('AIza');

const envApiKey = cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY);
const envAuthDomain = cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
const envProjectId = cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID);
const envAppId = cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID);

const hasValidEnvConfig =
  envApiKey.startsWith('AIza') &&
  envAuthDomain.includes('.') &&
  envProjectId.length > 0 &&
  envAppId.includes(':');

/**
 * Always prefer the provisioned firebase-applet-config.json when present so
 * placeholder deployment env vars can never break Firebase Auth or Firestore.
 * Fall back to validated VITE_FIREBASE_* variables only for standalone setups.
 */
const firebaseConfig = hasProvisionedAppletConfig
  ? {
      apiKey: appletConfig.apiKey,
      authDomain: appletConfig.authDomain,
      projectId: appletConfig.projectId,
      storageBucket: appletConfig.storageBucket,
      messagingSenderId: appletConfig.messagingSenderId,
      appId: appletConfig.appId,
    }
  : hasValidEnvConfig
    ? {
        apiKey: envApiKey,
        authDomain: envAuthDomain,
        projectId: envProjectId,
        storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
        messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
        appId: envAppId,
      }
    : {
        apiKey: appletConfig.apiKey,
        authDomain: appletConfig.authDomain,
        projectId: appletConfig.projectId,
        storageBucket: appletConfig.storageBucket,
        messagingSenderId: appletConfig.messagingSenderId,
        appId: appletConfig.appId,
      };

const databaseId = hasProvisionedAppletConfig
  ? appletConfig.firestoreDatabaseId
  : cleanEnv(import.meta.env.VITE_FIREBASE_DATABASE_ID) || appletConfig.firestoreDatabaseId;

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

function createAuthInstance(): Auth {
  try {
    return initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
      ],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
}

export const db = createFirestoreInstance();
export const auth = createAuthInstance();
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

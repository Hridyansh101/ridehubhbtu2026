import { auth } from './config';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function getFriendlyErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!(error instanceof Error)) return fallback;

  const rawCode = (error as Error & { code?: unknown }).code;
  const errorCode = typeof rawCode === 'string' ? rawCode : '';

  let rawMessage = error.message;
  try {
    const parsed = JSON.parse(error.message) as Partial<FirestoreErrorInfo>;
    if (parsed && typeof parsed.error === 'string') {
      rawMessage = parsed.error;
    }
  } catch {
    // Plain error message
  }

  const combined = `${errorCode} ${rawMessage}`.toLowerCase();

  if (combined.includes('auth/unauthorized-domain')) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
    return `Google sign-in is not yet authorized for "${host}". Add "${host}" in Firebase Console → Authentication → Settings → Authorized domains.`;
  }
  if (combined.includes('auth/popup-blocked')) {
    return 'Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.';
  }
  if (combined.includes('auth/popup-closed-by-user')) {
    return 'Sign-in was cancelled before completing.';
  }
  if (combined.includes('auth/cancelled-popup-request')) {
    return 'A Google sign-in window is already open. Please finish signing in there or try again.';
  }
  if (combined.includes('auth/operation-not-allowed')) {
    return 'Google sign-in is disabled for this Firebase project. Enable Google under Firebase Console → Authentication → Sign-in method.';
  }
  if (combined.includes('auth/invalid-api-key') || combined.includes('auth/app-not-authorized')) {
    return 'Firebase configuration error for this deployment. Check your VITE_FIREBASE_* environment variables.';
  }
  if (combined.includes('auth/network-request-failed')) {
    return 'Network error during sign-in. Check your internet connection or disable strict popup blockers and try again.';
  }
  if (combined.includes('quota exceeded')) {
    return 'Daily database quota exceeded. Please try again later.';
  }
  if (combined.includes('permission-denied') || combined.includes('missing or insufficient permissions')) {
    return 'Permission denied. Please sign in with a verified Google account and verify your request details.';
  }
  if (combined.includes('offline') || combined.includes('network')) {
    return 'Unable to reach the server. Please check your internet connection.';
  }
  if (rawMessage.startsWith('RIDEHUB:')) {
    return rawMessage.replace(/^RIDEHUB:\s*/, '');
  }
  return fallback;
}

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

  let rawMessage = error.message;
  try {
    const parsed = JSON.parse(error.message) as Partial<FirestoreErrorInfo>;
    if (parsed && typeof parsed.error === 'string') {
      rawMessage = parsed.error;
    }
  } catch {
    // Plain error message
  }

  const lower = rawMessage.toLowerCase();
  if (lower.includes('quota exceeded')) {
    return 'Daily database quota exceeded. Please try again later.';
  }
  if (lower.includes('permission-denied') || lower.includes('missing or insufficient permissions')) {
    return 'Permission denied. Please sign in with a verified Google account and verify your request details.';
  }
  if (lower.includes('offline') || lower.includes('network')) {
    return 'Unable to reach the server. Please check your internet connection.';
  }
  if (lower.includes('popup-closed-by-user')) {
    return 'Sign-in was cancelled before completing.';
  }
  if (rawMessage.startsWith('RIDEHUB:')) {
    return rawMessage.replace(/^RIDEHUB:\s*/, '');
  }
  return fallback;
}

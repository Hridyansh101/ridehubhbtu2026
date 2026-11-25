import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  sanitizePublicDisplayName,
  VALIDATION_LIMITS,
} from '../constants/validation';
import {
  CreateRideInput,
  JoinRequest,
  ReportReason,
  Ride,
  RideContact,
  UpdateRideInput,
} from '../types/ride';
import { db } from './config';
import { handleFirestoreError, OperationType } from './errors';

const RIDES_COLLECTION = 'rides';
const JOIN_REQUESTS_COLLECTION = 'joinRequests';
const RIDE_REPORTS_COLLECTION = 'rideReports';

function sortRidesByDeparture(rides: Ride[]): Ride[] {
  return [...rides].sort((a, b) => {
    const keyA = `${a.travelDate}T${a.departureTime}`;
    const keyB = `${b.travelDate}T${b.departureTime}`;
    return keyA.localeCompare(keyB);
  });
}

function sortRequestsByCreatedDesc(requests: JoinRequest[]): JoinRequest[] {
  return [...requests].sort((a, b) => {
    const timeA = a.createdAt?.toMillis?.() ?? 0;
    const timeB = b.createdAt?.toMillis?.() ?? 0;
    return timeB - timeA;
  });
}

function assertValidFirestoreId(id: string, label = 'document ID'): string {
  const trimmed = id.trim();
  if (!VALIDATION_LIMITS.ID_PATTERN.test(trimmed)) {
    throw new Error(`RIDEHUB: Invalid ${label}.`);
  }
  return trimmed;
}

function clampFiniteInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('RIDEHUB: Please provide a valid whole number.');
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function clampFiniteFare(value: number): number {
  if (!Number.isFinite(value) || value < VALIDATION_LIMITS.MIN_FARE) {
    throw new Error('RIDEHUB: Estimated fare must be a valid non-negative number.');
  }
  return Math.max(
    VALIDATION_LIMITS.MIN_FARE,
    Math.min(VALIDATION_LIMITS.MAX_FARE, Number(value.toFixed(2)))
  );
}

export function buildDeterministicJoinRequestId(rideId: string, passengerId: string): string {
  const safeRideId = assertValidFirestoreId(rideId, 'ride ID');
  const safePassengerId = assertValidFirestoreId(passengerId, 'user ID');
  return `${safeRideId}__${safePassengerId}`;
}

export async function fetchPublicActiveRides(): Promise<Ride[]> {
  const path = RIDES_COLLECTION;
  try {
    const q = query(
      collection(db, RIDES_COLLECTION),
      where('status', 'in', ['active', 'full'])
    );
    const snapshot = await getDocs(q);
    const rides = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Ride, 'id'>),
    }));
    return sortRidesByDeparture(rides);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribePublicActiveRides(
  onData: (rides: Ride[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const path = RIDES_COLLECTION;
  const q = query(
    collection(db, RIDES_COLLECTION),
    where('status', 'in', ['active', 'full'])
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const rides = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Ride, 'id'>),
      }));
      onData(sortRidesByDeparture(rides));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export function subscribeUserPostedRides(
  uid: string,
  onData: (rides: Ride[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const path = RIDES_COLLECTION;
  const q = query(collection(db, RIDES_COLLECTION), where('driverId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rides = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Ride, 'id'>),
      }));
      onData(sortRidesByDeparture(rides));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export function subscribeUserJoinRequests(
  uid: string,
  onData: (requests: JoinRequest[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const path = JOIN_REQUESTS_COLLECTION;
  const q = query(collection(db, JOIN_REQUESTS_COLLECTION), where('passengerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<JoinRequest, 'id'>),
      }));
      onData(sortRequestsByCreatedDesc(items));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export function subscribeIncomingRequests(
  uid: string,
  onData: (requests: JoinRequest[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const path = JOIN_REQUESTS_COLLECTION;
  const q = query(collection(db, JOIN_REQUESTS_COLLECTION), where('driverId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<JoinRequest, 'id'>),
      }));
      onData(sortRequestsByCreatedDesc(items));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export async function fetchRideById(rideId: string): Promise<Ride | null> {
  const safeRideId = assertValidFirestoreId(rideId, 'ride ID');
  const path = `${RIDES_COLLECTION}/${safeRideId}`;
  try {
    const snap = await getDoc(doc(db, RIDES_COLLECTION, safeRideId));
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...(snap.data() as Omit<Ride, 'id'>),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchPrivateContact(rideId: string): Promise<RideContact | null> {
  const safeRideId = assertValidFirestoreId(rideId, 'ride ID');
  const path = `${RIDES_COLLECTION}/${safeRideId}/private/contact`;
  try {
    const snap = await getDoc(doc(db, RIDES_COLLECTION, safeRideId, 'private', 'contact'));
    if (!snap.exists()) return null;
    return snap.data() as RideContact;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createRide(input: CreateRideInput, user: User): Promise<string> {
  const rideRef = doc(collection(db, RIDES_COLLECTION));
  const rideId = rideRef.id;
  const contactRef = doc(db, RIDES_COLLECTION, rideId, 'private', 'contact');
  const path = `${RIDES_COLLECTION}/${rideId}`;

  const cleanOrigin = input.origin.trim().slice(0, VALIDATION_LIMITS.MAX_LOCATION_LEN);
  const cleanDestination = input.destination.trim().slice(0, VALIDATION_LIMITS.MAX_LOCATION_LEN);
  const cleanNotes = input.notes.trim().slice(0, VALIDATION_LIMITS.MAX_NOTES_LEN);
  const cleanContactValue = input.contactValue.trim().slice(0, VALIDATION_LIMITS.MAX_CONTACT_LEN);
  const seatsInt = clampFiniteInt(
    input.totalSeats,
    VALIDATION_LIMITS.MIN_SEATS,
    VALIDATION_LIMITS.MAX_SEATS
  );
  const safeFare = clampFiniteFare(input.estimatedTotalFare);

  try {
    const batch = writeBatch(db);
    batch.set(rideRef, {
      driverId: user.uid,
      driverName: sanitizePublicDisplayName(user.displayName),
      origin: cleanOrigin,
      destination: cleanDestination,
      destinationCategory: input.destinationCategory,
      travelDate: input.travelDate,
      departureTime: input.departureTime,
      totalSeats: seatsInt,
      availableSeats: seatsInt,
      estimatedTotalFare: safeFare,
      currency: input.currency,
      notes: cleanNotes,
      contactChannelLabel: input.contactMethod,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(contactRef, {
      rideId,
      driverId: user.uid,
      contactMethod: input.contactMethod,
      contactValue: cleanContactValue,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    return rideId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateRideDetails(rideId: string, input: UpdateRideInput): Promise<void> {
  const safeRideId = assertValidFirestoreId(rideId, 'ride ID');
  const path = `${RIDES_COLLECTION}/${safeRideId}`;
  const cleanOrigin = input.origin.trim().slice(0, VALIDATION_LIMITS.MAX_LOCATION_LEN);
  const cleanDestination = input.destination.trim().slice(0, VALIDATION_LIMITS.MAX_LOCATION_LEN);
  const cleanNotes = input.notes.trim().slice(0, VALIDATION_LIMITS.MAX_NOTES_LEN);
  const totalSeats = clampFiniteInt(
    input.totalSeats,
    VALIDATION_LIMITS.MIN_SEATS,
    VALIDATION_LIMITS.MAX_SEATS
  );
  const availableSeats = clampFiniteInt(input.availableSeats, 0, totalSeats);
  const safeFare = clampFiniteFare(input.estimatedTotalFare);

  try {
    const batch = writeBatch(db);
    const rideRef = doc(db, RIDES_COLLECTION, safeRideId);
    batch.update(rideRef, {
      origin: cleanOrigin,
      destination: cleanDestination,
      destinationCategory: input.destinationCategory,
      travelDate: input.travelDate,
      departureTime: input.departureTime,
      totalSeats,
      availableSeats,
      estimatedTotalFare: safeFare,
      currency: input.currency,
      notes: cleanNotes,
      contactChannelLabel: input.contactMethod,
      status: availableSeats === 0 ? 'full' : 'active',
      updatedAt: serverTimestamp(),
    });

    if (input.contactValue && input.contactValue.trim().length >= VALIDATION_LIMITS.MIN_CONTACT_LEN) {
      const contactRef = doc(db, RIDES_COLLECTION, safeRideId, 'private', 'contact');
      batch.update(contactRef, {
        contactMethod: input.contactMethod,
        contactValue: input.contactValue.trim().slice(0, VALIDATION_LIMITS.MAX_CONTACT_LEN),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function cancelRide(rideId: string): Promise<void> {
  const safeRideId = assertValidFirestoreId(rideId, 'ride ID');
  const path = `${RIDES_COLLECTION}/${safeRideId}`;
  try {
    await updateDoc(doc(db, RIDES_COLLECTION, safeRideId), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function completeRide(rideId: string): Promise<void> {
  const safeRideId = assertValidFirestoreId(rideId, 'ride ID');
  const path = `${RIDES_COLLECTION}/${safeRideId}`;
  try {
    await updateDoc(doc(db, RIDES_COLLECTION, safeRideId), {
      status: 'completed',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function requestToJoinRide(
  ride: Ride,
  user: User,
  seatsRequested: number,
  note: string
): Promise<string> {
  if (ride.driverId === user.uid) {
    throw new Error('RIDEHUB: You cannot request to join your own ride.');
  }
  if (ride.status !== 'active' || ride.availableSeats <= 0) {
    throw new Error('RIDEHUB: This ride has no seats available.');
  }
  const requested = Math.max(
    1,
    Math.min(VALIDATION_LIMITS.MAX_SEATS_PER_REQUEST, Math.floor(seatsRequested))
  );
  if (requested > ride.availableSeats) {
    throw new Error(`RIDEHUB: Only ${ride.availableSeats} seat(s) remain on this ride.`);
  }

  const requestId = buildDeterministicJoinRequestId(ride.id, user.uid);
  const requestRef = doc(db, JOIN_REQUESTS_COLLECTION, requestId);
  const path = `${JOIN_REQUESTS_COLLECTION}/${requestId}`;

  // Pre-check for duplicate request before attempting create
  try {
    const existingSnap = await getDoc(requestRef);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data() as JoinRequest;
      if (existingData.status === 'pending') {
        throw new Error('RIDEHUB: You already have a pending request for this ride.');
      }
      if (existingData.status === 'accepted') {
        throw new Error('RIDEHUB: You already have a confirmed seat on this ride.');
      }
      throw new Error('RIDEHUB: A join request for this ride already exists on your account.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('RIDEHUB:')) {
      throw error;
    }
    // Proceed to create if getDoc wasn't found; handle permission errors properly on create
  }

  try {
    await setDoc(requestRef, {
      rideId: ride.id,
      driverId: ride.driverId,
      passengerId: user.uid,
      passengerName: sanitizePublicDisplayName(user.displayName),
      seatsRequested: requested,
      note: note.trim().slice(0, VALIDATION_LIMITS.MAX_REQUEST_NOTE_LEN),
      status: 'pending',
      rideSnapshotOrigin: ride.origin.slice(0, VALIDATION_LIMITS.MAX_LOCATION_LEN),
      rideSnapshotDestination: ride.destination.slice(0, VALIDATION_LIMITS.MAX_LOCATION_LEN),
      rideSnapshotDate: ride.travelDate,
      rideSnapshotTime: ride.departureTime,
      rideSnapshotFare: ride.estimatedTotalFare,
      rideSnapshotCurrency: ride.currency,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return requestId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Atomically accepts a pending join request and decrements available seats
 * using a Firestore transaction so concurrent approvals never overbook seats.
 */
export async function acceptJoinRequest(request: JoinRequest): Promise<void> {
  const safeRideId = assertValidFirestoreId(request.rideId, 'ride ID');
  const safeRequestId = assertValidFirestoreId(request.id, 'request ID');
  const path = `${JOIN_REQUESTS_COLLECTION}/${safeRequestId}`;
  const rideRef = doc(db, RIDES_COLLECTION, safeRideId);
  const reqRef = doc(db, JOIN_REQUESTS_COLLECTION, safeRequestId);

  try {
    await runTransaction(db, async (transaction) => {
      const [rideSnap, reqSnap] = await Promise.all([
        transaction.get(rideRef),
        transaction.get(reqRef),
      ]);

      if (!rideSnap.exists()) {
        throw new Error('RIDEHUB: This ride no longer exists.');
      }
      if (!reqSnap.exists()) {
        throw new Error('RIDEHUB: Join request no longer exists.');
      }

      const liveRide = rideSnap.data() as Ride;
      const liveReq = reqSnap.data() as JoinRequest;

      if (liveReq.status !== 'pending') {
        throw new Error('RIDEHUB: This request has already been processed.');
      }
      if (liveRide.status !== 'active') {
        throw new Error('RIDEHUB: Cannot accept requests on a ride that is not active.');
      }
      if (liveRide.availableSeats < liveReq.seatsRequested) {
        throw new Error(
          `RIDEHUB: Not enough seats left (${liveRide.availableSeats} available, ${liveReq.seatsRequested} requested).`
        );
      }

      const remainingSeats = liveRide.availableSeats - liveReq.seatsRequested;

      transaction.update(rideRef, {
        availableSeats: remainingSeats,
        status: remainingSeats === 0 ? 'full' : 'active',
        updatedAt: serverTimestamp(),
      });

      transaction.update(reqRef, {
        status: 'accepted',
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('RIDEHUB:')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function declineJoinRequest(requestId: string): Promise<void> {
  const safeRequestId = assertValidFirestoreId(requestId, 'request ID');
  const path = `${JOIN_REQUESTS_COLLECTION}/${safeRequestId}`;
  try {
    await updateDoc(doc(db, JOIN_REQUESTS_COLLECTION, safeRequestId), {
      status: 'declined',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Cancels a passenger's join request. If already accepted and the ride is still
 * active or full, restores the seats atomically via a Firestore transaction.
 */
export async function cancelJoinRequest(request: JoinRequest): Promise<void> {
  const safeRequestId = assertValidFirestoreId(request.id, 'request ID');
  const safeRideId = assertValidFirestoreId(request.rideId, 'ride ID');
  const path = `${JOIN_REQUESTS_COLLECTION}/${safeRequestId}`;
  const reqRef = doc(db, JOIN_REQUESTS_COLLECTION, safeRequestId);
  const rideRef = doc(db, RIDES_COLLECTION, safeRideId);

  try {
    if (request.status === 'pending') {
      await updateDoc(reqRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
      return;
    }

    await runTransaction(db, async (transaction) => {
      const [rideSnap, reqSnap] = await Promise.all([
        transaction.get(rideRef),
        transaction.get(reqRef),
      ]);
      if (!reqSnap.exists()) {
        throw new Error('RIDEHUB: Request not found.');
      }
      const liveReq = reqSnap.data() as JoinRequest;
      if (liveReq.status === 'cancelled' || liveReq.status === 'declined') {
        return;
      }

      if (rideSnap.exists()) {
        const liveRide = rideSnap.data() as Ride;
        if (liveReq.status === 'accepted' && (liveRide.status === 'active' || liveRide.status === 'full')) {
          const restoredSeats = Math.min(
            liveRide.totalSeats,
            liveRide.availableSeats + liveReq.seatsRequested
          );
          transaction.update(rideRef, {
            availableSeats: restoredSeats,
            status: 'active',
            updatedAt: serverTimestamp(),
          });
        }
      }

      transaction.update(reqRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('RIDEHUB:')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function submitRideReport(
  rideId: string,
  user: User,
  reason: ReportReason,
  details: string
): Promise<void> {
  const safeRideId = assertValidFirestoreId(rideId, 'ride ID');
  const safeUserId = assertValidFirestoreId(user.uid, 'user ID');
  const reportId = `${safeRideId}__${safeUserId}`;
  const reportRef = doc(db, RIDE_REPORTS_COLLECTION, reportId);
  const path = `${RIDE_REPORTS_COLLECTION}/${reportId}`;

  const cleanDetails = details.trim().slice(0, VALIDATION_LIMITS.MAX_REPORT_DETAILS_LEN);
  if (cleanDetails.length < VALIDATION_LIMITS.MIN_REPORT_DETAILS_LEN) {
    throw new Error('RIDEHUB: Please provide at least 5 characters describing the concern.');
  }

  try {
    const existing = await getDoc(reportRef);
    if (existing.exists()) {
      throw new Error('RIDEHUB: You have already submitted a report for this ride.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('RIDEHUB:')) {
      throw error;
    }
  }

  try {
    await setDoc(reportRef, {
      rideId,
      reporterId: user.uid,
      reason,
      details: cleanDetails,
      status: 'open',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

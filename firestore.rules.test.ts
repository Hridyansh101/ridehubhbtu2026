/**
 * Security Rules Specification Verification Suite (Dirty Dozen Payloads)
 *
 * Run against Firebase Firestore Emulator with @firebase/rules-unit-testing:
 *   npx firebase emulators:exec --only firestore "npx tsx firestore.rules.test.ts"
 */

export interface AdversarialPayloadCase {
  id: number;
  name: string;
  operation: 'create' | 'update' | 'get' | 'list';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
  enforcingRule: string;
}

export const DIRTY_DOZEN_CASES: AdversarialPayloadCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Ride Create',
    operation: 'create',
    path: '/rides/ride_01',
    auth: { uid: 'attacker_uid', email_verified: true },
    payload: { driverId: 'victim_uid', status: 'active' },
    expected: 'PERMISSION_DENIED',
    enforcingRule: 'incoming().driverId == request.auth.uid',
  },
  {
    id: 2,
    name: 'Shadow / Ghost Field Injection (isVerified)',
    operation: 'create',
    path: '/rides/ride_02',
    auth: { uid: 'driver_a', email_verified: true },
    payload: { driverId: 'driver_a', isVerified: true },
    expected: 'PERMISSION_DENIED',
    enforcingRule: 'isValidRide() data.keys().hasOnly([...])',
  },
  {
    id: 3,
    name: 'Unverified Email Write Attempt',
    operation: 'create',
    path: '/rides/ride_03',
    auth: { uid: 'driver_unverified', email_verified: false },
    payload: { driverId: 'driver_unverified' },
    expected: 'PERMISSION_DENIED',
    enforcingRule: 'isVerifiedEmail() requires request.auth.token.email_verified == true',
  },
  {
    id: 4,
    name: 'Resource Poisoning via Oversized / Invalid Document ID',
    operation: 'create',
    path: `/rides/${'!'.repeat(200)}`,
    auth: { uid: 'driver_a', email_verified: true },
    payload: { driverId: 'driver_a' },
    expected: 'PERMISSION_DENIED',
    enforcingRule: 'isValidId(rideId) enforces size <= 128 and ^[a-zA-Z0-9_\\-]+$',
  },
  {
    id: 5,
    name: 'Negative Fare and Zero Total Seats',
    operation: 'create',
    path: '/rides/ride_04',
    auth: { uid: 'driver_a', email_verified: true },
    payload: { driverId: 'driver_a', estimatedTotalFare: -50, totalSeats: 0 },
    expected: 'PERMISSION_DENIED',
    enforcingRule: 'isValidRide() enforces totalSeats >= 1 and estimatedTotalFare >= 0',
  },
  {
    id: 6,
    name: 'PII Leak Attempt on Private Driver Contact',
    operation: 'get',
    path: '/rides/ride_01/private/contact',
    auth: { uid: 'unaccepted_user', email_verified: true },
    expected: 'PERMISSION_DENIED',
    enforcingRule: 'private/contact get requires driverId == uid OR accepted joinRequest',
  },
  {
    id: 7,
    name: 'Joining a Full Ride with Zero Available Seats',
    operation: 'create',
    path: '/joinRequests/ride_full__passenger_b',
    auth: { uid: 'passenger_b', email_verified: true },
    payload: { rideId: 'ride_full', passengerId: 'passenger_b', seatsRequested: 1 },
    expected: 'PERMISSION_DENIED',
    enforcingRule: 'joinRequests create requires ride.status == active && ride.availableSeats >= seatsRequested',
  },
  {
    id: 8,
    name: 'Self-Join Bypass (Driver Joining Own Ride)',
    operation: 'create',
    path: '/joinRequests/ride_01__driver_a',
    auth: { uid: 'driver_a', email_verified: true },
    payload: { rideId: 'ride_01', driverId: 'driver_a', passengerId: 'driver_a' },
    expected: 'PERMISSION_DENIED',
    enforcingRule: 'isValidJoinRequest() enforces passengerId != driverId',
  },
  {
    id: 9,
    name: 'Duplicate / Non-Deterministic Join Request ID',
    operation: 'create',
    path: '/joinRequests/random_id_bypass',
    auth: { uid: 'passenger_b', email_verified: true },
    payload: { rideId: 'ride_01', passengerId: 'passenger_b' },
    expected: 'PERMISSION_DENIED',
    enforcingRule: "requestId == incoming().rideId + '__' + request.auth.uid",
  },
  {
    id: 10,
    name: 'Non-Atomic Acceptance Seat Desync',
    operation: 'update',
    path: '/joinRequests/ride_01__passenger_b',
    auth: { uid: 'driver_a', email_verified: true },
    payload: { status: 'accepted' },
    expected: 'PERMISSION_DENIED',
    enforcingRule: 'getAfter(/rides/rideId).data.availableSeats == existing - seatsRequested',
  },
  {
    id: 11,
    name: 'Terminal State Mutation on Cancelled Ride',
    operation: 'update',
    path: '/rides/ride_cancelled',
    auth: { uid: 'driver_a', email_verified: true },
    payload: { status: 'active' },
    expected: 'PERMISSION_DENIED',
    enforcingRule: "existing().status in ['active', 'full']",
  },
  {
    id: 12,
    name: 'Value Poisoning on Allowed Key (availableSeats)',
    operation: 'update',
    path: '/rides/ride_01',
    auth: { uid: 'driver_a', email_verified: true },
    payload: { availableSeats: 99 },
    expected: 'PERMISSION_DENIED',
    enforcingRule: 'isValidRide(incoming()) enforces availableSeats <= totalSeats && <= 8',
  },
];

# RIDEHUB Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants

1. **Public vs. Private PII Isolation**: `/rides/{rideId}` must NEVER contain personal contact details (phone numbers, email addresses, or handles). Private contact details live exclusively in `/rides/{rideId}/private/contact` and are readable ONLY by the ride's driver or a passenger whose `/joinRequests/{rideId}__{uid}` document has `status == 'accepted'`.
2. **Driver Identity Integrity**: Only a verified authenticated user (`request.auth.token.email_verified == true`) may create a ride, and `driverId` must strictly equal `request.auth.uid`. `driverId` and `createdAt` are immutable after creation.
3. **Seat Bounds & Zero-Seat Prevention**: `totalSeats` must be an integer between `1` and `8`. `availableSeats` must be an integer between `0` and `totalSeats`. On `joinRequests` creation, the target ride must exist, have `status == 'active'`, and satisfy `availableSeats >= seatsRequested`.
4. **Duplicate Request & Self-Join Prevention**: `joinRequests` document IDs must match `{rideId}__{request.auth.uid}`, preventing duplicate join requests per passenger per ride. `passengerId` cannot equal `driverId`.
5. **Atomic Seat Accounting (`getAfter`)**: Accepting a pending join request MUST decrement `/rides/{rideId}.availableSeats` by `seatsRequested` in the same Firestore transaction. Withdrawing an accepted join request on an active/full ride MUST restore `seatsRequested` seats atomically.
6. **Terminal State Locking**: Rides with `status` of `'completed'` or `'cancelled'`, and join requests with `status` of `'declined'` or `'cancelled'`, cannot be mutated further.
7. **Secure List Queries**: No blanket `allow list: if isSignedIn()` or `allow read: if true`. Public ride listing requires `resource.data.status in ['active', 'full']`; `joinRequests` listing requires `passengerId == uid || driverId == uid`; `rideReports` listing requires `reporterId == uid`; `/rides/{rideId}/private/contact` forbids `list`.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Path | Expected Result |
|---|--------------|-------------|-----------------|
| 1 | **Identity Spoofing on Ride Create** (`driverId: "victim_uid"` while signed in as `attacker_uid`) | `/rides/ride_01` | `PERMISSION_DENIED` |
| 2 | **Shadow / Ghost Field Injection** (Adding `isVerified: true` on ride create) | `/rides/ride_02` | `PERMISSION_DENIED` |
| 3 | **Unverified Email Write** (`email_verified: false` creating a ride) | `/rides/ride_03` | `PERMISSION_DENIED` |
| 4 | **Resource Poisoning via Oversized ID** (200-char document ID with invalid chars) | `/rides/!!!...` | `PERMISSION_DENIED` |
| 5 | **Negative Fare / Zero Total Seats** (`estimatedTotalFare: -50`, `totalSeats: 0`) | `/rides/ride_04` | `PERMISSION_DENIED` |
| 6 | **Public PII Leak Attempt** (Unaccepted passenger reading `/rides/{rideId}/private/contact`) | `/rides/ride_01/private/contact` | `PERMISSION_DENIED` |
| 7 | **Joining a Full / Zero-Seat Ride** (Creating join request when `availableSeats == 0`) | `/joinRequests/ride_full__userB` | `PERMISSION_DENIED` |
| 8 | **Self-Join Bypass** (`passengerId == driverId` on join request create) | `/joinRequests/ride_01__driverA` | `PERMISSION_DENIED` |
| 9 | **Duplicate / Non-Deterministic Request ID** (Creating `/joinRequests/randomId123`) | `/joinRequests/randomId123` | `PERMISSION_DENIED` |
| 10 | **Non-Atomic Acceptance Desync** (Driver sets `joinRequest.status = 'accepted'` without decrementing `ride.availableSeats`) | `/joinRequests/ride_01__userB` | `PERMISSION_DENIED` |
| 11 | **Terminal State Mutation** (Driver edits a `'cancelled'` ride back to `'active'`) | `/rides/ride_cancelled` | `PERMISSION_DENIED` |
| 12 | **Value Poisoning on Allowed Key** (Driver updates `availableSeats` to `"five"` or `99`) | `/rides/ride_01` | `PERMISSION_DENIED` |

# RIDEHUB – Campus Carpool Network

**Share Your Ride, Split Your Fare.**

RIDEHUB is a campus-focused carpooling web application designed to help university students travelling to railway stations, airports, intercity bus hubs, and city destinations coordinate shared rides, put spare vehicle seats to better use, and split travel costs transparently.

---

## Core Features

1. **Landing Experience**: Hero with quick trip search, clickable popular campus transit routes, live recently posted rides, How It Works progression, student benefits, and transparent safety guidelines.
2. **Find a Ride**: Real-time ride discovery searchable and filterable by starting pickup landmark, destination, travel date, departure time window, minimum available seats, and destination category, with sorting and empty states.
3. **Offer a Ride**: Full trip submission form with strict validation (no past departure dates/times, positive integer seat count, non-negative fare estimates), live listing preview, and atomic persistence to Cloud Firestore.
4. **Fare Split Calculator**: Interactive fare calculator computing individual contribution (`Total fare ÷ Number of passengers`), optional solo-travel savings comparison (exact amount and percentage), visual cost split bar, currency selector, and reset control.
5. **My Rides Dashboard**: Manage posted trips (edit, mark completed, cancel with confirmation), review and approve/decline incoming student join requests with atomic Firestore seat transactions, track requested rides, reveal unlocked driver contact details upon acceptance, withdraw and release seats safely, and review cancelled/past history.
6. **Privacy & Safety by Design**:
   - Public pickup/drop-off landmarks only (no exact home addresses requested).
   - Private driver contact details are isolated in `/rides/{rideId}/private/contact` and never exposed publicly; they unlock strictly for the driver and accepted passengers.
   - Prevents joining zero-seat rides and prevents duplicate join requests via deterministic `{rideId}__{passengerId}` document IDs.
   - Clearly notes that fares are estimates, no automated payments are processed, and accounts are not independently identity-verified.
   - Built-in **Report Ride** workflow stored in `/rideReports/{rideId}__{reporterId}`.

---

## Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4
- **Icons**: Lucide React
- **Backend & Persistence**: Firebase Cloud Firestore (with atomic transactions and hardened security rules) & Firebase Authentication (Google Sign-In)
- **Deployment**: Ready for GitHub + Vercel (`vercel.json` SPA rewrites included)

---

## Installation & Local Development

### Prerequisites
- Node.js 18+ and npm
- A Firebase project with **Cloud Firestore** and **Firebase Authentication (Google provider)** enabled

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and populate your Firebase Web SDK credentials:

```bash
cp .env.example .env.local
```

```env
VITE_FIREBASE_API_KEY="your_firebase_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_project_id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_project_id.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_messaging_sender_id"
VITE_FIREBASE_APP_ID="your_firebase_app_id"
VITE_FIREBASE_DATABASE_ID="(default)"
```

> **Note:** Never commit `.env.local` or private credentials to version control.

### 3. Run Locally
```bash
npm run dev
```
The development server runs at `http://localhost:3000`.

### 4. Type-Check & Build for Production
```bash
npm run lint
npm run build
```

---

## Firebase Setup & Firestore Data Structure

### Required Collections

1. **`rides/{rideId}`** (Public non-PII trip listing)
   - `driverId`, `driverName`, `origin`, `destination`, `destinationCategory`, `travelDate`, `departureTime`, `totalSeats`, `availableSeats`, `estimatedTotalFare`, `currency`, `notes`, `contactChannelLabel`, `status` (`active | full | completed | cancelled`), `createdAt`, `updatedAt`.
2. **`rides/{rideId}/private/contact`** (PII-isolated private driver contact)
   - `rideId`, `driverId`, `contactMethod`, `contactValue`, `createdAt`, `updatedAt`.
   - Readable **only** by the driver or a passenger whose join request has `status == 'accepted'`.
3. **`joinRequests/{rideId}__{passengerId}`** (Deterministic ID prevents duplicate requests)
   - `rideId`, `driverId`, `passengerId`, `passengerName`, `seatsRequested`, `note`, `status` (`pending | accepted | declined | cancelled`), route snapshot fields, `createdAt`, `updatedAt`.
4. **`rideReports/{rideId}__{reporterId}`** (Immutable safety reports)
   - `rideId`, `reporterId`, `reason`, `details`, `status` (`open`), `createdAt`.

### Deploying Firestore Security Rules
The repository includes hardened security rules in `firestore.rules` (see also `firebase-blueprint.json` and `security_spec.md`). Deploy them to your Firebase project using the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

> Always review and audit `firestore.rules` against your deployment requirements before launching publicly.

---

## Deploying to Vercel

1. Push this repository to **GitHub**.
2. Go to [vercel.com](https://vercel.com), click **Add New → Project**, and import your GitHub repository.
3. Configure the build settings (Vercel auto-detects Vite):
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add all `VITE_FIREBASE_*` environment variables from `.env.example` under **Project Settings → Environment Variables**.
5. In the **Firebase Console → Authentication → Settings → Authorized domains**, add your deployed `*.vercel.app` domain so Google Sign-In works in production.
6. Click **Deploy**. `vercel.json` handles SPA client routing cleanly.

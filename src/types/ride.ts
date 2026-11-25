import { Timestamp } from 'firebase/firestore';

export type DestinationCategory = 'railway' | 'airport' | 'bus' | 'city' | 'other';
export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP';
export type ContactMethod = 'Campus Email' | 'WhatsApp' | 'SMS / Phone' | 'Telegram';
export type RideStatus = 'active' | 'full' | 'completed' | 'cancelled';
export type JoinRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type ReportReason =
  | 'inaccurate_details'
  | 'unsafe_pickup'
  | 'suspicious_pricing'
  | 'harassment_or_spam'
  | 'other';

export type PageRoute = 'home' | 'find' | 'offer' | 'calculator' | 'my-rides';

export interface Ride {
  id: string;
  driverId: string;
  driverName: string;
  origin: string;
  destination: string;
  destinationCategory: DestinationCategory;
  travelDate: string; // YYYY-MM-DD
  departureTime: string; // HH:MM
  totalSeats: number;
  availableSeats: number;
  estimatedTotalFare: number;
  currency: CurrencyCode;
  notes: string;
  contactChannelLabel: ContactMethod;
  status: RideStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface RideContact {
  rideId: string;
  driverId: string;
  contactMethod: ContactMethod;
  contactValue: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface JoinRequest {
  id: string;
  rideId: string;
  driverId: string;
  passengerId: string;
  passengerName: string;
  seatsRequested: number;
  note: string;
  status: JoinRequestStatus;
  rideSnapshotOrigin: string;
  rideSnapshotDestination: string;
  rideSnapshotDate: string;
  rideSnapshotTime: string;
  rideSnapshotFare: number;
  rideSnapshotCurrency: CurrencyCode;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface RideReport {
  id: string;
  rideId: string;
  reporterId: string;
  reason: ReportReason;
  details: string;
  status: 'open';
  createdAt: Timestamp | null;
}

export type TimeWindowFilter = 'any' | 'morning' | 'afternoon' | 'evening' | 'night';

export interface RideFilters {
  origin: string;
  destination: string;
  date: string;
  timeWindow: TimeWindowFilter;
  minSeats: number;
  category: DestinationCategory | 'all';
}

export interface CreateRideInput {
  origin: string;
  destination: string;
  destinationCategory: DestinationCategory;
  travelDate: string;
  departureTime: string;
  totalSeats: number;
  estimatedTotalFare: number;
  currency: CurrencyCode;
  notes: string;
  contactMethod: ContactMethod;
  contactValue: string;
}

export interface UpdateRideInput {
  origin: string;
  destination: string;
  destinationCategory: DestinationCategory;
  travelDate: string;
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  estimatedTotalFare: number;
  currency: CurrencyCode;
  notes: string;
  contactMethod: ContactMethod;
  contactValue?: string;
}

export interface CalculatorPrefill {
  totalFare: number;
  passengers: number;
  currency: CurrencyCode;
  routeLabel?: string;
}

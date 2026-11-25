import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Clock,
  Lock,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  CAMPUS_PICKUP_LANDMARKS,
  CONTACT_METHODS,
  CURRENCIES,
  DESTINATION_CATEGORIES,
  formatMoney,
  formatReadableDate,
  formatReadableTime,
  getCurrentLocalTimeString,
  getTodayLocalDateString,
  VALIDATION_LIMITS,
} from '../constants/validation';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getFriendlyErrorMessage } from '../firebase/errors';
import { createRide } from '../firebase/rideService';
import {
  ContactMethod,
  CurrencyCode,
  DestinationCategory,
  PageRoute,
} from '../types/ride';

interface OfferRidePageProps {
  onRideCreated: () => void;
  onNavigate: (page: PageRoute) => void;
}

interface FormErrors {
  origin?: string;
  destination?: string;
  travelDate?: string;
  departureTime?: string;
  totalSeats?: string;
  estimatedTotalFare?: string;
  contactValue?: string;
  notes?: string;
}

export function OfferRidePage({ onRideCreated, onNavigate }: OfferRidePageProps) {
  const { user, signInWithGoogle, signingIn } = useAuth();
  const { showToast } = useToast();

  const today = getTodayLocalDateString();

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationCategory, setDestinationCategory] = useState<DestinationCategory>('railway');
  const [travelDate, setTravelDate] = useState(today);
  const [departureTime, setDepartureTime] = useState('10:00');
  const [totalSeats, setTotalSeats] = useState('3');
  const [estimatedTotalFare, setEstimatedTotalFare] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('Campus Email');
  const [contactValue, setContactValue] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const selectedContactMeta =
    CONTACT_METHODS.find((m) => m.value === contactMethod) ?? CONTACT_METHODS[0];

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    const trimmedOrigin = origin.trim();
    const trimmedDest = destination.trim();
    const trimmedContact = contactValue.trim();

    if (trimmedOrigin.length < VALIDATION_LIMITS.MIN_LOCATION_LEN) {
      next.origin = 'Enter a recognizable campus pickup landmark (at least 2 characters).';
    } else if (trimmedOrigin.length > VALIDATION_LIMITS.MAX_LOCATION_LEN) {
      next.origin = `Pickup location must be ${VALIDATION_LIMITS.MAX_LOCATION_LEN} characters or fewer.`;
    }

    if (trimmedDest.length < VALIDATION_LIMITS.MIN_LOCATION_LEN) {
      next.destination = 'Enter a destination landmark (at least 2 characters).';
    } else if (trimmedDest.length > VALIDATION_LIMITS.MAX_LOCATION_LEN) {
      next.destination = `Destination must be ${VALIDATION_LIMITS.MAX_LOCATION_LEN} characters or fewer.`;
    }

    const currentToday = getTodayLocalDateString();
    if (!travelDate || !VALIDATION_LIMITS.DATE_PATTERN.test(travelDate)) {
      next.travelDate = 'Select a valid travel date.';
    } else if (travelDate < currentToday) {
      next.travelDate = 'Departure date cannot be in the past.';
    }

    if (!departureTime || !VALIDATION_LIMITS.TIME_PATTERN.test(departureTime)) {
      next.departureTime = 'Select a valid departure time.';
    } else if (travelDate === currentToday && departureTime < getCurrentLocalTimeString()) {
      next.departureTime = 'Departure time for today must be in the future.';
    }

    const parsedSeats = Number(totalSeats);
    if (
      !totalSeats.trim() ||
      !Number.isInteger(parsedSeats) ||
      parsedSeats < VALIDATION_LIMITS.MIN_SEATS ||
      parsedSeats > VALIDATION_LIMITS.MAX_SEATS
    ) {
      next.totalSeats = `Seat count must be a whole number between ${VALIDATION_LIMITS.MIN_SEATS} and ${VALIDATION_LIMITS.MAX_SEATS}.`;
    }

    if (!estimatedTotalFare.trim()) {
      next.estimatedTotalFare = 'Enter an estimated total fare (enter 0 if splitting fuel later).';
    } else {
      const parsedFare = Number(estimatedTotalFare);
      if (Number.isNaN(parsedFare) || parsedFare < 0) {
        next.estimatedTotalFare = 'Estimated fare cannot be negative.';
      } else if (parsedFare > VALIDATION_LIMITS.MAX_FARE) {
        next.estimatedTotalFare = `Estimated fare cannot exceed ${VALIDATION_LIMITS.MAX_FARE.toLocaleString()}.`;
      }
    }

    if (trimmedContact.length < VALIDATION_LIMITS.MIN_CONTACT_LEN) {
      next.contactValue = 'Provide your contact handle, campus email, or phone so accepted riders can reach you.';
    } else if (trimmedContact.length > VALIDATION_LIMITS.MAX_CONTACT_LEN) {
      next.contactValue = `Contact detail must be ${VALIDATION_LIMITS.MAX_CONTACT_LEN} characters or fewer.`;
    }

    if (notes.trim().length > VALIDATION_LIMITS.MAX_NOTES_LEN) {
      next.notes = `Travel notes must be ${VALIDATION_LIMITS.MAX_NOTES_LEN} characters or fewer.`;
    }

    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      showToast('error', 'Please review the form', 'Fix the highlighted fields before posting.');
      return;
    }

    let activeUser = user;
    if (!activeUser) {
      try {
        activeUser = await signInWithGoogle();
      } catch (error) {
        showToast('error', 'Sign-in required', getFriendlyErrorMessage(error));
        return;
      }
    }
    if (!activeUser) return;

    setSubmitting(true);
    try {
      await createRide(
        {
          origin: origin.trim(),
          destination: destination.trim(),
          destinationCategory,
          travelDate,
          departureTime,
          totalSeats: Number(totalSeats),
          estimatedTotalFare: Number(estimatedTotalFare),
          currency,
          notes: notes.trim(),
          contactMethod,
          contactValue: contactValue.trim(),
        },
        activeUser
      );

      showToast(
        'success',
        'Ride posted to RIDEHUB',
        'Your trip is now live and visible to fellow students.'
      );
      onRideCreated();
      onNavigate('my-rides');
    } catch (error) {
      showToast('error', 'Could not post ride', getFriendlyErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const previewSeats = Math.max(1, Math.min(8, Number(totalSeats) || 1));
  const previewFare = Math.max(0, Number(estimatedTotalFare) || 0);
  const previewPerPerson = previewFare > 0 ? previewFare / (previewSeats + 1) : 0;

  return (
    <div className="min-h-[75vh] bg-[#F8FAFC] pb-20 pt-8 transition-colors duration-200 dark:bg-[#090F1A] sm:pt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0B192C] dark:text-white sm:text-3xl">
            Offer a Ride
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
            Post your planned trip with public HBTU pickup and Kanpur drop-off landmarks so fellow
            students can join and split the fare.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Submission Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0F172A] sm:p-8 lg:col-span-8"
          >
            {/* Route Details */}
            <div>
              <h2 className="font-display text-base font-bold text-[#0B192C] dark:text-white">
                01. Route & Landmarks
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Use public HBTU campus gates, Shatabdi Bhawan, or transit terminals — never exact
                home addresses.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="offer-origin"
                    className="block text-sm font-medium text-[#0B192C] dark:text-slate-200"
                  >
                    Starting Location <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <MapPin
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="offer-origin"
                      type="text"
                      maxLength={VALIDATION_LIMITS.MAX_LOCATION_LEN}
                      value={origin}
                      onChange={(e) => {
                        setOrigin(e.target.value);
                        if (errors.origin) setErrors((prev) => ({ ...prev, origin: undefined }));
                      }}
                      placeholder="e.g., HBTU East Campus Main Gate"
                      className={`h-11 w-full rounded-xl border bg-white pl-10 pr-3.5 text-sm text-[#0B192C] placeholder:text-slate-400 focus:outline-none dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                        errors.origin
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-slate-200 focus:border-[#2563EB] dark:border-slate-700'
                      }`}
                    />
                  </div>
                  {errors.origin && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {errors.origin}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {CAMPUS_PICKUP_LANDMARKS.slice(0, 3).map((landmark) => (
                      <button
                        key={landmark}
                        type="button"
                        onClick={() => {
                          setOrigin(landmark);
                          if (errors.origin) setErrors((prev) => ({ ...prev, origin: undefined }));
                        }}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        {landmark}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="offer-destination"
                    className="block text-sm font-medium text-[#0B192C] dark:text-slate-200"
                  >
                    Destination <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <MapPin
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563EB] dark:text-blue-400"
                      aria-hidden="true"
                    />
                    <input
                      id="offer-destination"
                      type="text"
                      maxLength={VALIDATION_LIMITS.MAX_LOCATION_LEN}
                      value={destination}
                      onChange={(e) => {
                        setDestination(e.target.value);
                        if (errors.destination)
                          setErrors((prev) => ({ ...prev, destination: undefined }));
                      }}
                      placeholder="e.g., Kanpur Central Railway Station (CNB)"
                      className={`h-11 w-full rounded-xl border bg-white pl-10 pr-3.5 text-sm text-[#0B192C] placeholder:text-slate-400 focus:outline-none dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                        errors.destination
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-slate-200 focus:border-[#2563EB] dark:border-slate-700'
                      }`}
                    />
                  </div>
                  {errors.destination && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {errors.destination}
                    </p>
                  )}

                  <div className="mt-2">
                    <label htmlFor="offer-category" className="sr-only">
                      Destination Category
                    </label>
                    <select
                      id="offer-category"
                      value={destinationCategory}
                      onChange={(e) =>
                        setDestinationCategory(e.target.value as DestinationCategory)
                      }
                      className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-medium text-slate-700 focus:border-[#2563EB] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {DESTINATION_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          Category: {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* Schedule, Seats & Fare */}
            <div>
              <h2 className="font-display text-base font-bold text-[#0B192C] dark:text-white">
                02. Schedule, Seats & Estimated Fare
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    htmlFor="offer-date"
                    className="block text-sm font-medium text-[#0B192C] dark:text-slate-200"
                  >
                    Travel Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Calendar
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="offer-date"
                      type="date"
                      min={today}
                      value={travelDate}
                      onChange={(e) => {
                        setTravelDate(e.target.value);
                        if (errors.travelDate)
                          setErrors((prev) => ({ ...prev, travelDate: undefined }));
                      }}
                      className={`h-11 w-full rounded-xl border bg-white pl-9 pr-2.5 text-sm text-[#0B192C] focus:outline-none dark:bg-slate-900 dark:text-slate-100 ${
                        errors.travelDate
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-slate-200 focus:border-[#2563EB] dark:border-slate-700'
                      }`}
                    />
                  </div>
                  {errors.travelDate && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      {errors.travelDate}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="offer-time"
                    className="block text-sm font-medium text-[#0B192C] dark:text-slate-200"
                  >
                    Departure Time <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Clock
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="offer-time"
                      type="time"
                      value={departureTime}
                      onChange={(e) => {
                        setDepartureTime(e.target.value);
                        if (errors.departureTime)
                          setErrors((prev) => ({ ...prev, departureTime: undefined }));
                      }}
                      className={`h-11 w-full rounded-xl border bg-white pl-9 pr-2.5 text-sm text-[#0B192C] focus:outline-none dark:bg-slate-900 dark:text-slate-100 ${
                        errors.departureTime
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-slate-200 focus:border-[#2563EB] dark:border-slate-700'
                      }`}
                    />
                  </div>
                  {errors.departureTime && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      {errors.departureTime}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="offer-seats"
                    className="block text-sm font-medium text-[#0B192C] dark:text-slate-200"
                  >
                    Available Seats <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Users
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="offer-seats"
                      type="number"
                      min={VALIDATION_LIMITS.MIN_SEATS}
                      max={VALIDATION_LIMITS.MAX_SEATS}
                      step={1}
                      value={totalSeats}
                      onChange={(e) => {
                        setTotalSeats(e.target.value);
                        if (errors.totalSeats)
                          setErrors((prev) => ({ ...prev, totalSeats: undefined }));
                      }}
                      className={`h-11 w-full rounded-xl border bg-white pl-9 pr-3 font-mono text-sm text-[#0B192C] tabular-nums focus:outline-none dark:bg-slate-900 dark:text-slate-100 ${
                        errors.totalSeats
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-slate-200 focus:border-[#2563EB] dark:border-slate-700'
                      }`}
                    />
                  </div>
                  {errors.totalSeats && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      {errors.totalSeats}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="offer-fare"
                    className="block text-sm font-medium text-[#0B192C] dark:text-slate-200"
                  >
                    Est. Total Fare <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1.5 flex">
                    <select
                      aria-label="Currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                      className="h-11 rounded-l-xl border border-r-0 border-slate-200 bg-[#F8FAFC] px-2.5 text-xs font-semibold text-[#0B192C] focus:border-[#2563EB] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.symbol}
                        </option>
                      ))}
                    </select>
                    <input
                      id="offer-fare"
                      type="number"
                      min={0}
                      max={VALIDATION_LIMITS.MAX_FARE}
                      step="0.5"
                      value={estimatedTotalFare}
                      onChange={(e) => {
                        setEstimatedTotalFare(e.target.value);
                        if (errors.estimatedTotalFare)
                          setErrors((prev) => ({ ...prev, estimatedTotalFare: undefined }));
                      }}
                      placeholder="400"
                      className={`h-11 w-full rounded-r-xl border bg-white px-3 font-mono text-sm text-[#0B192C] tabular-nums placeholder:text-slate-400 focus:outline-none dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                        errors.estimatedTotalFare
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-slate-200 focus:border-[#2563EB] dark:border-slate-700'
                      }`}
                    />
                  </div>
                  {errors.estimatedTotalFare && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      {errors.estimatedTotalFare}
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                Displayed fares are estimates only. RIDEHUB does not process automated payments.
              </p>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* Private Contact Method & Optional Notes */}
            <div>
              <h2 className="font-display text-base font-bold text-[#0B192C] dark:text-white">
                03. Coordination Contact & Notes
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className="sm:col-span-5">
                  <label
                    htmlFor="offer-contact-method"
                    className="block text-sm font-medium text-[#0B192C] dark:text-slate-200"
                  >
                    Preferred Contact Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="offer-contact-method"
                    value={contactMethod}
                    onChange={(e) => setContactMethod(e.target.value as ContactMethod)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-[#0B192C] focus:border-[#2563EB] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {CONTACT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-7">
                  <label
                    htmlFor="offer-contact-value"
                    className="block text-sm font-medium text-[#0B192C] dark:text-slate-200"
                  >
                    Private Contact Detail <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="offer-contact-value"
                      type="text"
                      maxLength={VALIDATION_LIMITS.MAX_CONTACT_LEN}
                      value={contactValue}
                      onChange={(e) => {
                        setContactValue(e.target.value);
                        if (errors.contactValue)
                          setErrors((prev) => ({ ...prev, contactValue: undefined }));
                      }}
                      placeholder={selectedContactMeta.placeholder}
                      className={`h-11 w-full rounded-xl border bg-white pl-10 pr-3.5 text-sm text-[#0B192C] placeholder:text-slate-400 focus:outline-none dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                        errors.contactValue
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-slate-200 focus:border-[#2563EB] dark:border-slate-700'
                      }`}
                    />
                  </div>
                  {errors.contactValue ? (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      {errors.contactValue}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {selectedContactMeta.helper}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="offer-notes"
                    className="block text-sm font-medium text-[#0B192C] dark:text-slate-200"
                  >
                    Optional Travel Notes
                  </label>
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    {notes.length}/{VALIDATION_LIMITS.MAX_NOTES_LEN}
                  </span>
                </div>
                <textarea
                  id="offer-notes"
                  rows={3}
                  maxLength={VALIDATION_LIMITS.MAX_NOTES_LEN}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Sharing a pre-booked cab from HBTU East Gate. Space for 1 medium suitcase per rider."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-[#0B192C] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                {errors.notes && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.notes}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-stretch justify-between gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user
                  ? 'Your ride will be published immediately to Find a Ride.'
                  : 'Sign in with Google to publish and manage your ride.'}
              </p>
              <button
                type="submit"
                disabled={submitting || signingIn}
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-60 whitespace-nowrap"
              >
                {!user
                  ? signingIn
                    ? 'Signing In…'
                    : 'Sign In & Post Ride'
                  : submitting
                    ? 'Publishing Ride…'
                    : 'Publish Ride'}
              </button>
            </div>
          </form>

          {/* Right Column: Live Preview & Privacy Notice */}
          <aside className="space-y-5 lg:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0F172A]">
              <p className="text-xs font-semibold text-[#2563EB] dark:text-blue-400">
                Live Listing Preview
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pickup</p>
                  <p className="font-display text-base font-bold text-[#0B192C] dark:text-white">
                    {origin.trim() || 'HBTU Pickup Landmark'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Destination</p>
                  <p className="font-display text-base font-bold text-[#0B192C] dark:text-white">
                    {destination.trim() || 'Kanpur Transit Hub or Landmark'}
                  </p>
                </div>
              </div>

              <div className="my-4 h-px bg-slate-100 dark:bg-slate-800" />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Departure</p>
                  <p className="mt-0.5 font-semibold text-[#0B192C] dark:text-white">
                    {travelDate ? formatReadableDate(travelDate) : '—'}
                  </p>
                  <p className="font-mono text-xs text-slate-600 tabular-nums dark:text-slate-400">
                    {departureTime ? formatReadableTime(departureTime) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Open Seats</p>
                  <p className="mt-0.5 font-mono font-semibold text-[#0B192C] tabular-nums dark:text-white">
                    {previewSeats} {previewSeats === 1 ? 'seat' : 'seats'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {contactMethod} (private)
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-[#F8FAFC] p-4 dark:bg-[#0B1220]">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Est. total fare</span>
                  <span className="font-mono text-base font-bold text-[#0B192C] tabular-nums dark:text-white">
                    {previewFare > 0 ? formatMoney(previewFare, currency) : 'TBD'}
                  </span>
                </div>
                {previewFare > 0 && (
                  <div className="mt-1.5 flex items-baseline justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Est. share ({previewSeats + 1} riders incl. you)</span>
                    <span className="font-mono font-semibold text-[#2563EB] tabular-nums dark:text-blue-400">
                      ~{formatMoney(previewPerPerson, currency)}/person
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0F172A]">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className="h-5 w-5 text-[#2563EB] dark:text-blue-400"
                  aria-hidden="true"
                />
                <h3 className="font-display text-sm font-bold text-[#0B192C] dark:text-white">
                  Privacy Built In
                </h3>
              </div>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                <li>Your private contact detail is stored in a restricted subcollection.</li>
                <li>Other students only see your public first name and contact channel type.</li>
                <li>Contact details unlock exclusively after you accept a student’s join request.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Lock,
  MessageSquare,
  Plus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
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
import {
  acceptJoinRequest,
  cancelJoinRequest,
  cancelRide,
  completeRide,
  declineJoinRequest,
  fetchPrivateContact,
  fetchRideById,
  updateRideDetails,
} from '../firebase/rideService';
import {
  ContactMethod,
  CurrencyCode,
  DestinationCategory,
  JoinRequest,
  PageRoute,
  Ride,
  RideContact,
} from '../types/ride';

interface MyRidesPageProps {
  postedRides: Ride[];
  incomingRequests: JoinRequest[];
  outgoingRequests: JoinRequest[];
  loading: boolean;
  onNavigate: (page: PageRoute) => void;
}

type DashboardTab = 'posted' | 'requested' | 'cancelled';

interface PendingConfirm {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onExecute: () => Promise<void>;
}

export function MyRidesPage({
  postedRides,
  incomingRequests,
  outgoingRequests,
  loading,
  onNavigate,
}: MyRidesPageProps) {
  const { user, signInWithGoogle, signingIn } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<DashboardTab>('posted');
  const [confirmState, setConfirmState] = useState<PendingConfirm | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  // Live ride details & unlocked private contacts for requested rides
  const [requestedRideMap, setRequestedRideMap] = useState<Record<string, Ride | null>>({});
  const [unlockedContacts, setUnlockedContacts] = useState<Record<string, RideContact | null>>({});

  // Edit Ride modal state
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [editOrigin, setEditOrigin] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editCategory, setEditCategory] = useState<DestinationCategory>('railway');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editTotalSeats, setEditTotalSeats] = useState(1);
  const [editAvailableSeats, setEditAvailableSeats] = useState(1);
  const [editFare, setEditFare] = useState('0');
  const [editCurrency, setEditCurrency] = useState<CurrencyCode>('USD');
  const [editNotes, setEditNotes] = useState('');
  const [editContactMethod, setEditContactMethod] = useState<ContactMethod>('Campus Email');
  const [editContactValue, setEditContactValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch live parent ride documents + private contact for accepted outgoing requests
  useEffect(() => {
    if (!user || outgoingRequests.length === 0) {
      setRequestedRideMap({});
      setUnlockedContacts({});
      return;
    }
    let active = true;

    const loadDetails = async () => {
      const rideIds = Array.from(new Set(outgoingRequests.map((r) => r.rideId)));
      const rideEntries = await Promise.all(
        rideIds.map(async (id) => {
          try {
            const ride = await fetchRideById(id);
            return [id, ride] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      const liveRideById = Object.fromEntries(rideEntries);
      if (active) {
        setRequestedRideMap(liveRideById);
      }

      const acceptedRideIds = outgoingRequests
        .filter((r) => {
          if (r.status !== 'accepted') return false;
          const parent = liveRideById[r.rideId];
          return parent ? parent.status === 'active' || parent.status === 'full' : false;
        })
        .map((r) => r.rideId);

      if (acceptedRideIds.length === 0) {
        if (active) {
          setUnlockedContacts({});
        }
        return;
      }

      const contactEntries = await Promise.all(
        acceptedRideIds.map(async (id) => {
          try {
            const contact = await fetchPrivateContact(id);
            return [id, contact] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      if (active) {
        setUnlockedContacts(Object.fromEntries(contactEntries));
      }
    };

    void loadDetails();
    return () => {
      active = false;
    };
  }, [user, outgoingRequests]);

  const activePostedRides = useMemo(
    () => postedRides.filter((r) => r.status === 'active' || r.status === 'full'),
    [postedRides]
  );

  const cancelledOrPastPostedRides = useMemo(
    () => postedRides.filter((r) => r.status === 'cancelled' || r.status === 'completed'),
    [postedRides]
  );

  const activeOutgoingRequests = useMemo(
    () => outgoingRequests.filter((r) => r.status === 'pending' || r.status === 'accepted'),
    [outgoingRequests]
  );

  const cancelledOrDeclinedRequests = useMemo(
    () => outgoingRequests.filter((r) => r.status === 'cancelled' || r.status === 'declined'),
    [outgoingRequests]
  );

  const incomingByRideId = useMemo(() => {
    const map: Record<string, JoinRequest[]> = {};
    for (const req of incomingRequests) {
      if (!map[req.rideId]) map[req.rideId] = [];
      map[req.rideId].push(req);
    }
    return map;
  }, [incomingRequests]);

  const openEditModal = async (ride: Ride) => {
    setEditingRide(ride);
    setEditOrigin(ride.origin);
    setEditDestination(ride.destination);
    setEditCategory(ride.destinationCategory);
    setEditDate(ride.travelDate);
    setEditTime(ride.departureTime);
    setEditTotalSeats(ride.totalSeats);
    setEditAvailableSeats(ride.availableSeats);
    setEditFare(String(ride.estimatedTotalFare));
    setEditCurrency(ride.currency);
    setEditNotes(ride.notes);
    setEditContactMethod(ride.contactChannelLabel);
    setEditContactValue('');
    try {
      const contact = await fetchPrivateContact(ride.id);
      if (contact) {
        setEditContactMethod(contact.contactMethod);
        setEditContactValue(contact.contactValue);
      }
    } catch {
      // Keep default empty contact value
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRide) return;

    const today = getTodayLocalDateString();
    const trimmedOrigin = editOrigin.trim();
    const trimmedDest = editDestination.trim();
    const trimmedContact = editContactValue.trim();

    if (
      trimmedOrigin.length < VALIDATION_LIMITS.MIN_LOCATION_LEN ||
      trimmedOrigin.length > VALIDATION_LIMITS.MAX_LOCATION_LEN
    ) {
      showToast(
        'error',
        'Invalid origin',
        `Pickup landmark must be between ${VALIDATION_LIMITS.MIN_LOCATION_LEN} and ${VALIDATION_LIMITS.MAX_LOCATION_LEN} characters.`
      );
      return;
    }
    if (
      trimmedDest.length < VALIDATION_LIMITS.MIN_LOCATION_LEN ||
      trimmedDest.length > VALIDATION_LIMITS.MAX_LOCATION_LEN
    ) {
      showToast(
        'error',
        'Invalid destination',
        `Destination must be between ${VALIDATION_LIMITS.MIN_LOCATION_LEN} and ${VALIDATION_LIMITS.MAX_LOCATION_LEN} characters.`
      );
      return;
    }
    if (!VALIDATION_LIMITS.DATE_PATTERN.test(editDate) || editDate < today) {
      showToast('error', 'Invalid date', 'Departure date must be today or a future date.');
      return;
    }
    if (!VALIDATION_LIMITS.TIME_PATTERN.test(editTime)) {
      showToast('error', 'Invalid time', 'Enter a valid 24-hour departure time.');
      return;
    }
    if (editDate === today && editTime < getCurrentLocalTimeString()) {
      showToast('error', 'Invalid time', 'Departure time for today must be in the future.');
      return;
    }
    const parsedFare = Number(editFare);
    if (
      !Number.isFinite(parsedFare) ||
      parsedFare < VALIDATION_LIMITS.MIN_FARE ||
      parsedFare > VALIDATION_LIMITS.MAX_FARE
    ) {
      showToast(
        'error',
        'Invalid fare',
        `Estimated fare must be between 0 and ${VALIDATION_LIMITS.MAX_FARE.toLocaleString()}.`
      );
      return;
    }
    if (
      !Number.isInteger(editTotalSeats) ||
      editTotalSeats < VALIDATION_LIMITS.MIN_SEATS ||
      editTotalSeats > VALIDATION_LIMITS.MAX_SEATS ||
      !Number.isInteger(editAvailableSeats) ||
      editAvailableSeats > editTotalSeats ||
      editAvailableSeats < 0
    ) {
      showToast('error', 'Invalid seats', 'Available seats cannot exceed total seats.');
      return;
    }
    if (
      trimmedContact.length > 0 &&
      (trimmedContact.length < VALIDATION_LIMITS.MIN_CONTACT_LEN ||
        trimmedContact.length > VALIDATION_LIMITS.MAX_CONTACT_LEN)
    ) {
      showToast(
        'error',
        'Invalid contact detail',
        `Private contact must be between ${VALIDATION_LIMITS.MIN_CONTACT_LEN} and ${VALIDATION_LIMITS.MAX_CONTACT_LEN} characters.`
      );
      return;
    }

    setSavingEdit(true);
    try {
      await updateRideDetails(editingRide.id, {
        origin: editOrigin,
        destination: editDestination,
        destinationCategory: editCategory,
        travelDate: editDate,
        departureTime: editTime,
        totalSeats: editTotalSeats,
        availableSeats: editAvailableSeats,
        estimatedTotalFare: parsedFare,
        currency: editCurrency,
        notes: editNotes,
        contactMethod: editContactMethod,
        contactValue: editContactValue,
      });
      showToast('success', 'Ride updated', 'Your trip details have been saved.');
      setEditingRide(null);
    } catch (error) {
      showToast('error', 'Update failed', getFriendlyErrorMessage(error));
    } finally {
      setSavingEdit(false);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmState) return;
    setConfirmBusy(true);
    try {
      await confirmState.onExecute();
      setConfirmState(null);
    } catch (error) {
      showToast('error', 'Action failed', getFriendlyErrorMessage(error));
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleAcceptRequest = async (req: JoinRequest) => {
    setBusyActionId(req.id);
    try {
      await acceptJoinRequest(req);
      showToast(
        'success',
        'Seat request accepted',
        `${req.passengerName} is confirmed for ${req.seatsRequested} ${
          req.seatsRequested === 1 ? 'seat' : 'seats'
        }. Available seats updated safely.`
      );
    } catch (error) {
      showToast('error', 'Could not accept request', getFriendlyErrorMessage(error));
    } finally {
      setBusyActionId(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[75vh] bg-[#F8FAFC] px-4 py-20 transition-colors duration-200 dark:bg-[#090F1A] sm:px-6">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#0F172A]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400">
            <Users className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-[#0B192C] dark:text-white">
            Sign in to view My Rides
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Manage trips you have posted, review incoming student join requests, and track seats
            you have requested.
          </p>
          <button
            type="button"
            disabled={signingIn}
            onClick={async () => {
              try {
                await signInWithGoogle();
              } catch (error) {
                showToast('error', 'Sign-in failed', getFriendlyErrorMessage(error));
              }
            }}
            className="mt-6 inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-60"
          >
            {signingIn ? 'Signing In…' : 'Sign In with Google'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] bg-[#F8FAFC] pb-20 pt-8 transition-colors duration-200 dark:bg-[#090F1A] sm:pt-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0B192C] dark:text-white sm:text-3xl">
              My Rides
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
              Manage your posted trips, approve join requests, and track your seat reservations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('offer')}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] whitespace-nowrap"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Offer a Ride
          </button>
        </div>

        {/* Segmented Dashboard Tabs */}
        <div
          role="tablist"
          aria-label="My Rides sections"
          className="mt-6 inline-flex flex-wrap gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-900"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'posted'}
            onClick={() => setActiveTab('posted')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap tabular-nums ${
              activeTab === 'posted'
                ? 'bg-white text-[#0B192C] shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-[#0B192C] dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Posted Rides ({activePostedRides.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'requested'}
            onClick={() => setActiveTab('requested')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap tabular-nums ${
              activeTab === 'requested'
                ? 'bg-white text-[#0B192C] shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-[#0B192C] dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Requested Rides ({activeOutgoingRequests.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cancelled'}
            onClick={() => setActiveTab('cancelled')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap tabular-nums ${
              activeTab === 'cancelled'
                ? 'bg-white text-[#0B192C] shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-[#0B192C] dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Cancelled & Past ({cancelledOrPastPostedRides.length + cancelledOrDeclinedRequests.length})
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="mt-6 space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0F172A]"
              />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            {/* TAB 1: POSTED RIDES */}
            {activeTab === 'posted' && (
              <div className="space-y-5">
                {activePostedRides.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#0F172A]">
                    <h2 className="font-display text-lg font-bold text-[#0B192C] dark:text-white">
                      No active rides posted
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
                      Share your next trip to Kanpur Central, Chakeri Airport, or Jhakarkati ISBT so
                      other students can split the fare with you.
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigate('offer')}
                      className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
                    >
                      Offer a Ride
                    </button>
                  </div>
                ) : (
                  activePostedRides.map((ride) => {
                    const rideRequests = incomingByRideId[ride.id] ?? [];
                    const activeReqs = rideRequests.filter(
                      (r) => r.status === 'pending' || r.status === 'accepted'
                    );

                    return (
                      <article
                        key={ride.id}
                        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]"
                      >
                        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800 md:flex-row md:items-start">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span
                                className={`font-semibold ${
                                  ride.status === 'full'
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-emerald-700 dark:text-emerald-400'
                                }`}
                              >
                                {ride.status === 'full' ? 'Status: Full' : 'Status: Active'}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 font-medium text-[#0B192C] dark:text-slate-200">
                                <Calendar
                                  className="h-3.5 w-3.5 text-[#2563EB] dark:text-blue-400"
                                  aria-hidden="true"
                                />
                                {formatReadableDate(ride.travelDate)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 font-mono font-medium text-[#0B192C] tabular-nums dark:text-slate-200">
                                <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                {formatReadableTime(ride.departureTime)}
                              </span>
                            </div>

                            <h2 className="font-display text-lg font-bold text-[#0B192C] dark:text-white">
                              {ride.origin} → {ride.destination}
                            </h2>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 tabular-nums dark:text-slate-400">
                              <span className="inline-flex items-center gap-1.5 font-semibold text-[#0B192C] dark:text-slate-100">
                                <Users
                                  className="h-4 w-4 text-[#2563EB] dark:text-blue-400"
                                  aria-hidden="true"
                                />
                                {ride.availableSeats} of {ride.totalSeats} seats available
                              </span>
                              <span>
                                Est. total:{' '}
                                <strong className="font-mono text-[#0B192C] dark:text-white">
                                  {ride.estimatedTotalFare > 0
                                    ? formatMoney(ride.estimatedTotalFare, ride.currency)
                                    : 'TBD'}
                                </strong>
                              </span>
                              <span>Contact: {ride.contactChannelLabel}</span>
                            </div>
                          </div>

                          {/* Driver Ride Management Controls */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => void openEditModal(ride)}
                              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0B192C] transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                            >
                              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmState({
                                  title: 'Mark ride as completed?',
                                  description: `Mark "${ride.origin} → ${ride.destination}" as completed? This will archive the trip under Cancelled & Past.`,
                                  confirmLabel: 'Mark Completed',
                                  onExecute: async () => {
                                    await completeRide(ride.id);
                                    showToast('success', 'Ride marked completed');
                                  },
                                })
                              }
                              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Complete
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmState({
                                  title: 'Cancel this ride?',
                                  description: `Are you sure you want to cancel "${ride.origin} → ${ride.destination}"? Riders who requested seats will see that this trip is cancelled.`,
                                  confirmLabel: 'Cancel Ride',
                                  destructive: true,
                                  onExecute: async () => {
                                    await cancelRide(ride.id);
                                    showToast(
                                      'info',
                                      'Ride cancelled',
                                      'Your ride has been moved to Cancelled & Past.'
                                    );
                                  },
                                })
                              }
                              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 whitespace-nowrap dark:border-red-900/70 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40"
                            >
                              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              Cancel Ride
                            </button>
                          </div>
                        </div>

                        {/* Incoming Join Requests Section */}
                        <div className="mt-4">
                          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Incoming Join Requests ({activeReqs.length})
                          </h3>

                          {activeReqs.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                              No pending or confirmed passenger requests yet.
                            </p>
                          ) : (
                            <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-[#F8FAFC] dark:divide-slate-800 dark:border-slate-800 dark:bg-[#0B1220]">
                              {activeReqs.map((req) => {
                                const notEnoughSeats =
                                  req.status === 'pending' &&
                                  ride.availableSeats < req.seatsRequested;
                                const isBusy = busyActionId === req.id;

                                return (
                                  <div
                                    key={req.id}
                                    className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <span className="font-semibold text-[#0B192C] dark:text-white">
                                          {req.passengerName}
                                        </span>
                                        <span
                                          aria-hidden="true"
                                          className="text-slate-300 dark:text-slate-600"
                                        >
                                          ·
                                        </span>
                                        <span className="font-mono text-xs font-semibold text-[#0B192C] tabular-nums dark:text-slate-200">
                                          {req.seatsRequested}{' '}
                                          {req.seatsRequested === 1 ? 'seat' : 'seats'}
                                        </span>
                                        <span
                                          aria-hidden="true"
                                          className="text-slate-300 dark:text-slate-600"
                                        >
                                          ·
                                        </span>
                                        <span
                                          className={`text-xs font-semibold ${
                                            req.status === 'accepted'
                                              ? 'text-emerald-700 dark:text-emerald-400'
                                              : 'text-[#2563EB] dark:text-blue-400'
                                          }`}
                                        >
                                          {req.status === 'accepted'
                                            ? 'Confirmed Rider'
                                            : 'Pending Approval'}
                                        </span>
                                      </div>
                                      {req.note && (
                                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                          Note: “{req.note}”
                                        </p>
                                      )}
                                      {notEnoughSeats && (
                                        <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                                          Only {ride.availableSeats} seat(s) left — cannot accept{' '}
                                          {req.seatsRequested} seats.
                                        </p>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {req.status === 'pending' ? (
                                        <>
                                          <button
                                            type="button"
                                            disabled={notEnoughSeats || isBusy}
                                            onClick={() => void handleAcceptRequest(req)}
                                            className="inline-flex min-h-[38px] items-center justify-center rounded-xl bg-[#2563EB] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
                                          >
                                            {isBusy ? 'Confirming…' : 'Accept'}
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() =>
                                              setConfirmState({
                                                title: 'Decline join request?',
                                                description: `Decline ${req.passengerName}’s request for ${req.seatsRequested} seat(s)?`,
                                                confirmLabel: 'Decline Request',
                                                destructive: true,
                                                onExecute: async () => {
                                                  await declineJoinRequest(req.id);
                                                  showToast('info', 'Request declined');
                                                },
                                              })
                                            }
                                            className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                          >
                                            Decline
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setConfirmState({
                                              title: 'Release confirmed seat?',
                                              description: `Remove ${req.passengerName} from this ride and restore ${req.seatsRequested} available seat(s)?`,
                                              confirmLabel: 'Release Seat',
                                              destructive: true,
                                              onExecute: async () => {
                                                await cancelJoinRequest(req);
                                                showToast(
                                                  'info',
                                                  'Seat released',
                                                  'Available seats were restored automatically.'
                                                );
                                              },
                                            })
                                          }
                                          className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40"
                                        >
                                          Release Seat
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: REQUESTED RIDES */}
            {activeTab === 'requested' && (
              <div className="space-y-4">
                {activeOutgoingRequests.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#0F172A]">
                    <h2 className="font-display text-lg font-bold text-[#0B192C] dark:text-white">
                      No active ride requests
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
                      Browse available student rides and request a seat to coordinate your next
                      trip.
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigate('find')}
                      className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
                    >
                      Find a Ride
                    </button>
                  </div>
                ) : (
                  activeOutgoingRequests.map((req) => {
                    const liveRide = requestedRideMap[req.rideId];
                    const contact = unlockedContacts[req.rideId];
                    const rideCancelled = liveRide?.status === 'cancelled';
                    const rideCompleted = liveRide?.status === 'completed';

                    return (
                      <article
                        key={req.id}
                        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]"
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span
                                className={`font-semibold ${
                                  rideCancelled
                                    ? 'text-red-600 dark:text-red-400'
                                    : req.status === 'accepted'
                                      ? 'text-emerald-700 dark:text-emerald-400'
                                      : 'text-[#2563EB] dark:text-blue-400'
                                }`}
                              >
                                {rideCancelled
                                  ? 'Trip Status: Cancelled by Driver'
                                  : rideCompleted
                                    ? 'Trip Status: Completed'
                                    : req.status === 'accepted'
                                      ? 'Request Accepted · Seat Confirmed'
                                      : 'Request Pending Driver Approval'}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-medium text-[#0B192C] dark:text-slate-200">
                                {formatReadableDate(liveRide?.travelDate ?? req.rideSnapshotDate)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono font-medium text-[#0B192C] tabular-nums dark:text-slate-200">
                                {formatReadableTime(
                                  liveRide?.departureTime ?? req.rideSnapshotTime
                                )}
                              </span>
                            </div>

                            <h2 className="font-display text-lg font-bold text-[#0B192C] dark:text-white">
                              {liveRide?.origin ?? req.rideSnapshotOrigin} →{' '}
                              {liveRide?.destination ?? req.rideSnapshotDestination}
                            </h2>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 tabular-nums dark:text-slate-400">
                              <span>
                                Requested:{' '}
                                <strong className="font-mono text-[#0B192C] dark:text-white">
                                  {req.seatsRequested}{' '}
                                  {req.seatsRequested === 1 ? 'seat' : 'seats'}
                                </strong>
                              </span>
                              {liveRide && (
                                <span>
                                  Open seats on trip:{' '}
                                  <strong className="font-mono text-[#0B192C] dark:text-white">
                                    {liveRide.availableSeats} / {liveRide.totalSeats}
                                  </strong>
                                </span>
                              )}
                              <span>
                                Est. total:{' '}
                                <strong className="font-mono text-[#0B192C] dark:text-white">
                                  {(liveRide?.estimatedTotalFare ?? req.rideSnapshotFare) > 0
                                    ? formatMoney(
                                        liveRide?.estimatedTotalFare ?? req.rideSnapshotFare,
                                        liveRide?.currency ?? req.rideSnapshotCurrency
                                      )
                                    : 'TBD'}
                                </strong>
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setConfirmState({
                                title:
                                  req.status === 'accepted'
                                    ? 'Withdraw from this ride?'
                                    : 'Cancel join request?',
                                description:
                                  req.status === 'accepted'
                                    ? `Withdrawing will release your ${req.seatsRequested} confirmed seat(s) back to the driver so another student can join.`
                                    : 'Are you sure you want to cancel your pending seat request?',
                                confirmLabel:
                                  req.status === 'accepted'
                                    ? 'Withdraw & Release Seat'
                                    : 'Cancel Request',
                                destructive: true,
                                onExecute: async () => {
                                  await cancelJoinRequest(req);
                                  showToast(
                                    'info',
                                    req.status === 'accepted'
                                      ? 'Seat released'
                                      : 'Join request cancelled'
                                  );
                                },
                              })
                            }
                            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 whitespace-nowrap shrink-0 dark:border-red-900/70 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40"
                          >
                            {req.status === 'accepted' ? 'Withdraw Seat' : 'Cancel Request'}
                          </button>
                        </div>

                        {/* Unlocked Private Driver Contact for Accepted Riders on Active/Full Trips */}
                        {req.status === 'accepted' && !rideCancelled && !rideCompleted && (
                          <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#EFF6FF] p-4 dark:bg-blue-950/40">
                            <MessageSquare
                              className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB] dark:text-blue-400"
                              aria-hidden="true"
                            />
                            <div className="text-sm">
                              <p className="font-semibold text-[#0B192C] dark:text-white">
                                Driver Coordination Contact Unlocked
                              </p>
                              {contact ? (
                                <p className="mt-0.5 text-slate-700 dark:text-slate-300">
                                  {contact.contactMethod}:{' '}
                                  <span className="font-mono font-semibold text-[#2563EB] dark:text-blue-400">
                                    {contact.contactValue}
                                  </span>
                                </p>
                              ) : (
                                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                                  Loading driver’s contact details…
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {req.status === 'pending' && (
                          <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                            Driver’s private contact details will unlock here once your request is
                            accepted.
                          </p>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 3: CANCELLED & PAST */}
            {activeTab === 'cancelled' && (
              <div className="space-y-6">
                {cancelledOrPastPostedRides.length === 0 &&
                cancelledOrDeclinedRequests.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#0F172A]">
                    <h2 className="font-display text-lg font-bold text-[#0B192C] dark:text-white">
                      No cancelled or past rides
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      Cancelled trips, completed rides, and declined or withdrawn requests appear
                      here for your records.
                    </p>
                  </div>
                ) : (
                  <>
                    {cancelledOrPastPostedRides.length > 0 && (
                      <div>
                        <h2 className="font-display text-sm font-bold text-slate-700 dark:text-slate-300">
                          Your Cancelled & Completed Trips ({cancelledOrPastPostedRides.length})
                        </h2>
                        <div className="mt-3 space-y-3">
                          {cancelledOrPastPostedRides.map((ride) => (
                            <div
                              key={ride.id}
                              className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0F172A] sm:flex-row sm:items-center"
                            >
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  <span
                                    className={`font-semibold ${
                                      ride.status === 'cancelled'
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {ride.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                                  </span>
                                  <span aria-hidden="true"> · </span>
                                  <span>{formatReadableDate(ride.travelDate)}</span>
                                  <span aria-hidden="true"> · </span>
                                  <span className="font-mono tabular-nums">
                                    {formatReadableTime(ride.departureTime)}
                                  </span>
                                </p>
                                <p className="mt-1 font-display text-base font-bold text-[#0B192C] dark:text-white">
                                  {ride.origin} → {ride.destination}
                                </p>
                              </div>
                              <p className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                                {ride.availableSeats}/{ride.totalSeats} seats unused
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {cancelledOrDeclinedRequests.length > 0 && (
                      <div>
                        <h2 className="font-display text-sm font-bold text-slate-700 dark:text-slate-300">
                          Cancelled & Declined Join Requests ({cancelledOrDeclinedRequests.length})
                        </h2>
                        <div className="mt-3 space-y-3">
                          {cancelledOrDeclinedRequests.map((req) => (
                            <div
                              key={req.id}
                              className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0F172A] sm:flex-row sm:items-center"
                            >
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  <span className="font-semibold text-red-600 dark:text-red-400">
                                    {req.status === 'declined' ? 'Declined by Driver' : 'Cancelled'}
                                  </span>
                                  <span aria-hidden="true"> · </span>
                                  <span>{formatReadableDate(req.rideSnapshotDate)}</span>
                                  <span aria-hidden="true"> · </span>
                                  <span className="font-mono tabular-nums">
                                    {formatReadableTime(req.rideSnapshotTime)}
                                  </span>
                                </p>
                                <p className="mt-1 font-display text-base font-bold text-[#0B192C] dark:text-white">
                                  {req.rideSnapshotOrigin} → {req.rideSnapshotDestination}
                                </p>
                              </div>
                              <p className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                                {req.seatsRequested}{' '}
                                {req.seatsRequested === 1 ? 'seat' : 'seats'} requested
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Ride Modal */}
      {editingRide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/55 p-4 backdrop-blur-[2px] dark:bg-black/75"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-ride-title"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0F172A]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2
                id="edit-ride-title"
                className="font-display text-lg font-bold text-[#0B192C] dark:text-white"
              >
                Edit Trip Details
              </h2>
              <button
                type="button"
                onClick={() => setEditingRide(null)}
                aria-label="Close edit modal"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-origin"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Starting Landmark
                  </label>
                  <input
                    id="edit-origin"
                    type="text"
                    maxLength={VALIDATION_LIMITS.MAX_LOCATION_LEN}
                    value={editOrigin}
                    onChange={(e) => setEditOrigin(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#0B192C] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-dest"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Destination Landmark
                  </label>
                  <input
                    id="edit-dest"
                    type="text"
                    maxLength={VALIDATION_LIMITS.MAX_LOCATION_LEN}
                    value={editDestination}
                    onChange={(e) => setEditDestination(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#0B192C] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="edit-date"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Travel Date
                  </label>
                  <input
                    id="edit-date"
                    type="date"
                    min={getTodayLocalDateString()}
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#0B192C] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-time"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Departure Time
                  </label>
                  <input
                    id="edit-time"
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#0B192C] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label
                    htmlFor="edit-cat"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Category
                  </label>
                  <select
                    id="edit-cat"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as DestinationCategory)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#0B192C] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {DESTINATION_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="edit-total-seats"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Total Seats
                  </label>
                  <input
                    id="edit-total-seats"
                    type="number"
                    min={1}
                    max={8}
                    value={editTotalSeats}
                    onChange={(e) => {
                      const nextTotal = Math.max(1, Math.min(8, Number(e.target.value) || 1));
                      setEditTotalSeats(nextTotal);
                      if (editAvailableSeats > nextTotal) setEditAvailableSeats(nextTotal);
                    }}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm text-[#0B192C] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-avail-seats"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Available Seats
                  </label>
                  <input
                    id="edit-avail-seats"
                    type="number"
                    min={0}
                    max={editTotalSeats}
                    value={editAvailableSeats}
                    onChange={(e) =>
                      setEditAvailableSeats(
                        Math.max(0, Math.min(editTotalSeats, Number(e.target.value) || 0))
                      )
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm text-[#0B192C] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-fare"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Est. Fare ({editCurrency})
                  </label>
                  <div className="mt-1 flex">
                    <select
                      aria-label="Edit currency"
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value as CurrencyCode)}
                      className="h-10 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-[#0B192C] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.symbol}
                        </option>
                      ))}
                    </select>
                    <input
                      id="edit-fare"
                      type="number"
                      min={0}
                      step="0.5"
                      value={editFare}
                      onChange={(e) => setEditFare(e.target.value)}
                      className="h-10 w-full rounded-r-xl border border-slate-200 bg-white px-2.5 font-mono text-sm text-[#0B192C] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-method"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Contact Method
                  </label>
                  <select
                    id="edit-method"
                    value={editContactMethod}
                    onChange={(e) => setEditContactMethod(e.target.value as ContactMethod)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#0B192C] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {CONTACT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="edit-contact-val"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Private Contact Detail
                  </label>
                  <input
                    id="edit-contact-val"
                    type="text"
                    maxLength={VALIDATION_LIMITS.MAX_CONTACT_LEN}
                    value={editContactValue}
                    onChange={(e) => setEditContactValue(e.target.value)}
                    placeholder="Keep current or enter updated detail"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#0B192C] placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-notes"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Travel Notes
                </label>
                <textarea
                  id="edit-notes"
                  rows={2}
                  maxLength={VALIDATION_LIMITS.MAX_NOTES_LEN}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-[#0B192C] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRide(null)}
                  className="min-h-[40px] rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="min-h-[40px] rounded-xl bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
                >
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        confirmLabel={confirmState?.confirmLabel ?? 'Confirm'}
        destructive={confirmState?.destructive}
        busy={confirmBusy}
        onConfirm={() => void runConfirmedAction()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import {
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  Lock,
  MessageSquare,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import {
  DESTINATION_CATEGORIES,
  formatMoney,
  formatReadableDate,
  formatReadableTime,
  REPORT_REASONS,
  VALIDATION_LIMITS,
} from '../constants/validation';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getFriendlyErrorMessage } from '../firebase/errors';
import {
  fetchPrivateContact,
  requestToJoinRide,
  submitRideReport,
} from '../firebase/rideService';
import {
  CalculatorPrefill,
  JoinRequest,
  ReportReason,
  Ride,
  RideContact,
} from '../types/ride';

interface RideDetailsModalProps {
  ride: Ride | null;
  existingRequest?: JoinRequest;
  initialFocusJoin?: boolean;
  onClose: () => void;
  onOpenCalculator: (prefill: CalculatorPrefill) => void;
  onRequestSubmitted?: () => void;
}

export function RideDetailsModal({
  ride,
  existingRequest,
  initialFocusJoin = false,
  onClose,
  onOpenCalculator,
  onRequestSubmitted,
}: RideDetailsModalProps) {
  const { user, signInWithGoogle, signingIn } = useAuth();
  const { showToast } = useToast();

  const [seatsRequested, setSeatsRequested] = useState(1);
  const [joinNote, setJoinNote] = useState('');
  const [submittingJoin, setSubmittingJoin] = useState(false);

  const [privateContact, setPrivateContact] = useState<RideContact | null>(null);
  const [loadingContact, setLoadingContact] = useState(false);

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('inaccurate_details');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const isOwner = Boolean(user && ride && ride.driverId === user.uid);
  const isAccepted = existingRequest?.status === 'accepted';
  const canViewPrivateContact = Boolean(user && ride && (isOwner || isAccepted));

  useEffect(() => {
    if (!ride) return;
    setSeatsRequested(1);
    setJoinNote('');
    setShowReportForm(false);
    setReportDetails('');
    setPrivateContact(null);
  }, [ride]);

  useEffect(() => {
    if (!ride || !canViewPrivateContact) {
      setPrivateContact(null);
      setLoadingContact(false);
      return;
    }
    let active = true;
    setLoadingContact(true);
    fetchPrivateContact(ride.id)
      .then((contact) => {
        if (active) setPrivateContact(contact);
      })
      .catch(() => {
        if (active) setPrivateContact(null);
      })
      .finally(() => {
        if (active) setLoadingContact(false);
      });
    return () => {
      active = false;
    };
  }, [ride, canViewPrivateContact]);

  useEffect(() => {
    if (!ride) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [ride, onClose]);

  if (!ride) return null;

  const isFull = ride.availableSeats <= 0 || ride.status === 'full';
  const maxSelectableSeats = Math.min(
    VALIDATION_LIMITS.MAX_SEATS_PER_REQUEST,
    Math.max(1, ride.availableSeats)
  );
  const categoryLabel =
    DESTINATION_CATEGORIES.find((c) => c.value === ride.destinationCategory)?.label ?? 'Trip';
  const totalRidersFull = ride.totalSeats + 1;
  const estPerPersonFull =
    ride.estimatedTotalFare > 0 ? ride.estimatedTotalFare / totalRidersFull : 0;

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      try {
        await signInWithGoogle();
      } catch (error) {
        showToast('error', 'Sign-in required', getFriendlyErrorMessage(error));
      }
      return;
    }

    setSubmittingJoin(true);
    try {
      await requestToJoinRide(ride, user, seatsRequested, joinNote);
      showToast(
        'success',
        'Join request sent',
        `Requested ${seatsRequested} ${seatsRequested === 1 ? 'seat' : 'seats'} with ${ride.driverName}. Track status in My Rides.`
      );
      onRequestSubmitted?.();
      onClose();
    } catch (error) {
      showToast('error', 'Could not send request', getFriendlyErrorMessage(error));
    } finally {
      setSubmittingJoin(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('info', 'Sign in required', 'Please sign in with Google to report a listing.');
      return;
    }
    if (reportDetails.trim().length < VALIDATION_LIMITS.MIN_REPORT_DETAILS_LEN) {
      showToast('error', 'More detail needed', 'Please describe the issue (at least 5 characters).');
      return;
    }
    setSubmittingReport(true);
    try {
      await submitRideReport(ride.id, user, reportReason, reportDetails);
      showToast(
        'success',
        'Report submitted',
        'Thank you for helping keep RIDEHUB safe for students.'
      );
      setShowReportForm(false);
      setReportDetails('');
    } catch (error) {
      showToast('error', 'Report failed', getFriendlyErrorMessage(error));
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/55 p-4 backdrop-blur-[2px] dark:bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ride-details-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0F172A]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-[#0F172A]">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {categoryLabel} · {formatReadableDate(ride.travelDate)} ·{' '}
              <span className="font-mono tabular-nums">{formatReadableTime(ride.departureTime)}</span>
            </p>
            <h2
              id="ride-details-title"
              className="mt-0.5 font-display text-xl font-bold text-[#0B192C] dark:text-white"
            >
              Trip Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close trip details"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Route Block */}
          <div className="rounded-xl bg-[#F8FAFC] p-5 dark:bg-[#0B1220]">
            <div className="flex items-stretch gap-3.5">
              <div className="flex flex-col items-center py-1.5" aria-hidden="true">
                <span className="h-3 w-3 rounded-full border-2 border-[#2563EB] bg-white dark:border-blue-400 dark:bg-[#0B1220]" />
                <span className="my-1.5 w-px flex-1 bg-slate-300 dark:bg-slate-700" />
                <span className="h-3 w-3 rounded-full bg-[#0B192C] dark:bg-slate-100" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Public pickup landmark
                  </p>
                  <p className="font-display text-lg font-bold text-[#0B192C] dark:text-white">
                    {ride.origin}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Destination landmark</p>
                  <p className="font-display text-lg font-bold text-[#0B192C] dark:text-white">
                    {ride.destination}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-800 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Departure</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-[#0B192C] tabular-nums dark:text-white">
                  <Calendar className="h-4 w-4 text-[#2563EB] dark:text-blue-400" aria-hidden="true" />
                  {formatReadableDate(ride.travelDate)}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-slate-600 tabular-nums dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  {formatReadableTime(ride.departureTime)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Seat Availability</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-[#0B192C] tabular-nums dark:text-white">
                  <Users className="h-4 w-4 text-[#2563EB] dark:text-blue-400" aria-hidden="true" />
                  {ride.availableSeats} of {ride.totalSeats} available
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {isFull ? 'Currently full' : 'Open for requests'}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Estimated Total Fare</p>
                <p className="mt-0.5 font-mono text-base font-bold text-[#0B192C] tabular-nums dark:text-white">
                  {ride.estimatedTotalFare > 0
                    ? formatMoney(ride.estimatedTotalFare, ride.currency)
                    : 'Not specified'}
                </p>
                {ride.estimatedTotalFare > 0 && (
                  <p className="mt-0.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                    ~{formatMoney(estPerPersonFull, ride.currency)}/person if {totalRidersFull} split
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Driver & Notes */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Posted by{' '}
                <span className="font-semibold text-[#0B192C] dark:text-white">
                  {ride.driverName}
                </span>
                <span aria-hidden="true"> · </span>
                <span>Preferred channel: {ride.contactChannelLabel}</span>
              </div>
              {ride.estimatedTotalFare > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenCalculator({
                      totalFare: ride.estimatedTotalFare,
                      passengers: totalRidersFull,
                      currency: ride.currency,
                      routeLabel: `${ride.origin} → ${ride.destination}`,
                    });
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
                  Open in Fare Calculator
                </button>
              )}
            </div>

            {ride.notes ? (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Trip Notes</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {ride.notes}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No additional trip notes provided.
              </p>
            )}
          </div>

          {/* Private Contact Section (PII Isolated) */}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-start gap-3">
              {canViewPrivateContact ? (
                <MessageSquare
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB] dark:text-blue-400"
                  aria-hidden="true"
                />
              ) : (
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#0B192C] dark:text-white">
                  {canViewPrivateContact
                    ? 'Private Coordination Contact'
                    : 'Contact Details Protected'}
                </p>
                {canViewPrivateContact ? (
                  loadingContact ? (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Loading private contact…
                    </p>
                  ) : privateContact ? (
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-medium text-[#0B192C] dark:text-white">
                        {privateContact.contactMethod}:
                      </span>{' '}
                      <span className="font-mono text-sm text-[#2563EB] dark:text-blue-400">
                        {privateContact.contactValue}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Contact details unavailable.
                    </p>
                  )
                ) : (
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    To protect student privacy, the driver’s {ride.contactChannelLabel} contact is
                    never shown publicly and is revealed only after your join request is accepted.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Join Request Action Block */}
          {!isOwner && (
            <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
              {existingRequest ? (
                <div className="flex items-start gap-3 rounded-xl bg-[#EFF6FF] p-4 dark:bg-blue-950/40">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB] dark:text-blue-400"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#0B192C] dark:text-white">
                      {existingRequest.status === 'accepted'
                        ? `Seat Confirmed (${existingRequest.seatsRequested} ${
                            existingRequest.seatsRequested === 1 ? 'seat' : 'seats'
                          })`
                        : existingRequest.status === 'pending'
                          ? `Join Request Pending (${existingRequest.seatsRequested} ${
                              existingRequest.seatsRequested === 1 ? 'seat' : 'seats'
                            })`
                          : `Request Status: ${existingRequest.status}`}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      Manage or withdraw your request anytime from the My Rides dashboard.
                    </p>
                  </div>
                </div>
              ) : isFull || ride.status !== 'active' ? (
                <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                  This ride currently has no open seats available for new join requests.
                </div>
              ) : (
                <form onSubmit={handleJoinSubmit} className="space-y-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="sm:w-44">
                      <label
                        htmlFor="join-seats"
                        className="block text-sm font-medium text-[#0B192C] dark:text-slate-200"
                      >
                        Seats to Request
                      </label>
                      <select
                        id="join-seats"
                        autoFocus={initialFocusJoin}
                        value={seatsRequested}
                        onChange={(e) => setSeatsRequested(Number(e.target.value))}
                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-[#0B192C] focus:border-[#2563EB] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {Array.from({ length: maxSelectableSeats }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'seat' : 'seats'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1">
                      <label
                        htmlFor="join-note"
                        className="block text-sm font-medium text-[#0B192C] dark:text-slate-200"
                      >
                        Optional Note for Driver
                      </label>
                      <input
                        id="join-note"
                        type="text"
                        maxLength={VALIDATION_LIMITS.MAX_REQUEST_NOTE_LEN}
                        value={joinNote}
                        onChange={(e) => setJoinNote(e.target.value)}
                        placeholder="e.g., Carrying 1 backpack & small cabin bag"
                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-[#0B192C] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No payment is charged online. Fares are estimates split directly among riders.
                    </p>
                    <button
                      type="submit"
                      disabled={submittingJoin || signingIn}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      {!user
                        ? signingIn
                          ? 'Signing In…'
                          : 'Sign In to Request Seat'
                        : submittingJoin
                          ? 'Sending Request…'
                          : 'Send Join Request'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Safety Disclaimer & Report Ride */}
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <ShieldAlert className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                Meet at public landmarks. Student accounts are not ID-verified by RIDEHUB.
              </p>

              {!isOwner && (
                <button
                  type="button"
                  onClick={() => setShowReportForm((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-red-600 whitespace-nowrap dark:text-slate-400 dark:hover:text-red-400"
                >
                  <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  {showReportForm ? 'Cancel Report' : 'Report Ride'}
                </button>
              )}
            </div>

            {showReportForm && (
              <form
                onSubmit={handleReportSubmit}
                className="mt-4 space-y-3 rounded-xl border border-red-200 bg-red-50/40 p-4 dark:border-red-900/60 dark:bg-red-950/30"
              >
                <p className="text-sm font-semibold text-[#0B192C] dark:text-white">
                  Report this listing
                </p>
                <div>
                  <label
                    htmlFor="report-reason"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Reason
                  </label>
                  <select
                    id="report-reason"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value as ReportReason)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#0B192C] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="report-details"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Details (minimum 5 characters)
                  </label>
                  <textarea
                    id="report-details"
                    rows={2}
                    maxLength={VALIDATION_LIMITS.MAX_REPORT_DETAILS_LEN}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Share why this ride seems unsafe or inaccurate…"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-[#0B192C] placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="inline-flex min-h-[38px] items-center rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                  >
                    {submittingReport ? 'Submitting…' : 'Submit Safety Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

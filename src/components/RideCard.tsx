import React from 'react';
import { ArrowRight, Calendar, Clock, Users } from 'lucide-react';
import {
  DESTINATION_CATEGORIES,
  formatMoney,
  formatReadableDate,
  formatReadableTime,
} from '../constants/validation';
import { JoinRequest, Ride } from '../types/ride';

interface RideCardProps {
  ride: Ride;
  currentUserId?: string | null;
  existingRequest?: JoinRequest;
  onViewDetails: (ride: Ride) => void;
  onJoinClick: (ride: Ride) => void;
}

export function RideCard({
  ride,
  currentUserId,
  existingRequest,
  onViewDetails,
  onJoinClick,
}: RideCardProps) {
  const isOwner = Boolean(currentUserId && ride.driverId === currentUserId);
  const isFull = ride.availableSeats <= 0 || ride.status === 'full';
  const categoryLabel =
    DESTINATION_CATEGORIES.find((c) => c.value === ride.destinationCategory)?.label ?? 'Trip';

  // Estimated per-person split assuming full vehicle (totalSeats + driver = totalSeats + 1, or split across totalSeats passengers)
  const splitDivisor = Math.max(1, ride.totalSeats + 1);
  const estimatedPerPerson =
    ride.estimatedTotalFare > 0 ? ride.estimatedTotalFare / splitDivisor : 0;

  let joinButtonLabel = 'Join Ride';
  let joinDisabled = false;

  if (isOwner) {
    joinButtonLabel = 'Your Ride';
    joinDisabled = true;
  } else if (existingRequest?.status === 'accepted') {
    joinButtonLabel = 'Seat Confirmed';
    joinDisabled = true;
  } else if (existingRequest?.status === 'pending') {
    joinButtonLabel = 'Request Pending';
    joinDisabled = true;
  } else if (existingRequest?.status === 'declined') {
    joinButtonLabel = 'Declined';
    joinDisabled = true;
  } else if (existingRequest?.status === 'cancelled') {
    joinButtonLabel = 'Withdrawn';
    joinDisabled = true;
  } else if (isFull) {
    joinButtonLabel = 'Ride Full';
    joinDisabled = true;
  }

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/5 dark:border-slate-800 dark:bg-[#0F172A] dark:hover:border-slate-700 dark:hover:shadow-black/30">
      <div>
        {/* Top quiet unboxed metadata line */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-medium text-[#0B192C] dark:text-slate-100">
              <Calendar className="h-3.5 w-3.5 text-[#2563EB] dark:text-blue-400" aria-hidden="true" />
              {formatReadableDate(ride.travelDate)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-mono font-medium text-[#0B192C] tabular-nums dark:text-slate-100">
              <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              {formatReadableTime(ride.departureTime)}
            </span>
          </div>
          <span className="text-slate-500 dark:text-slate-400">{categoryLabel}</span>
        </div>

        {/* Route Display */}
        <div className="mt-4 flex items-stretch gap-3">
          <div className="flex flex-col items-center py-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-[#2563EB] bg-white dark:border-blue-400 dark:bg-[#0F172A]" />
            <span className="my-1 w-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#0B192C] dark:bg-slate-100" />
          </div>
          <div className="min-w-0 flex-1 space-y-2.5">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pickup landmark</p>
              <h3 className="truncate font-display text-base font-bold text-[#0B192C] dark:text-white">
                {ride.origin}
              </h3>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Destination</p>
              <p className="truncate font-display text-base font-bold text-[#0B192C] dark:text-white">
                {ride.destination}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-4 h-px bg-slate-100 dark:bg-slate-800" />

        {/* Seats & Fare Row */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
              <Users
                className={`h-4 w-4 ${
                  isFull ? 'text-slate-400 dark:text-slate-500' : 'text-[#2563EB] dark:text-blue-400'
                }`}
                aria-hidden="true"
              />
              <span
                className={
                  isFull
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-[#0B192C] dark:text-slate-100'
                }
              >
                {isFull
                  ? 'Full · 0 seats left'
                  : `${ride.availableSeats} of ${ride.totalSeats} ${
                      ride.availableSeats === 1 ? 'seat' : 'seats'
                    } left`}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Posted by{' '}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {ride.driverName}
              </span>
              <span aria-hidden="true"> · </span>
              <span>{ride.contactChannelLabel}</span>
            </p>
          </div>

          <div className="text-right">
            {ride.estimatedTotalFare > 0 ? (
              <>
                <p className="font-mono text-lg font-bold text-[#0B192C] tabular-nums dark:text-white">
                  {formatMoney(ride.estimatedTotalFare, ride.currency)}
                </p>
                <p className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
                  Est. total · ~{formatMoney(estimatedPerPerson, ride.currency)}/rider
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-sm font-semibold text-[#0B192C] dark:text-white">
                  Fare TBD
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Coordinate split</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onViewDetails(ride)}
          className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-[#0B192C] transition-colors hover:border-slate-300 hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
          View Details
        </button>

        <button
          type="button"
          disabled={joinDisabled}
          onClick={() => onJoinClick(ride)}
          className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
            joinDisabled
              ? 'cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              : 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
          }`}
        >
          <span>{joinButtonLabel}</span>
          {!joinDisabled && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </article>
  );
}

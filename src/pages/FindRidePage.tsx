import React, { useMemo, useState } from 'react';
import { Calendar, Clock, MapPin, RotateCcw, Search, Users } from 'lucide-react';
import { RideCard } from '../components/RideCard';
import {
  DESTINATION_CATEGORIES,
  getTodayLocalDateString,
  matchesTimeWindow,
  TIME_WINDOWS,
  VALIDATION_LIMITS,
} from '../constants/validation';
import {
  DestinationCategory,
  JoinRequest,
  PageRoute,
  Ride,
  RideFilters,
  TimeWindowFilter,
} from '../types/ride';

interface FindRidePageProps {
  rides: Ride[];
  loading: boolean;
  filters: RideFilters;
  onFiltersChange: (next: RideFilters) => void;
  currentUserId?: string | null;
  userRequestsByRideId: Record<string, JoinRequest>;
  onViewRideDetails: (ride: Ride, focusJoin?: boolean) => void;
  onNavigate: (page: PageRoute) => void;
}

type SortOption = 'soonest' | 'lowest-fare' | 'most-seats';

export function FindRidePage({
  rides,
  loading,
  filters,
  onFiltersChange,
  currentUserId,
  userRequestsByRideId,
  onViewRideDetails,
  onNavigate,
}: FindRidePageProps) {
  const [draftOrigin, setDraftOrigin] = useState(filters.origin);
  const [draftDestination, setDraftDestination] = useState(filters.destination);
  const [draftDate, setDraftDate] = useState(filters.date);
  const [draftTimeWindow, setDraftTimeWindow] = useState<TimeWindowFilter>(filters.timeWindow);
  const [draftMinSeats, setDraftMinSeats] = useState<number>(filters.minSeats);
  const [sortBy, setSortBy] = useState<SortOption>('soonest');

  // Sync local draft inputs when external navigation updates filters (e.g. from Popular Destinations)
  React.useEffect(() => {
    setDraftOrigin(filters.origin);
    setDraftDestination(filters.destination);
    setDraftDate(filters.date);
    setDraftTimeWindow(filters.timeWindow);
    setDraftMinSeats(filters.minSeats);
  }, [filters.origin, filters.destination, filters.date, filters.timeWindow, filters.minSeats]);

  const today = getTodayLocalDateString();

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({
      ...filters,
      origin: draftOrigin.trim(),
      destination: draftDestination.trim(),
      date: draftDate,
      timeWindow: draftTimeWindow,
      minSeats: draftMinSeats,
    });
  };

  const clearAllFilters = () => {
    const empty: RideFilters = {
      origin: '',
      destination: '',
      date: '',
      timeWindow: 'any',
      minSeats: 0,
      category: 'all',
    };
    setDraftOrigin('');
    setDraftDestination('');
    setDraftDate('');
    setDraftTimeWindow('any');
    setDraftMinSeats(0);
    onFiltersChange(empty);
  };

  const hasActiveFilters = Boolean(
    filters.origin ||
      filters.destination ||
      filters.date ||
      filters.timeWindow !== 'any' ||
      filters.minSeats > 0 ||
      filters.category !== 'all'
  );

  const filteredRides = useMemo(() => {
    const originQuery = filters.origin.toLowerCase();
    const destQuery = filters.destination.toLowerCase();

    const matched = rides.filter((ride) => {
      if (originQuery && !ride.origin.toLowerCase().includes(originQuery)) {
        return false;
      }
      if (destQuery && !ride.destination.toLowerCase().includes(destQuery)) {
        return false;
      }
      if (filters.date && ride.travelDate !== filters.date) {
        return false;
      }
      if (!matchesTimeWindow(ride.departureTime, filters.timeWindow)) {
        return false;
      }
      if (filters.minSeats > 0 && ride.availableSeats < filters.minSeats) {
        return false;
      }
      if (filters.category !== 'all' && ride.destinationCategory !== filters.category) {
        return false;
      }
      return true;
    });

    return [...matched].sort((a, b) => {
      if (sortBy === 'lowest-fare') {
        const fareA = a.estimatedTotalFare > 0 ? a.estimatedTotalFare : Number.MAX_SAFE_INTEGER;
        const fareB = b.estimatedTotalFare > 0 ? b.estimatedTotalFare : Number.MAX_SAFE_INTEGER;
        return fareA - fareB;
      }
      if (sortBy === 'most-seats') {
        return b.availableSeats - a.availableSeats;
      }
      return `${a.travelDate}T${a.departureTime}`.localeCompare(
        `${b.travelDate}T${b.departureTime}`
      );
    });
  }, [rides, filters, sortBy]);

  return (
    <div className="min-h-[75vh] bg-[#F8FAFC] pb-20 transition-colors duration-200 dark:bg-[#090F1A]">
      {/* Header & Search Panel */}
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0B1220]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0B192C] dark:text-white sm:text-3xl">
                Find a Ride
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                Search student trips by pickup landmark, Kanpur destination, departure window, and
                open seats.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('offer')}
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0B192C] transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-[#0F172A] dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Offer a Ride Instead
            </button>
          </div>

          {/* Filter Form */}
          <form onSubmit={applySearch} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <label
                  htmlFor="filter-origin"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Starting Location
                </label>
                <div className="relative mt-1">
                  <MapPin
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="filter-origin"
                    type="text"
                    maxLength={VALIDATION_LIMITS.MAX_LOCATION_LEN}
                    value={draftOrigin}
                    onChange={(e) => setDraftOrigin(e.target.value)}
                    placeholder="e.g., HBTU East Campus Gate"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-9 pr-3 text-sm text-[#0B192C] placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-[#0F172A]"
                  />
                </div>
              </div>

              <div className="lg:col-span-3">
                <label
                  htmlFor="filter-destination"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Destination
                </label>
                <div className="relative mt-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="filter-destination"
                    type="text"
                    maxLength={VALIDATION_LIMITS.MAX_LOCATION_LEN}
                    value={draftDestination}
                    onChange={(e) => setDraftDestination(e.target.value)}
                    placeholder="e.g., Kanpur Central, Chakeri Airport"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-9 pr-3 text-sm text-[#0B192C] placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-[#0F172A]"
                  />
                </div>
              </div>

              <div className="lg:col-span-2">
                <label
                  htmlFor="filter-date"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Travel Date
                </label>
                <div className="relative mt-1">
                  <Calendar
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="filter-date"
                    type="date"
                    min={today}
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-9 pr-2.5 text-sm text-[#0B192C] focus:border-[#2563EB] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-[#0F172A]"
                  />
                </div>
              </div>

              <div className="lg:col-span-2">
                <label
                  htmlFor="filter-time"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Departure Time
                </label>
                <div className="relative mt-1">
                  <Clock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <select
                    id="filter-time"
                    value={draftTimeWindow}
                    onChange={(e) => setDraftTimeWindow(e.target.value as TimeWindowFilter)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-9 pr-3 text-sm text-[#0B192C] focus:border-[#2563EB] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-[#0F172A]"
                  >
                    {TIME_WINDOWS.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="lg:col-span-2">
                <label
                  htmlFor="filter-seats"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Available Seats
                </label>
                <div className="relative mt-1">
                  <Users
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <select
                    id="filter-seats"
                    value={draftMinSeats}
                    onChange={(e) => setDraftMinSeats(Number(e.target.value))}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-9 pr-3 text-sm text-[#0B192C] focus:border-[#2563EB] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-[#0F172A]"
                  >
                    <option value={0}>Any seats</option>
                    <option value={1}>1+ seats left</option>
                    <option value={2}>2+ seats left</option>
                    <option value={3}>3+ seats left</option>
                    <option value={4}>4+ seats left</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category Tabs + Search / Clear Actions */}
            <div className="flex flex-col items-stretch justify-between gap-3 pt-1 md:flex-row md:items-center">
              <div
                role="tablist"
                aria-label="Filter by destination type"
                className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={filters.category === 'all'}
                  onClick={() => onFiltersChange({ ...filters, category: 'all' })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    filters.category === 'all'
                      ? 'bg-white text-[#0B192C] shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-[#0B192C] dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  All Routes
                </button>
                {DESTINATION_CATEGORIES.filter((c) => c.value !== 'other').map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    role="tab"
                    aria-selected={filters.category === cat.value}
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        category: cat.value as DestinationCategory,
                      })
                    }
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      filters.category === cat.value
                        ? 'bg-white text-[#0B192C] shadow-sm dark:bg-slate-800 dark:text-white'
                        : 'text-slate-600 hover:text-[#0B192C] dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  disabled={!hasActiveFilters && !draftOrigin && !draftDestination && !draftDate}
                  className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Clear Filters
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] whitespace-nowrap"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Results List */}
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm font-medium text-slate-600 tabular-nums dark:text-slate-400">
            {loading
              ? 'Loading available trips…'
              : `Showing ${filteredRides.length} ${
                  filteredRides.length === 1 ? 'ride' : 'rides'
                }${hasActiveFilters ? ' matching your filters' : ''}`}
          </p>

          <div className="flex items-center gap-2">
            <label
              htmlFor="sort-rides"
              className="text-xs font-medium text-slate-500 dark:text-slate-400"
            >
              Sort by
            </label>
            <select
              id="sort-rides"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-[#0B192C] focus:border-[#2563EB] focus:outline-none dark:border-slate-700 dark:bg-[#0F172A] dark:text-slate-100"
            >
              <option value="soonest">Soonest Departure</option>
              <option value="lowest-fare">Lowest Est. Fare</option>
              <option value="most-seats">Most Seats Available</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0F172A]"
              >
                <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-6 space-y-3">
                  <div className="h-5 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-5 w-3/5 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="mt-12 flex justify-between">
                  <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredRides.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredRides.map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                currentUserId={currentUserId}
                existingRequest={userRequestsByRideId[ride.id]}
                onViewDetails={(r) => onViewRideDetails(r, false)}
                onJoinClick={(r) => onViewRideDetails(r, true)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-[#0F172A]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Search className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-[#0B192C] dark:text-white">
              {hasActiveFilters ? 'No rides match these filters' : 'No active rides posted yet'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {hasActiveFilters
                ? 'Try widening your departure window, clearing the travel date, or posting your own planned trip for this route.'
                : 'Be the first student to post an upcoming ride from HBTU Kanpur to a station, airport, or bus hub.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-[#0B192C] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Clear All Filters
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigate('offer')}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
              >
                Offer a Ride
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

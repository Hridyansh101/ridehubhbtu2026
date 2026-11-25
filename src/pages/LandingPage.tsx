import React, { useState } from 'react';
import {
  ArrowRight,
  Calculator,
  Car,
  Check,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { RideCard } from '../components/RideCard';
import {
  HERO_IMAGE_PATH,
  POPULAR_DESTINATIONS,
} from '../constants/validation';
import { DestinationCategory, JoinRequest, PageRoute, Ride } from '../types/ride';

interface LandingPageProps {
  rides: Ride[];
  loadingRides: boolean;
  currentUserId?: string | null;
  userRequestsByRideId: Record<string, JoinRequest>;
  onNavigate: (page: PageRoute) => void;
  onQuickSearch: (params: {
    origin?: string;
    destination?: string;
    date?: string;
    category?: DestinationCategory | 'all';
  }) => void;
  onViewRideDetails: (ride: Ride, focusJoin?: boolean) => void;
}

export function LandingPage({
  rides,
  loadingRides,
  currentUserId,
  userRequestsByRideId,
  onNavigate,
  onQuickSearch,
  onViewRideDetails,
}: LandingPageProps) {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [failedDestImages, setFailedDestImages] = useState<Record<string, boolean>>({});

  const recentRides = rides.slice(0, 3);

  return (
    <div className="bg-white transition-colors duration-200 dark:bg-[#090F1A]">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-[#F8FAFC] to-white dark:border-slate-800/80 dark:from-[#0D1526] dark:to-[#090F1A]">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-20 lg:pt-20">
          <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left Copy & CTAs */}
            <div className="flex flex-col justify-center lg:col-span-6">
              <p className="text-sm font-semibold text-[#2563EB] dark:text-blue-400">
                RIDEHUB · HBTU Kanpur Campus Carpool Network
              </p>
              <h1
                className="mt-3 font-display font-extrabold tracking-tight text-[#0B192C] text-balance dark:text-white"
                style={{ fontSize: 'clamp(2.25rem, 4.1vw, 3.65rem)', lineHeight: 1.08 }}
              >
                Your Journey. Their Journey. One Shared Ride.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
                Connect with fellow students travelling your way. Share seats, split fares, and
                make every journey across Kanpur more affordable.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => onNavigate('find')}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-all duration-200 hover:bg-[#1D4ED8] whitespace-nowrap"
                >
                  Find a Ride
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('offer')}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-[#0B192C] transition-colors duration-200 hover:border-slate-400 hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-[#0F172A] dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                >
                  Offer a Ride
                </button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Public HBTU campus landmarks</span>
                <span aria-hidden="true">·</span>
                <span>Transparent fare estimates</span>
                <span aria-hidden="true">·</span>
                <span>Zero platform fees</span>
              </div>
            </div>

            {/* Right Visual — HBTU Kanpur Shatabdi Bhawan */}
            <div className="lg:col-span-6">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-lg shadow-slate-900/8 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40 lg:aspect-auto lg:h-full lg:min-h-[390px]">
                {!heroImgFailed ? (
                  <img
                    src={HERO_IMAGE_PATH}
                    alt="Shatabdi Bhawan at HBTU Kanpur at golden hour"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#0B192C] to-[#1E3A5F] p-8 text-center text-white">
                    <Car className="h-12 w-12 text-blue-300" aria-hidden="true" />
                    <p className="mt-3 font-display text-lg font-bold">
                      Share Your Ride, Split Your Fare.
                    </p>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B192C]/85 via-[#0B192C]/35 to-transparent p-5">
                  <p className="text-xs font-medium text-blue-200">
                    HBTU Kanpur · Shatabdi Bhawan
                  </p>
                  <p className="mt-0.5 font-display text-sm font-semibold text-white">
                    Kanpur Central · Chakeri Airport · Jhakarkati ISBT · Civil Lines
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POPULAR KANPUR DESTINATIONS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#0B192C] dark:text-white sm:text-3xl">
              Popular Kanpur Destinations
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
              Select a Kanpur transit hub or city landmark to browse students heading there next.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('find')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] transition-colors hover:text-[#1D4ED8] whitespace-nowrap dark:text-blue-400 dark:hover:text-blue-300"
          >
            Explore all destinations
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {POPULAR_DESTINATIONS.map((dest) => (
            <button
              key={dest.id}
              type="button"
              onClick={() => onQuickSearch({ category: dest.category, destination: '' })}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/10 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:shadow-black/40"
            >
              <div className="aspect-[4/3] w-full overflow-hidden">
                {!failedDestImages[dest.id] ? (
                  <img
                    src={dest.image}
                    alt={dest.name}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedDestImages((prev) => ({ ...prev, [dest.id]: true }))
                    }
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0B192C] to-[#1E3A5F]">
                    <MapPin className="h-8 w-8 text-blue-300" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B192C]/92 via-[#0B192C]/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="font-display text-base font-bold leading-snug text-white">
                  {dest.name}
                </h3>
                <p className="mt-0.5 text-xs text-slate-200">{dest.subtitle}</p>
                <p className="mt-2 text-xs font-medium text-blue-200">{dest.typicalSplit}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* RECENTLY POSTED RIDES */}
      <section className="border-y border-slate-200/80 bg-[#F8FAFC] dark:border-slate-800/80 dark:bg-[#0B1220]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-[#0B192C] dark:text-white sm:text-3xl">
                Recently Posted Rides
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                Upcoming student departures synced live from RIDEHUB.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('offer')}
                className="text-sm font-semibold text-slate-700 transition-colors hover:text-[#0B192C] whitespace-nowrap dark:text-slate-300 dark:hover:text-white"
              >
                Post a Trip
              </button>
              <button
                type="button"
                onClick={() => onNavigate('find')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] transition-colors hover:text-[#1D4ED8] whitespace-nowrap dark:text-blue-400 dark:hover:text-blue-300"
              >
                View All Rides
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {loadingRides ? (
            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0F172A]"
                >
                  <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-6 space-y-3">
                    <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <div className="mt-10 flex justify-between">
                    <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-6 w-16 rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentRides.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {recentRides.map((ride) => (
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
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#0F172A]">
              <h3 className="font-display text-lg font-bold text-[#0B192C] dark:text-white">
                No upcoming rides posted yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
                Heading to Kanpur Central, Chakeri Airport, or Jhakarkati ISBT soon? Post your
                planned trip so fellow students can share the ride and split the fare.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('offer')}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
                >
                  Offer the First Ride
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('calculator')}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-[#0B192C] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <Calculator className="h-4 w-4 text-[#2563EB] dark:text-blue-400" aria-hidden="true" />
                  Estimate a Fare Split
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#0B192C] dark:text-white sm:text-3xl">
            How RIDEHUB Works
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            Simple coordination built around campus schedules and transparent cost sharing.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="border-t-2 border-[#2563EB] pt-5 dark:border-blue-500">
            <p className="font-mono text-xs font-semibold text-[#2563EB] dark:text-blue-400">01</p>
            <h3 className="mt-2 font-display text-lg font-bold text-[#0B192C] dark:text-white">
              Post or Browse Trips
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Share your departure time, public HBTU pickup landmark, Kanpur destination, and open
              seats—or filter upcoming rides heading to your terminal.
            </p>
          </div>

          <div className="border-t-2 border-slate-200 pt-5 dark:border-slate-800">
            <p className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">02</p>
            <h3 className="mt-2 font-display text-lg font-bold text-[#0B192C] dark:text-white">
              Request & Confirm Seats
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Send a join request for the seats you need. When the driver accepts, available seats
              update atomically and private coordination contact is revealed.
            </p>
          </div>

          <div className="border-t-2 border-slate-200 pt-5 dark:border-slate-800">
            <p className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">03</p>
            <h3 className="mt-2 font-display text-lg font-bold text-[#0B192C] dark:text-white">
              Meet Publicly & Split Fare
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Meet at recognizable campus gates or transit plazas and settle your estimated fare
              split directly among riders—no middleman surcharges.
            </p>
          </div>
        </div>
      </section>

      {/* BENEFITS + SAFETY & PRIVACY */}
      <section className="border-t border-slate-200/80 bg-[#F8FAFC] dark:border-slate-800/80 dark:bg-[#0B1220]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Benefits */}
            <div className="lg:col-span-6">
              <h2 className="font-display text-2xl font-bold tracking-tight text-[#0B192C] dark:text-white">
                Why Students Share Rides
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
                Solo cabs to Kanpur Central or Chakeri Airport add up fast during semester breaks
                and weekend trips. Sharing seats makes practical sense.
              </p>

              <ul className="mt-6 space-y-4">
                {[
                  {
                    title: 'Cut individual travel costs',
                    desc: 'Splitting a 4-seat cab or fuel estimate across fellow students dramatically lowers per-person travel expenses.',
                  },
                  {
                    title: 'Put empty seats to better use',
                    desc: 'Students already driving or booking cabs to stations and airports fill spare seats instead of travelling solo.',
                  },
                  {
                    title: 'Plan splits before committing',
                    desc: 'Use the built-in Fare Split Calculator to see each passenger’s estimated share and savings over solo travel.',
                  },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/70 dark:text-blue-400">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#0B192C] dark:text-white">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {item.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                <button
                  type="button"
                  onClick={() => onNavigate('calculator')}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#0B192C] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0F172A] dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <Calculator className="h-4 w-4 text-[#2563EB] dark:text-blue-400" aria-hidden="true" />
                  Try the Fare Split Calculator
                </button>
              </div>
            </div>

            {/* Safety & Privacy */}
            <div className="lg:col-span-6">
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0F172A] sm:p-8">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck
                    className="h-5 w-5 text-[#2563EB] dark:text-blue-400"
                    aria-hidden="true"
                  />
                  <h2 className="font-display text-xl font-bold text-[#0B192C] dark:text-white">
                    Safety & Privacy Guidelines
                  </h2>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  RIDEHUB is designed around student privacy and honest transparency. Please follow
                  these safeguards on every trip:
                </p>

                <ul className="mt-5 space-y-3.5 text-sm text-slate-700 dark:text-slate-300">
                  <li className="border-b border-slate-100 pb-3 dark:border-slate-800">
                    <span className="font-semibold text-[#0B192C] dark:text-white">
                      Public landmarks only:
                    </span>{' '}
                    Never post exact home or hostel room addresses. Use HBTU gates, Shatabdi
                    Bhawan, or main station entrances.
                  </li>
                  <li className="border-b border-slate-100 pb-3 dark:border-slate-800">
                    <span className="font-semibold text-[#0B192C] dark:text-white">
                      Private contact isolation:
                    </span>{' '}
                    Your phone number, handle, or email is never displayed publicly and unlocks
                    only for passengers you accept.
                  </li>
                  <li className="border-b border-slate-100 pb-3 dark:border-slate-800">
                    <span className="font-semibold text-[#0B192C] dark:text-white">
                      Estimates only, no automated payments:
                    </span>{' '}
                    Displayed fares are non-binding estimates to help riders plan. Confirm the
                    split directly with your group.
                  </li>
                  <li>
                    <span className="font-semibold text-[#0B192C] dark:text-white">
                      Independent discretion & reporting:
                    </span>{' '}
                    RIDEHUB does not independently verify student IDs. Share your trip itinerary
                    with a friend and use the Report Ride option on any listing that looks unsafe.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

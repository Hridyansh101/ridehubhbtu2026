import React from 'react';
import { PageRoute } from '../types/ride';

interface FooterProps {
  onNavigate: (page: PageRoute) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const scrollToAndNavigate = (page: PageRoute) => {
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-slate-200 bg-[#F8FAFC] transition-colors duration-200 dark:border-slate-800 dark:bg-[#0B1220]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <button
              type="button"
              onClick={() => scrollToAndNavigate('home')}
              className="inline-flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-[#0B192C] dark:text-white"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#2563EB] text-xs font-extrabold text-white"
              >
                R
              </span>
              RIDEHUB
            </button>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Campus Carpool Network for HBTU & Kanpur students — Share Your Ride, Split Your Fare.
              Coordinate affordable shared trips to Kanpur Central, Chakeri Airport, Jhakarkati
              ISBT, and city destinations.
            </p>
          </div>

          <div className="md:col-span-3">
            <h3 className="text-sm font-semibold text-[#0B192C] dark:text-white">Platform</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => scrollToAndNavigate('find')}
                  className="transition-colors hover:text-[#2563EB] dark:hover:text-blue-400"
                >
                  Find a Ride
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToAndNavigate('offer')}
                  className="transition-colors hover:text-[#2563EB] dark:hover:text-blue-400"
                >
                  Offer a Ride
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToAndNavigate('calculator')}
                  className="transition-colors hover:text-[#2563EB] dark:hover:text-blue-400"
                >
                  Fare Split Calculator
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToAndNavigate('my-rides')}
                  className="transition-colors hover:text-[#2563EB] dark:hover:text-blue-400"
                >
                  My Rides Dashboard
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h3 className="text-sm font-semibold text-[#0B192C] dark:text-white">
              Safety & Transparency
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <li>Use public campus gates and recognizable transit landmarks only.</li>
              <li>Personal contact details remain hidden until a driver accepts a request.</li>
              <li>All displayed fares are estimates; RIDEHUB does not process automated payments.</li>
              <li>Accounts are not independently identity-verified; meet in well-lit public areas.</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} RIDEHUB – Campus Carpool Network.</p>
          <p>Share Your Ride, Split Your Fare.</p>
        </div>
      </div>
    </footer>
  );
}

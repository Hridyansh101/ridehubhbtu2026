import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Menu, Moon, Sun, User as UserIcon, X } from 'lucide-react';
import { sanitizePublicDisplayName } from '../constants/validation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { getFriendlyErrorMessage } from '../firebase/errors';
import { PageRoute } from '../types/ride';

interface NavbarProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  pendingIncomingCount: number;
}

const NAV_ITEMS: { id: PageRoute; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'find', label: 'Find a Ride' },
  { id: 'offer', label: 'Offer a Ride' },
  { id: 'calculator', label: 'Fare Split' },
  { id: 'my-rides', label: 'My Rides' },
];

export function Navbar({ currentPage, onNavigate, pendingIncomingCount }: NavbarProps) {
  const { user, signingIn, signInWithGoogle, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSignIn = async () => {
    try {
      const signedInUser = await signInWithGoogle();
      if (signedInUser) {
        showToast(
          'success',
          'Signed in to RIDEHUB',
          `Welcome, ${sanitizePublicDisplayName(signedInUser.displayName)}.`
        );
      }
    } catch (error) {
      showToast('error', 'Sign-in unsuccessful', getFriendlyErrorMessage(error));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setAccountMenuOpen(false);
      setMobileMenuOpen(false);
      showToast('info', 'Signed out', 'You have been signed out of RIDEHUB.');
    } catch (error) {
      showToast('error', 'Sign-out failed', getFriendlyErrorMessage(error));
    }
  };

  const handleNavClick = (page: PageRoute) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md transition-colors duration-200 dark:border-slate-800/90 dark:bg-[#0B1220]/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single clean wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('home')}
          className="inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-[#0B192C] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 dark:text-white"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-extrabold text-white"
          >
            R
          </span>
          RIDEHUB
        </button>

        {/* Zone 2: 5 clean single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          {NAV_ITEMS.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-1 transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'font-semibold text-[#0B192C] dark:text-white'
                    : 'text-slate-600 hover:text-[#0B192C] dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {item.label}
                {item.id === 'my-rides' && pendingIncomingCount > 0 && (
                  <span className="ml-1.5 font-mono text-xs font-semibold text-[#2563EB] tabular-nums dark:text-blue-400">
                    ({pendingIncomingCount})
                  </span>
                )}
                {active && (
                  <span className="absolute inset-x-0 -bottom-[19px] h-[2px] bg-[#2563EB] dark:bg-blue-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Theme switch + primary action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" aria-hidden="true" />
            )}
          </button>

          {user ? (
            <div ref={accountMenuRef} className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-[#0B192C] transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <UserIcon className="h-4 w-4 text-[#2563EB] dark:text-blue-400" aria-hidden="true" />
                <span className="max-w-[130px] truncate">
                  {sanitizePublicDisplayName(user.displayName)}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-[#0F172A] dark:shadow-black/40">
                  <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                    <p className="truncate text-sm font-semibold text-[#0B192C] dark:text-white">
                      {user.displayName || 'Campus Student'}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onNavigate('my-rides');
                    }}
                    className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span>My Rides Dashboard</span>
                    {pendingIncomingCount > 0 && (
                      <span className="font-mono text-xs font-semibold text-[#2563EB] tabular-nums dark:text-blue-400">
                        {pendingIncomingCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled={signingIn}
              onClick={handleSignIn}
              className="hidden md:inline-flex min-h-[40px] items-center justify-center rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {signingIn ? 'Signing In…' : 'Sign In'}
            </button>
          )}

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-[#0B192C] transition-colors hover:bg-slate-50 md:hidden dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pb-5 pt-3 shadow-lg md:hidden dark:border-slate-800 dark:bg-[#0B1220]">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`flex min-h-[44px] items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-base font-medium transition-colors ${
                    active
                      ? 'bg-[#EFF6FF] font-semibold text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.id === 'my-rides' && pendingIncomingCount > 0 && (
                    <span className="font-mono text-xs font-semibold text-[#2563EB] tabular-nums dark:text-blue-400">
                      {pendingIncomingCount} pending
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            {user ? (
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#0B192C] dark:text-white">
                    {sanitizePublicDisplayName(user.displayName)}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/50"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={signingIn}
                onClick={handleSignIn}
                className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-60"
              >
                {signingIn ? 'Signing In…' : 'Sign In with Google'}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

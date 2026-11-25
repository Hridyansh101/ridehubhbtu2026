import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { RideDetailsModal } from './components/RideDetailsModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { getFriendlyErrorMessage } from './firebase/errors';
import {
  fetchPublicActiveRides,
  subscribeIncomingRequests,
  subscribePublicActiveRides,
  subscribeUserJoinRequests,
  subscribeUserPostedRides,
} from './firebase/rideService';
import { FareCalculatorPage } from './pages/FareCalculatorPage';
import { FindRidePage } from './pages/FindRidePage';
import { LandingPage } from './pages/LandingPage';
import { MyRidesPage } from './pages/MyRidesPage';
import { OfferRidePage } from './pages/OfferRidePage';
import {
  CalculatorPrefill,
  DestinationCategory,
  JoinRequest,
  PageRoute,
  Ride,
  RideFilters,
} from './types/ride';

const VALID_PAGES: PageRoute[] = ['home', 'find', 'offer', 'calculator', 'my-rides'];

function getPageFromHash(): PageRoute {
  const cleaned = window.location.hash.replace(/^#\/?/, '') as PageRoute;
  return VALID_PAGES.includes(cleaned) ? cleaned : 'home';
}

const DEFAULT_FILTERS: RideFilters = {
  origin: '',
  destination: '',
  date: '',
  timeWindow: 'any',
  minSeats: 0,
  category: 'all',
};

function RideHubShell() {
  const { user, authReady } = useAuth();
  const { showToast } = useToast();

  const [currentPage, setCurrentPage] = useState<PageRoute>(() => getPageFromHash());
  const [filters, setFilters] = useState<RideFilters>(DEFAULT_FILTERS);
  const [calculatorPrefill, setCalculatorPrefill] = useState<CalculatorPrefill | null>(null);

  const [publicRides, setPublicRides] = useState<Ride[]>([]);
  const [loadingPublicRides, setLoadingPublicRides] = useState(true);

  const [postedRides, setPostedRides] = useState<Ride[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<JoinRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<JoinRequest[]>([]);
  const [loadingMyRides, setLoadingMyRides] = useState(false);

  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [modalFocusJoin, setModalFocusJoin] = useState(false);

  // Sync browser hash navigation
  useEffect(() => {
    const onHashChange = () => {
      setCurrentPage(getPageFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((page: PageRoute) => {
    setCurrentPage(page);
    const targetHash = page === 'home' ? '#home' : `#${page}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const refreshPublicRidesOnce = useCallback(async () => {
    setLoadingPublicRides(true);
    try {
      const rides = await fetchPublicActiveRides();
      setPublicRides(rides);
    } catch (error) {
      showToast('error', 'Failed to load rides', getFriendlyErrorMessage(error));
    } finally {
      setLoadingPublicRides(false);
    }
  }, [showToast]);

  // Attach real-time Firestore listeners only when auth is ready & user is signed in;
  // use clean one-time getDocs fetch for unauthenticated public ride discovery.
  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      setPostedRides([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setLoadingMyRides(false);
      void refreshPublicRidesOnce();
      return;
    }

    setLoadingPublicRides(true);
    setLoadingMyRides(true);

    const unsubPublic = subscribePublicActiveRides(
      (rides) => {
        setPublicRides(rides);
        setLoadingPublicRides(false);
      },
      (error) => {
        setLoadingPublicRides(false);
        showToast('error', 'Could not sync rides', getFriendlyErrorMessage(error));
      }
    );

    const unsubPosted = subscribeUserPostedRides(
      user.uid,
      (rides) => {
        setPostedRides(rides);
        setLoadingMyRides(false);
      },
      (error) => {
        setLoadingMyRides(false);
        showToast('error', 'Could not load your posted rides', getFriendlyErrorMessage(error));
      }
    );

    const unsubOutgoing = subscribeUserJoinRequests(
      user.uid,
      (reqs) => setOutgoingRequests(reqs),
      (error) =>
        showToast('error', 'Could not load your join requests', getFriendlyErrorMessage(error))
    );

    const unsubIncoming = subscribeIncomingRequests(
      user.uid,
      (reqs) => setIncomingRequests(reqs),
      (error) =>
        showToast('error', 'Could not load incoming requests', getFriendlyErrorMessage(error))
    );

    return () => {
      unsubPublic();
      unsubPosted();
      unsubOutgoing();
      unsubIncoming();
    };
  }, [authReady, user, refreshPublicRidesOnce, showToast]);

  const userRequestsByRideId = useMemo(() => {
    const map: Record<string, JoinRequest> = {};
    for (const req of outgoingRequests) {
      map[req.rideId] = req;
    }
    return map;
  }, [outgoingRequests]);

  const pendingIncomingCount = useMemo(() => {
    const activeRideIds = new Set(
      postedRides
        .filter((r) => r.status === 'active' || r.status === 'full')
        .map((r) => r.id)
    );
    return incomingRequests.filter(
      (req) => req.status === 'pending' && activeRideIds.has(req.rideId)
    ).length;
  }, [incomingRequests, postedRides]);

  const handleQuickSearch = useCallback(
    (params: {
      origin?: string;
      destination?: string;
      date?: string;
      category?: DestinationCategory | 'all';
    }) => {
      setFilters({
        ...DEFAULT_FILTERS,
        origin: params.origin ?? '',
        destination: params.destination ?? '',
        date: params.date ?? '',
        category: params.category ?? 'all',
      });
      navigate('find');
    },
    [navigate]
  );

  const handleViewRideDetails = useCallback((ride: Ride, focusJoin = false) => {
    setSelectedRide(ride);
    setModalFocusJoin(focusJoin);
  }, []);

  const handleOpenCalculatorWithPrefill = useCallback(
    (prefill: CalculatorPrefill) => {
      setCalculatorPrefill(prefill);
      navigate('calculator');
    },
    [navigate]
  );

  const liveSelectedRide = useMemo(() => {
    if (!selectedRide) return null;
    return publicRides.find((r) => r.id === selectedRide.id) ?? selectedRide;
  }, [selectedRide, publicRides]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0B192C] transition-colors duration-200 dark:bg-[#090F1A] dark:text-slate-100">
      <Navbar
        currentPage={currentPage}
        onNavigate={navigate}
        pendingIncomingCount={pendingIncomingCount}
      />

      <main className="flex-1">
        {currentPage === 'home' && (
          <LandingPage
            rides={publicRides}
            loadingRides={loadingPublicRides}
            currentUserId={user?.uid}
            userRequestsByRideId={userRequestsByRideId}
            onNavigate={navigate}
            onQuickSearch={handleQuickSearch}
            onViewRideDetails={handleViewRideDetails}
          />
        )}

        {currentPage === 'find' && (
          <FindRidePage
            rides={publicRides}
            loading={loadingPublicRides}
            filters={filters}
            onFiltersChange={setFilters}
            currentUserId={user?.uid}
            userRequestsByRideId={userRequestsByRideId}
            onViewRideDetails={handleViewRideDetails}
            onNavigate={navigate}
          />
        )}

        {currentPage === 'offer' && (
          <OfferRidePage
            onRideCreated={() => {
              if (!user) {
                void refreshPublicRidesOnce();
              }
            }}
            onNavigate={navigate}
          />
        )}

        {currentPage === 'calculator' && (
          <FareCalculatorPage
            prefill={calculatorPrefill}
            onClearPrefill={() => setCalculatorPrefill(null)}
            onNavigate={navigate}
          />
        )}

        {currentPage === 'my-rides' && (
          <MyRidesPage
            postedRides={postedRides}
            incomingRequests={incomingRequests}
            outgoingRequests={outgoingRequests}
            loading={loadingMyRides}
            onNavigate={navigate}
          />
        )}
      </main>

      <Footer onNavigate={navigate} />

      <RideDetailsModal
        ride={liveSelectedRide}
        existingRequest={liveSelectedRide ? userRequestsByRideId[liveSelectedRide.id] : undefined}
        initialFocusJoin={modalFocusJoin}
        onClose={() => setSelectedRide(null)}
        onOpenCalculator={handleOpenCalculatorWithPrefill}
        onRequestSubmitted={() => {
          if (!user) void refreshPublicRidesOnce();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <RideHubShell />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

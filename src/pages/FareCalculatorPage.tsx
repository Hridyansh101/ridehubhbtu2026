import React, { useEffect, useState } from 'react';
import { Calculator, RotateCcw, TrendingDown, Users } from 'lucide-react';
import { CURRENCIES, formatMoney, getCurrencySymbol } from '../constants/validation';
import { CalculatorPrefill, CurrencyCode, PageRoute } from '../types/ride';

interface FareCalculatorPageProps {
  prefill: CalculatorPrefill | null;
  onClearPrefill: () => void;
  onNavigate: (page: PageRoute) => void;
}

const SAMPLE_SCENARIOS: {
  label: string;
  totalFare: number;
  passengers: number;
  soloFare: number;
  currency: CurrencyCode;
}[] = [
  {
    label: 'HBTU → Kanpur Central (CNB)',
    totalFare: 400,
    passengers: 4,
    soloFare: 400,
    currency: 'INR',
  },
  {
    label: 'HBTU → Chakeri Airport (KNU)',
    totalFare: 720,
    passengers: 4,
    soloFare: 720,
    currency: 'INR',
  },
  {
    label: 'HBTU → Jhakarkati ISBT',
    totalFare: 360,
    passengers: 4,
    soloFare: 360,
    currency: 'INR',
  },
];

export function FareCalculatorPage({
  prefill,
  onClearPrefill,
  onNavigate,
}: FareCalculatorPageProps) {
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [totalFareInput, setTotalFareInput] = useState<string>('400');
  const [passengersInput, setPassengersInput] = useState<string>('4');
  const [soloFareInput, setSoloFareInput] = useState<string>('400');
  const [routeLabel, setRouteLabel] = useState<string>('');

  useEffect(() => {
    if (!prefill) return;
    setCurrency(prefill.currency);
    setTotalFareInput(String(prefill.totalFare));
    setPassengersInput(String(Math.max(1, prefill.passengers)));
    setSoloFareInput(String(prefill.totalFare));
    setRouteLabel(prefill.routeLabel ?? '');
  }, [prefill]);

  const parsedTotal = Number(totalFareInput);
  const parsedPassengers = Math.floor(Number(passengersInput));
  const parsedSolo = soloFareInput.trim() === '' ? null : Number(soloFareInput);

  const isTotalValid = totalFareInput.trim() !== '' && !Number.isNaN(parsedTotal) && parsedTotal >= 0;
  const isPassengersValid =
    passengersInput.trim() !== '' &&
    Number.isInteger(parsedPassengers) &&
    parsedPassengers >= 1 &&
    parsedPassengers <= 12;
  const isSoloValid = parsedSolo === null || (!Number.isNaN(parsedSolo) && parsedSolo >= 0);

  const individualContribution =
    isTotalValid && isPassengersValid ? parsedTotal / parsedPassengers : 0;

  const hasSoloComparison =
    isTotalValid && isPassengersValid && isSoloValid && parsedSolo !== null && parsedSolo > 0;

  const savingsAmount = hasSoloComparison ? parsedSolo - individualContribution : 0;
  const savingsPercent =
    hasSoloComparison && parsedSolo > 0
      ? Math.round((savingsAmount / parsedSolo) * 100)
      : 0;

  const sharedBarPercent =
    hasSoloComparison && parsedSolo > 0
      ? Math.max(8, Math.min(100, Math.round((individualContribution / parsedSolo) * 100)))
      : 100;

  const handleReset = () => {
    setCurrency('INR');
    setTotalFareInput('');
    setPassengersInput('2');
    setSoloFareInput('');
    setRouteLabel('');
    onClearPrefill();
  };

  const applyPreset = (scenario: (typeof SAMPLE_SCENARIOS)[number]) => {
    setCurrency(scenario.currency);
    setTotalFareInput(String(scenario.totalFare));
    setPassengersInput(String(scenario.passengers));
    setSoloFareInput(String(scenario.soloFare));
    setRouteLabel(scenario.label);
  };

  const symbol = getCurrencySymbol(currency);

  return (
    <div className="min-h-[75vh] bg-[#F8FAFC] pb-20 pt-8 transition-colors duration-200 dark:bg-[#090F1A] sm:pt-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0B192C] dark:text-white sm:text-3xl">
              Fare Split Calculator
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
              Calculate each student’s estimated share and see how much you save compared with
              travelling solo.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-[#0F172A] dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
        </div>

        {/* Sample Presets */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Kanpur presets:
          </span>
          {SAMPLE_SCENARIOS.map((scenario) => (
            <button
              key={scenario.label}
              type="button"
              onClick={() => applyPreset(scenario)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-[#0B192C] transition-colors hover:border-[#2563EB] hover:text-[#2563EB] dark:border-slate-700 dark:bg-[#0F172A] dark:text-slate-200 dark:hover:border-blue-400 dark:hover:text-blue-400"
            >
              {scenario.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          {/* Inputs Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0F172A] sm:p-8 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#0B192C] dark:text-white">
                Trip Fare Inputs
              </h2>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCurrency(c.code)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      currency === c.code
                        ? 'bg-white text-[#0B192C] shadow-sm dark:bg-slate-800 dark:text-white'
                        : 'text-slate-600 hover:text-[#0B192C] dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {c.code}
                  </button>
                ))}
              </div>
            </div>

            {routeLabel && (
              <p className="mt-3 text-xs font-medium text-[#2563EB] dark:text-blue-400">
                Estimating for: {routeLabel}
              </p>
            )}

            <div className="mt-6 space-y-5">
              {/* Total Estimated Ride Fare */}
              <div>
                <label
                  htmlFor="calc-total-fare"
                  className="block text-sm font-medium text-[#0B192C] dark:text-slate-200"
                >
                  Total Estimated Ride Fare ({symbol})
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-slate-400">
                    {symbol}
                  </span>
                  <input
                    id="calc-total-fare"
                    type="number"
                    min={0}
                    step="0.5"
                    value={totalFareInput}
                    onChange={(e) => setTotalFareInput(e.target.value)}
                    placeholder="e.g., 400"
                    className={`h-12 w-full rounded-xl border bg-white pl-9 pr-4 font-mono text-base font-semibold text-[#0B192C] tabular-nums placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                      totalFareInput && !isTotalValid
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-slate-200 focus:border-[#2563EB] dark:border-slate-700'
                    }`}
                  />
                </div>
                {totalFareInput && !isTotalValid && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Enter a valid non-negative fare amount.
                  </p>
                )}
              </div>

              {/* Number of Passengers */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="calc-passengers"
                    className="block text-sm font-medium text-[#0B192C] dark:text-slate-200"
                  >
                    Number of Passengers Splitting Fare
                  </label>
                  <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-[#2563EB] tabular-nums dark:text-blue-400">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    {isPassengersValid ? parsedPassengers : '—'}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Decrease passengers"
                    onClick={() =>
                      setPassengersInput(String(Math.max(1, (parsedPassengers || 1) - 1)))
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-[#0B192C] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    −
                  </button>
                  <input
                    id="calc-passengers"
                    type="number"
                    min={1}
                    max={12}
                    step={1}
                    value={passengersInput}
                    onChange={(e) => setPassengersInput(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-center font-mono text-base font-semibold text-[#0B192C] tabular-nums focus:border-[#2563EB] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    aria-label="Increase passengers"
                    onClick={() =>
                      setPassengersInput(String(Math.min(12, (parsedPassengers || 1) + 1)))
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-[#0B192C] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    +
                  </button>
                </div>

                <input
                  type="range"
                  aria-label="Passengers slider"
                  min={1}
                  max={8}
                  value={Math.max(1, Math.min(8, parsedPassengers || 1))}
                  onChange={(e) => setPassengersInput(e.target.value)}
                  className="mt-3 w-full accent-[#2563EB]"
                />
                {!isPassengersValid && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Enter a whole number between 1 and 12 passengers.
                  </p>
                )}
              </div>

              {/* Optional Solo Fare Estimate */}
              <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
                <label
                  htmlFor="calc-solo-fare"
                  className="block text-sm font-medium text-[#0B192C] dark:text-slate-200"
                >
                  Solo Travel Fare Estimate ({symbol}){' '}
                  <span className="font-normal text-slate-400">· optional</span>
                </label>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  What a solo auto or cab would cost for the same trip.
                </p>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-slate-400">
                    {symbol}
                  </span>
                  <input
                    id="calc-solo-fare"
                    type="number"
                    min={0}
                    step="0.5"
                    value={soloFareInput}
                    onChange={(e) => setSoloFareInput(e.target.value)}
                    placeholder="e.g., 400"
                    className={`h-11 w-full rounded-xl border bg-white pl-9 pr-4 font-mono text-sm font-semibold text-[#0B192C] tabular-nums placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                      !isSoloValid
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-slate-200 focus:border-[#2563EB] dark:border-slate-700'
                    }`}
                  />
                </div>
                {!isSoloValid && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Solo fare estimate cannot be negative.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Calculated Output Panel */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-[#0B192C] p-6 text-white shadow-sm dark:border-slate-800 dark:bg-[#0D1729] sm:p-8 lg:col-span-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-blue-300">
                <Calculator className="h-4 w-4" aria-hidden="true" />
                <span>Estimated Split Breakdown</span>
              </div>

              <div className="mt-5">
                <p className="text-sm text-slate-300">Individual Contribution</p>
                <p className="mt-1 font-mono text-4xl font-bold tracking-tight text-white tabular-nums sm:text-5xl">
                  {isTotalValid && isPassengersValid
                    ? formatMoney(individualContribution, currency)
                    : `${symbol}0`}
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  Formula: Total fare ÷ Number of passengers
                </p>
              </div>

              {/* Key Figures */}
              <div className="mt-7 grid grid-cols-2 gap-4 border-y border-white/10 py-5">
                <div>
                  <p className="text-xs text-slate-400">Total Estimated Fare</p>
                  <p className="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
                    {isTotalValid ? formatMoney(parsedTotal, currency) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Number of Passengers</p>
                  <p className="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
                    {isPassengersValid ? parsedPassengers : '—'}
                  </p>
                </div>
              </div>

              {/* Solo Comparison Savings */}
              <div className="mt-6">
                {hasSoloComparison ? (
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <TrendingDown
                          className={`h-4 w-4 ${
                            savingsAmount >= 0 ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="text-sm font-medium text-slate-200">
                          {savingsAmount >= 0
                            ? 'Estimated Savings vs. Solo Travel'
                            : 'Difference vs. Solo Estimate'}
                        </span>
                      </div>
                      <span
                        className={`font-mono text-sm font-bold tabular-nums ${
                          savingsAmount >= 0 ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {savingsAmount >= 0
                          ? `Save ${formatMoney(savingsAmount, currency)} (${savingsPercent}%)`
                          : `+${formatMoney(Math.abs(savingsAmount), currency)}`}
                      </span>
                    </div>

                    {/* Visual Cost Bar */}
                    <div className="mt-4 space-y-2.5">
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 tabular-nums">
                          <span>Travelling solo</span>
                          <span className="font-mono">{formatMoney(parsedSolo, currency)}</span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/15">
                          <div className="h-full w-full rounded-full bg-slate-400/60" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-blue-200 tabular-nums">
                          <span>Shared ride ({parsedPassengers} passengers)</span>
                          <span className="font-mono font-semibold">
                            {formatMoney(individualContribution, currency)}
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/15">
                          <div
                            className="h-full rounded-full bg-[#3B82F6] transition-all duration-200"
                            style={{ width: `${sharedBarPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed text-slate-400">
                    Enter a solo travel fare estimate on the left to calculate your exact per-person
                    savings.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-5">
              <p className="text-xs leading-relaxed text-slate-400">
                All figures are planning estimates only. RIDEHUB does not collect or automate fare
                payments.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('find')}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3B82F6] whitespace-nowrap"
                >
                  Browse Available Rides
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('offer')}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 whitespace-nowrap"
                >
                  Offer a Ride
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

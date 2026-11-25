import { ContactMethod, CurrencyCode, DestinationCategory, ReportReason, TimeWindowFilter } from '../types/ride';

// Synchronized verbatim with firebase-blueprint.json & firestore.rules
export const VALIDATION_LIMITS = {
  MIN_LOCATION_LEN: 2,
  MAX_LOCATION_LEN: 120,
  MAX_DRIVER_NAME_LEN: 60,
  MAX_NOTES_LEN: 400,
  MAX_REQUEST_NOTE_LEN: 250,
  MIN_CONTACT_LEN: 3,
  MAX_CONTACT_LEN: 120,
  MIN_REPORT_DETAILS_LEN: 5,
  MAX_REPORT_DETAILS_LEN: 500,
  MIN_SEATS: 1,
  MAX_SEATS: 8,
  MAX_SEATS_PER_REQUEST: 4,
  MIN_FARE: 0,
  MAX_FARE: 100000,
  ID_PATTERN: /^[a-zA-Z0-9_-]{1,128}$/,
  DATE_PATTERN: /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
  TIME_PATTERN: /^([01][0-9]|2[0-3]):[0-5][0-9]$/,
} as const;

export const CURRENCIES: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
];

export const CONTACT_METHODS: { value: ContactMethod; placeholder: string; helper: string }[] = [
  {
    value: 'Campus Email',
    placeholder: 'e.g., alex.m@university.edu',
    helper: 'Shared only after you accept a student’s join request.',
  },
  {
    value: 'WhatsApp',
    placeholder: 'e.g., +1 555-019-2834',
    helper: 'Shared only after you accept a student’s join request.',
  },
  {
    value: 'SMS / Phone',
    placeholder: 'e.g., +1 555-019-2834',
    helper: 'Shared only after you accept a student’s join request.',
  },
  {
    value: 'Telegram',
    placeholder: 'e.g., @alex_campus',
    helper: 'Shared only after you accept a student’s join request.',
  },
];

export const DESTINATION_CATEGORIES: { value: DestinationCategory; label: string }[] = [
  { value: 'railway', label: 'Railway Station' },
  { value: 'airport', label: 'Airport' },
  { value: 'bus', label: 'Bus Station' },
  { value: 'city', label: 'City Destination' },
  { value: 'other', label: 'Other Hub' },
];

export const TIME_WINDOWS: { value: TimeWindowFilter; label: string; rangeLabel: string }[] = [
  { value: 'any', label: 'Any Time', rangeLabel: 'All departures' },
  { value: 'morning', label: 'Morning', rangeLabel: '05:00 – 11:59' },
  { value: 'afternoon', label: 'Afternoon', rangeLabel: '12:00 – 16:59' },
  { value: 'evening', label: 'Evening', rangeLabel: '17:00 – 20:59' },
  { value: 'night', label: 'Late Night', rangeLabel: '21:00 – 04:59' },
];

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'inaccurate_details', label: 'Inaccurate trip time, route, or seat count' },
  { value: 'unsafe_pickup', label: 'Requests private home address or unsafe meeting point' },
  { value: 'suspicious_pricing', label: 'Unreasonable or misleading fare estimate' },
  { value: 'harassment_or_spam', label: 'Spam listing or inappropriate behavior' },
  { value: 'other', label: 'Other safety concern' },
];

export const CAMPUS_PICKUP_LANDMARKS = [
  'HBTU East Campus Main Gate',
  'HBTU West Campus Gate',
  'Shatabdi Bhawan Plaza, HBTU',
  'HBTU Centenary Pillar Circle',
  'Rawatpur Crossing Metro Gate',
];

export const POPULAR_DESTINATIONS: {
  id: string;
  name: string;
  subtitle: string;
  category: DestinationCategory;
  searchQuery: string;
  typicalSplit: string;
  image: string;
}[] = [
  {
    id: 'kanpur-central',
    name: 'Kanpur Central Railway Station (CNB)',
    subtitle: 'Cantt Side & Platform 1 Main Entrance',
    category: 'railway',
    searchQuery: 'Kanpur Central',
    typicalSplit: '~30 min from HBTU · 4-way split saves ~75%',
    image: '/src/assets/images/dest_railway_station_1795594591397.jpg',
  },
  {
    id: 'chakeri-airport',
    name: 'Kanpur Airport (Chakeri · KNU)',
    subtitle: 'New Terminal Departures Gate',
    category: 'airport',
    searchQuery: 'Chakeri Airport',
    typicalSplit: '~45 min from HBTU · Ideal for weekend flights',
    image: '/src/assets/images/dest_airport_terminal_1795594592251.jpg',
  },
  {
    id: 'jhakarkati-isbt',
    name: 'Jhakarkati Bus Terminal (ISBT)',
    subtitle: 'GT Road Intercity Coach Hub',
    category: 'bus',
    searchQuery: 'Jhakarkati',
    typicalSplit: '~25 min from HBTU · Lucknow, Delhi & Agra routes',
    image: '/src/assets/images/dest_bus_terminal_1795594593778.jpg',
  },
  {
    id: 'z-square-civil-lines',
    name: 'Z Square Mall & Civil Lines',
    subtitle: 'Bada Chauraha · Mall Road Corridor',
    category: 'city',
    searchQuery: 'Civil Lines',
    typicalSplit: '~20 min from HBTU · City center & errands',
    image: '/src/assets/images/dest_city_center_1795594594160.jpg',
  },
];

export const HERO_IMAGE_PATH = '/assets/aistudio/Shatabdi_Bhawan_2c35545b.jpeg';

export function getCurrencySymbol(code: CurrencyCode): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? '$';
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const symbol = getCurrencySymbol(currency);
  const rounded = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${rounded.toLocaleString(undefined, {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getTodayLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentLocalTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatReadableDate(dateStr: string): string {
  if (!VALIDATION_LIMITS.DATE_PATTERN.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const todayStr = getTodayLocalDateString();
  if (dateStr === todayStr) return 'Today';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(
    tomorrow.getDate()
  ).padStart(2, '0')}`;
  if (dateStr === tomorrowStr) return 'Tomorrow';

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatReadableTime(timeStr: string): string {
  if (!VALIDATION_LIMITS.TIME_PATTERN.test(timeStr)) return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function matchesTimeWindow(timeStr: string, window: TimeWindowFilter): boolean {
  if (window === 'any') return true;
  if (!VALIDATION_LIMITS.TIME_PATTERN.test(timeStr)) return true;
  const hour = Number(timeStr.split(':')[0]);
  switch (window) {
    case 'morning':
      return hour >= 5 && hour < 12;
    case 'afternoon':
      return hour >= 12 && hour < 17;
    case 'evening':
      return hour >= 17 && hour < 21;
    case 'night':
      return hour >= 21 || hour < 5;
    default:
      return true;
  }
}

export function sanitizePublicDisplayName(rawName: string | null | undefined): string {
  const cleaned = (rawName ?? '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Campus Student';
  const parts = cleaned.split(' ');
  const formatted =
    parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
  return formatted.slice(0, VALIDATION_LIMITS.MAX_DRIVER_NAME_LEN);
}

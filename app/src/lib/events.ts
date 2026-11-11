// The event data published once a day by the GitHub Actions job
// (.github/workflows/refresh-events.yml), and the rules for showing it.
// The rules follow map.html, with one difference: days and times are always
// Atlanta's, whatever time zone the phone is set to.
//
// This file imports nothing, so it can also be run and tested with plain Node.

export const EVENTS_URL = 'https://gt-event-map.web.app/events.json';

const TIME_ZONE = 'America/New_York';

// How long we assume an event lasts when the feed gives no end time.
const DEFAULT_LENGTH_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// One event, as written by gt_calendar_rss.py, locate.py and categorize.py.
// Only the fields the app uses are listed.
export type GtEvent = {
  name: string;
  start: string; // with Atlanta's UTC offset, e.g. "2026-11-08T13:00:00-05:00"
  end: string; // "" when the feed gives no end time
  all_day: boolean;
  location: string;
  categories: string[]; // GT's categories
  our_categories: string[]; // from categorize.py; the app only uses "food"
  url: string;
  building?: string | null;
  lat?: number | null;
  lng?: number | null;
  location_status: 'matched' | 'online' | 'off_campus' | 'unmatched' | 'no_location';
  registration_required: boolean;
};

// How long to wait for the server before using the copy saved on the phone.
const LOAD_TIMEOUT_MS = 15 * 1000;

// Downloads the events from Firebase. Throws if the phone is offline, the
// server doesn't answer in time, or the file isn't a list of events.
export async function downloadEvents(): Promise<GtEvent[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
  try {
    // "no-cache" asks for the newest file rather than one the phone kept.
    const response = await fetch(EVENTS_URL, { headers: { 'Cache-Control': 'no-cache' }, signal: controller.signal });
    if (!response.ok) throw new Error(`The server answered with code ${response.status}.`);
    const data: unknown = await response.json();
    if (!isEventList(data)) throw new Error('The event file has an unexpected format.');
    return data;
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`The server didn't answer within ${LOAD_TIMEOUT_MS / 1000} seconds.`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// A quick check that the data looks like events.json, so a broken file is
// never shown (or saved over the good copy on the phone).
export function isEventList(data: unknown): data is GtEvent[] {
  return (
    Array.isArray(data) &&
    data.every(
      (e) =>
        typeof e === 'object' &&
        e !== null &&
        typeof e.name === 'string' &&
        typeof e.start === 'string' &&
        Array.isArray(e.categories) &&
        Array.isArray(e.our_categories) &&
        typeof e.location_status === 'string',
    )
  );
}

// --- Categories (the same as map.html) ---------------------------------------

export const FOOD = 'Food';
// GT's categories, named as on https://calendar.gatech.edu/rss-feeds.
// "Special event" (an empty feed) is left out until GT fixes it.
const GT_CATEGORIES = [
  'Institute/Academic/Religious',
  'Arts and Performance',
  'Career/Professional development',
  'Conference/Symposium',
  'Other/Miscellaneous',
  'Seminar/Lecture/Colloquium',
  'Sports/Athletics',
  'Student sponsored',
  'Training/Workshop',
];
// Labels shown in place of GT's name (events.json keeps GT's name).
const DISPLAY_NAMES: Record<string, string> = { 'Arts and Performance': 'Arts & Performance' };

// The category checkboxes, in order: Food, then GT's categories.
export const CATEGORY_NAMES = [FOOD, ...GT_CATEGORIES.map((c) => DISPLAY_NAMES[c] ?? c)];

// Food if categorize.py found food, then each of the event's GT categories.
// GT's extra tags that have no feed ("Performance", "Talk", ...) are left out.
export function categoriesOf(e: GtEvent): string[] {
  const gt = e.categories.filter((c) => GT_CATEGORIES.includes(c)).map((c) => DISPLAY_NAMES[c] ?? c);
  return e.our_categories.includes('food') ? [FOOD, ...gt] : gt;
}

// --- Atlanta time ------------------------------------------------------------

const dayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
});
// Gives e.g. "11/7/2026, 19:38:05"; atlantaClock reads the numbers out of it.
const clockFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  hour12: false,
});

// "Tue, Oct 14"
export function formatDay(date: Date): string {
  return dayFormat.format(date);
}

// "6:00 PM"
function formatTime(date: Date): string {
  return timeFormat.format(date);
}

// What a clock in Atlanta shows at that moment.
function atlantaClock(date: Date) {
  const [month, day, year, hour, minute, second] = clockFormat.format(date).match(/\d+/g)!.map(Number);
  // Some systems write midnight as 24:00 instead of 00:00.
  return { year, month, day, hour: hour % 24, minute, second };
}

// How far Atlanta's clock is from UTC at that moment, in milliseconds
// (-4 hours in summer, -5 in winter).
function atlantaOffset(date: Date): number {
  const c = atlantaClock(date);
  const clockAsUtc = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second);
  return clockAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// A day on the calendar, without a time or time zone. month is 1-12.
export type CalendarDay = { year: number; month: number; day: number };

// Today's date in Atlanta.
export function atlantaToday(now = new Date()): CalendarDay {
  const { year, month, day } = atlantaClock(now);
  return { year, month, day };
}

// Midnight in Atlanta at the start of the day `days` after today.
export function startOfAtlantaDay(days = 0, now = new Date()): Date {
  const today = atlantaToday(now);
  return startOfAtlantaDate({ ...today, day: today.day + days });
}

// Midnight in Atlanta at the start of that date. A day number past the
// month's end rolls over (Nov 31 is Dec 1).
export function startOfAtlantaDate({ year, month, day }: CalendarDay): Date {
  // Midnight of that day as if Atlanta were on UTC; Date.UTC handles month ends.
  const midnightAsUtc = Date.UTC(year, month - 1, day);
  // Shift by Atlanta's offset. Done twice, so a day when daylight saving
  // starts or ends still gets the right offset.
  let time = midnightAsUtc - atlantaOffset(new Date(midnightAsUtc));
  time = midnightAsUtc - atlantaOffset(new Date(time));
  return new Date(time);
}

// --- Time frame --------------------------------------------------------------

export type TimeFrame = { from: Date; to: Date; label: string };

// The choices, as in map.html. "date" uses the day picked in the calendar.
export type Range = 'today' | 'tomorrow' | 'week' | 'date';

// The chosen time frame. Events that have already ended are never shown,
// so "Today" at 3 PM starts at 3 PM. Labels fit after "No events ...".
export function timeFrameFor(range: Range, pickedDay: CalendarDay, now = new Date()): TimeFrame {
  let start: Date;
  let end: Date;
  let label: string;
  if (range === 'tomorrow') {
    start = startOfAtlantaDay(1, now);
    end = startOfAtlantaDay(2, now);
    label = `tomorrow (${formatDay(start)})`;
  } else if (range === 'week') {
    start = startOfAtlantaDay(0, now);
    end = startOfAtlantaDay(7, now);
    label = `in the next 7 days (${formatDay(start)} – ${formatDay(startOfAtlantaDay(6, now))})`;
  } else if (range === 'date') {
    start = startOfAtlantaDate(pickedDay);
    end = startOfAtlantaDate({ ...pickedDay, day: pickedDay.day + 1 });
    label = `on ${formatDay(start)}`;
  } else {
    start = startOfAtlantaDay(0, now);
    end = startOfAtlantaDay(1, now);
    label = `today (${formatDay(start)})`;
  }
  return { from: start > now ? start : now, to: end, label };
}

function eventEnd(e: GtEvent): Date {
  if (e.end) return new Date(e.end);
  const length = e.all_day ? DAY_MS : DEFAULT_LENGTH_MS;
  return new Date(new Date(e.start).getTime() + length);
}

// Events that overlap the time frame at all, sorted by start time.
// Multi-day events (exhibits, holidays) show on every day they cover.
export function happeningIn(events: GtEvent[], { from, to }: TimeFrame): GtEvent[] {
  return events
    .filter((e) => new Date(e.start) < to && eventEnd(e) > from)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

// The event's start and end, e.g.
//   "Tue, Oct 14, 6:00 PM – 8:30 PM"
//   "Mon, Mar 1, 12:00 PM – Tue, Mar 2, 5:00 PM"  (ends another day)
//   "Thu, Nov 26 – Fri, Nov 27 · All day"
//   "Tue, Oct 14, 6:00 PM"                         (no end time given)
export function formatWhen(e: GtEvent): string {
  const start = new Date(e.start);
  const end = e.end ? new Date(e.end) : null;
  const sameDay = end !== null && formatDay(end) === formatDay(start);
  if (e.all_day) {
    return end && !sameDay ? `${formatDay(start)} – ${formatDay(end)} · All day` : `${formatDay(start)} · All day`;
  }
  const from = `${formatDay(start)}, ${formatTime(start)}`;
  if (!end) return from;
  if (sameDay) return `${from} – ${formatTime(end)}`;
  return `${from} – ${formatDay(end)}, ${formatTime(end)}`;
}

// --- Pins --------------------------------------------------------------------

export type BuildingGroup = {
  building: string;
  latitude: number;
  longitude: number;
  events: GtEvent[];
};

// One group per building that has events, for one pin each. Events that
// can't be pinned (online, unmatched, off campus, no location) are left out.
export function groupByBuilding(events: GtEvent[]): BuildingGroup[] {
  const groups = new Map<string, BuildingGroup>();
  for (const e of events) {
    // The same test as isPinnable, written out so TypeScript knows the
    // building and coordinates are there.
    if (e.location_status !== 'matched' || !e.building || e.lat == null || e.lng == null) continue;
    let group = groups.get(e.building);
    if (!group) {
      group = { building: e.building, latitude: e.lat, longitude: e.lng, events: [] };
      groups.set(e.building, group);
    }
    group.events.push(e);
  }
  return [...groups.values()];
}

// --- Not on the map ----------------------------------------------------------

// Sections of the "Not on the map" list, in order, keyed by the
// location_status locate.py gave each event (the same as map.html).
const UNMAPPED_SECTIONS = [
  { status: 'online', title: 'Online' },
  { status: 'off_campus', title: 'Off campus' },
  { status: 'unmatched', title: 'Location not matched/found' },
  { status: 'no_location', title: 'No location listed' },
] as const;

export type UnmappedSection = { title: string; events: GtEvent[] };

// The events that can't be pinned, split into sections (empty ones left out).
// Everything groupByBuilding skips lands here, so no event is lost: an event
// marked "matched" but missing its building or coordinates goes under
// "Location not matched/found".
export function notOnTheMap(events: GtEvent[]): UnmappedSection[] {
  const unpinned = events.filter((e) => !isPinnable(e));
  return UNMAPPED_SECTIONS.map(({ status, title }) => ({
    title,
    events: unpinned.filter((e) => e.location_status === status || (status === 'unmatched' && e.location_status === 'matched')),
  })).filter((section) => section.events.length > 0);
}

function isPinnable(e: GtEvent): boolean {
  return e.location_status === 'matched' && !!e.building && e.lat != null && e.lng != null;
}

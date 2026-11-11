import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomPanel } from '@/components/bottom-panel';
import { BuildingPin } from '@/components/building-pin';
import { CategoryPicker } from '@/components/category-picker';
import { EventCard } from '@/components/event-card';
import { FilterBar } from '@/components/filter-bar';
import { GT_GOLD, GT_NAVY, GT_REGION } from '@/constants/campus';
import {
  atlantaToday,
  CATEGORY_NAMES,
  categoriesOf,
  groupByBuilding,
  happeningIn,
  notOnTheMap,
  timeFrameFor,
  type CalendarDay,
  type GtEvent,
  type Range,
} from '@/lib/events';
import { loadEvents, type LoadedEvents } from '@/lib/saved-events';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | ({ status: 'ready' } & LoadedEvents);

// What is open over the bottom of the map: one building's events, or the
// "Not on the map" list.
type OpenPanel = { kind: 'building'; building: string } | { kind: 'unmapped' } | null;

// How often the screen moves "now" forward, so events that have ended drop off.
const CLOCK_TICK_MS = 5 * 60 * 1000;
// When the app comes back to the screen after this long, it downloads the
// events again (the job publishes new ones once a day).
const RELOAD_AFTER_MS = 60 * 60 * 1000;

export default function MapScreen() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  // Changing this number loads the events again.
  const [attempt, setAttempt] = useState(0);
  // Kept in state rather than read during drawing, so the screen knows
  // to redraw when it changes.
  const [now, setNow] = useState(() => new Date());

  const [range, setRange] = useState<Range>('today');
  const [pickedDay, setPickedDay] = useState<CalendarDay>(() => atlantaToday());
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(CATEGORY_NAMES));
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [panel, setPanel] = useState<OpenPanel>(null);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    let cancelled = false; // ignore the answer if the screen has closed meanwhile
    loadEvents().then(
      (loaded) => {
        if (cancelled) return;
        setLoad({ status: 'ready', ...loaded });
        setNow(new Date());
      },
      (error: unknown) => {
        if (!cancelled) setLoad({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Move "now" forward every few minutes.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // Phones keep apps paused in the background for days. When the app comes
  // back, update "now" and, if the events are old, download them again
  // (the old ones stay on screen meanwhile).
  const savedAt = load.status === 'ready' ? load.savedAt.getTime() : null;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setNow(new Date());
      if (savedAt !== null && Date.now() - savedAt > RELOAD_AFTER_MS) setAttempt((n) => n + 1);
    });
    return () => subscription.remove();
  }, [savedAt]);

  function tryAgain() {
    setLoad({ status: 'loading' });
    setAttempt((n) => n + 1);
  }

  // --- What to show (the same steps as render() in map.html) ---------------
  const timeFrame = timeFrameFor(range, pickedDay, now);
  const inTimeFrame = load.status === 'ready' ? happeningIn(load.events, timeFrame) : [];
  const counts = countCategories(inTimeFrame);
  const shown = inTimeFrame.filter((e) => categoriesOf(e).some((c) => ticked.has(c)));
  const groups = groupByBuilding(shown);
  const sections = notOnTheMap(shown);
  const pinnedCount = groups.reduce((sum, g) => sum + g.events.length, 0);
  const unmappedCount = shown.length - pinnedCount;
  const openGroup = panel?.kind === 'building' ? groups.find((g) => g.building === panel.building) : undefined;

  let status: string;
  if (ticked.size === 0) status = 'Tick at least one category to see events.';
  else if (shown.length === 0) status = `No events ${timeFrame.label} in the ticked categories.`;
  else status = `${plural(shown.length, 'event')} ${timeFrame.label} · ${pinnedCount} on the map`;

  let categoryText: string;
  if (ticked.size === CATEGORY_NAMES.length) categoryText = 'All categories';
  else if (ticked.size === 0) categoryText = 'No categories';
  else categoryText = `${ticked.size} of ${CATEGORY_NAMES.length} categories`;

  return (
    <View style={styles.screen}>
      <MapView
        style={styles.map}
        initialRegion={GT_REGION}
        // Tapping the map closes the open panel. On the iPhone a tap on a pin
        // also reaches the map, marked as "marker-press"; that one is ignored.
        onPress={(e) => {
          if (e.nativeEvent.action !== 'marker-press') setPanel(null);
        }}>
        {groups.map((group) => (
          <Marker
            // The count is in the key so the pin is redrawn when it changes.
            key={`${group.building}|${group.events.length}`}
            coordinate={{ latitude: group.latitude, longitude: group.longitude }}
            onPress={() => setPanel({ kind: 'building', building: group.building })}>
            <BuildingPin count={group.events.length} />
          </Marker>
        ))}
      </MapView>

      {load.status === 'ready' ? (
        <FilterBar
          range={range}
          onRangeChange={setRange}
          pickedDay={pickedDay}
          onPickedDayChange={setPickedDay}
          today={atlantaToday(now)}
          categoryText={categoryText}
          onCategoriesPress={() => setCategoriesOpen(true)}
          status={status}
        />
      ) : null}

      {/* Along the bottom, when no panel is open: the offline notice and
          the button for the "Not on the map" list. */}
      {load.status === 'ready' && !openGroup && panel?.kind !== 'unmapped' ? (
        <View style={[styles.bottom, { bottom: insets.bottom + 12 }]}>
          {load.offlineReason ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Couldn’t update. Showing the events saved{' '}
                {load.savedAt.toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                .
              </Text>
              <Pressable onPress={tryAgain} hitSlop={8} accessibilityRole="button">
                <Text style={styles.noticeLink}>Try again</Text>
              </Pressable>
            </View>
          ) : null}
          {unmappedCount > 0 ? (
            <Pressable style={styles.listButton} onPress={() => setPanel({ kind: 'unmapped' })} accessibilityRole="button">
              <Text style={styles.listButtonText}>Not on the map ({unmappedCount})</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {load.status === 'loading' ? (
        <View style={styles.messageBox}>
          <ActivityIndicator color={GT_NAVY} />
          <Text style={styles.messageText}>Loading events…</Text>
        </View>
      ) : null}

      {load.status === 'error' ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageTitle}>Couldn’t load the events</Text>
          <Text style={styles.messageText}>Check your internet connection and try again.</Text>
          <Text style={styles.detail}>{load.message}</Text>
          <Pressable style={styles.button} onPress={tryAgain} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {openGroup ? (
        <BottomPanel title={openGroup.building} subtitle={plural(openGroup.events.length, 'event')} onClose={() => setPanel(null)}>
          {openGroup.events.map((event, i) => (
            <EventCard key={eventKey(event, i)} event={event} />
          ))}
        </BottomPanel>
      ) : null}

      {panel?.kind === 'unmapped' ? (
        <BottomPanel
          title={`Not on the map (${unmappedCount})`}
          subtitle={`Events ${timeFrame.label}, with the same categories as the pins.`}
          onClose={() => setPanel(null)}>
          {unmappedCount === 0 ? <Text style={styles.empty}>None in this time frame.</Text> : null}
          {sections.map((section) => (
            <View key={section.title}>
              <Text style={styles.sectionTitle}>
                {section.title} ({section.events.length})
              </Text>
              {section.events.map((event, i) => (
                <EventCard key={eventKey(event, i)} event={event} />
              ))}
            </View>
          ))}
        </BottomPanel>
      ) : null}

      <CategoryPicker
        visible={categoriesOpen}
        ticked={ticked}
        counts={counts}
        onChange={setTicked}
        onClose={() => setCategoriesOpen(false)}
      />
    </View>
  );
}

// How many events in the time frame have each category.
function countCategories(events: GtEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of events) for (const c of categoriesOf(e)) counts.set(c, (counts.get(c) ?? 0) + 1);
  return counts;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function eventKey(event: GtEvent, i: number): string {
  return `${event.url}|${event.start}|${i}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  bottom: {
    position: 'absolute',
    left: 10,
    right: 10,
    alignItems: 'center',
    gap: 8,
  },
  notice: {
    alignSelf: 'stretch',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fef7e0',
    gap: 4,
  },
  noticeText: {
    color: '#5c3d00',
    fontSize: 13,
  },
  noticeLink: {
    color: GT_NAVY,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  listButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: GT_NAVY,
    borderWidth: 2,
    borderColor: GT_GOLD,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  listButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: GT_NAVY,
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  empty: {
    color: '#6b6b6b',
    paddingVertical: 8,
  },
  messageBox: {
    position: 'absolute',
    top: '35%',
    left: 24,
    right: 24,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 8,
  },
  messageTitle: {
    color: GT_NAVY,
    fontSize: 17,
    fontWeight: 'bold',
  },
  messageText: {
    color: '#1a1a1a',
    textAlign: 'center',
  },
  detail: {
    color: '#6b6b6b',
    fontSize: 12,
    textAlign: 'center',
  },
  button: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: GT_NAVY,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

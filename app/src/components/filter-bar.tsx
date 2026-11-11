import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { GT_GOLD, GT_NAVY } from '@/constants/campus';
import { formatDay, startOfAtlantaDate, type CalendarDay, type Range } from '@/lib/events';

const RANGES: { range: Exclude<Range, 'date'>; label: string }[] = [
  { range: 'today', label: 'Today' },
  { range: 'tomorrow', label: 'Tomorrow' },
  { range: 'week', label: 'Next 7 days' },
];

// The gold bar at the top of the map: the time frame (as in map.html:
// Today / Tomorrow / Next 7 days / a date), the Categories button and a
// line saying what is shown.
export function FilterBar({
  range,
  onRangeChange,
  pickedDay,
  onPickedDayChange,
  today,
  categoryText,
  onCategoriesPress,
  status,
}: {
  range: Range;
  onRangeChange: (range: Range) => void;
  pickedDay: CalendarDay;
  onPickedDayChange: (day: CalendarDay) => void;
  today: CalendarDay; // in Atlanta; the earliest day that can be picked
  categoryText: string;
  onCategoriesPress: () => void;
  status: string;
}) {
  // The date picker works with the phone's own clock, so the day is passed
  // as midnight on the phone and read back the same way. Only the calendar
  // date is kept; times are always Atlanta's (see lib/events.ts).
  const minimumDate = new Date(today.year, today.month - 1, today.day);
  const pickerValue = new Date(pickedDay.year, pickedDay.month - 1, pickedDay.day);
  function pick(date: Date) {
    onPickedDayChange({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
    onRangeChange('date');
  }

  // Android shows the calendar as a pop-up dialog. Cancelling it keeps the
  // previous time frame.
  function openAndroidCalendar() {
    DateTimePickerAndroid.open({ value: pickerValue, mode: 'date', minimumDate, onValueChange: (_, date) => pick(date) });
  }

  const dateChosen = range === 'date';
  const dateLabel = dateChosen ? formatDay(startOfAtlantaDate(pickedDay)) : 'Pick a date';

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        {RANGES.map((r) => (
          <Chip key={r.range} label={r.label} selected={range === r.range} onPress={() => onRangeChange(r.range)} />
        ))}
        <Chip
          label={dateLabel}
          selected={dateChosen}
          onPress={Platform.OS === 'android' ? openAndroidCalendar : () => onRangeChange('date')}
        />
        {/* On the iPhone, the date shows as a small button that opens a calendar. */}
        {Platform.OS === 'ios' && dateChosen ? (
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="compact"
            minimumDate={minimumDate}
            onValueChange={(_, date) => pick(date)}
          />
        ) : null}
      </View>
      <View style={styles.row}>
        <Pressable style={styles.categories} onPress={onCategoriesPress} accessibilityRole="button">
          <Text style={styles.categoriesText}>{categoryText} ▾</Text>
        </Pressable>
      </View>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    padding: 8,
    borderRadius: 10,
    backgroundColor: GT_GOLD,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GT_NAVY,
  },
  chipSelected: {
    backgroundColor: GT_NAVY,
  },
  chipText: {
    color: GT_NAVY,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
  categories: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  categoriesText: {
    color: GT_NAVY,
    fontSize: 13,
    fontWeight: '600',
  },
  status: {
    color: GT_NAVY,
    fontSize: 13,
  },
});

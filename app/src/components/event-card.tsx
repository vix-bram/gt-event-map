import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GT_NAVY } from '@/constants/campus';
import { categoriesOf, FOOD, formatWhen, type GtEvent } from '@/lib/events';

// One event: name (tap to open GT's event page), time, location and tags,
// like the event cards in map.html.
export function EventCard({ event }: { event: GtEvent }) {
  return (
    <View style={styles.card}>
      <Pressable onPress={() => WebBrowser.openBrowserAsync(event.url)} accessibilityRole="link">
        <Text style={styles.name}>{event.name}</Text>
      </Pressable>
      <Text style={styles.when}>{formatWhen(event)}</Text>
      {event.location ? <Text style={styles.where}>{event.location}</Text> : null}
      <View style={styles.tags}>
        {categoriesOf(event).map((category) => (
          <Text key={category} style={[styles.tag, category === FOOD && styles.food]}>
            {category}
          </Text>
        ))}
        {event.registration_required ? (
          <Text style={[styles.tag, styles.registration]}>Registration required</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d0d0d0',
  },
  name: {
    color: GT_NAVY,
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  when: {
    color: '#1a1a1a',
    marginTop: 2,
  },
  where: {
    color: '#6b6b6b',
    fontSize: 13,
    marginTop: 1,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden', // needed for the rounded corners on iOS
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#eee',
    color: '#333',
  },
  food: {
    backgroundColor: '#e6f4ea',
    color: '#137333',
  },
  registration: {
    backgroundColor: '#fef7e0',
    color: '#8a5a00',
  },
});

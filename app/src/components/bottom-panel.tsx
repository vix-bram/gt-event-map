import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GT_NAVY } from '@/constants/campus';

// A panel along the bottom of the screen, over the map, with a title, a
// close button and a scrolling list. Used for a building's events and for
// the "Not on the map" list.
export function BottomPanel({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  // Keeps the list clear of the iPhone's home bar at the bottom.
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.panel, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list}>{children}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '60%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12, // the shadow on Android
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: GT_NAVY,
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#6b6b6b',
    marginTop: 2,
  },
  close: {
    color: GT_NAVY,
    fontSize: 20,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});

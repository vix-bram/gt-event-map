import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GT_GOLD, GT_NAVY } from '@/constants/campus';
import { CATEGORY_NAMES } from '@/lib/events';

// The category checkboxes (as in map.html's gold bar), in a panel that
// slides up over the map. An event shows if it has any ticked category.
// Each box has the number of events in the time frame with that category,
// whether or not it is ticked.
export function CategoryPicker({
  visible,
  ticked,
  counts,
  onChange,
  onClose,
}: {
  visible: boolean;
  ticked: ReadonlySet<string>;
  counts: ReadonlyMap<string, number>;
  onChange: (ticked: Set<string>) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  function toggle(name: string) {
    const next = new Set(ticked);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange(next);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Tapping the dimmed map above the panel closes it. */}
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close categories" />
      <View style={[styles.panel, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Categories</Text>
          <Pressable onPress={() => onChange(new Set(CATEGORY_NAMES))} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>All</Text>
          </Pressable>
          <Pressable onPress={() => onChange(new Set())} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>None</Text>
          </Pressable>
        </View>
        <ScrollView>
          {CATEGORY_NAMES.map((name) => {
            const checked = ticked.has(name);
            return (
              <Pressable
                key={name}
                style={styles.row}
                onPress={() => toggle(name)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}>
                <View style={[styles.box, checked && styles.boxChecked]}>
                  {checked ? <Text style={styles.tick}>✓</Text> : null}
                </View>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.count}>{counts.get(name) ?? 0}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable style={styles.done} onPress={onClose} accessibilityRole="button">
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  panel: {
    maxHeight: '75%',
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    color: GT_NAVY,
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    color: GT_NAVY,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d0d0d0',
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: GT_NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  boxChecked: {
    backgroundColor: GT_NAVY,
  },
  tick: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  name: {
    flex: 1,
    color: '#1a1a1a',
    fontSize: 16,
  },
  count: {
    color: '#6b6b6b',
    fontSize: 15,
  },
  done: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: GT_GOLD,
  },
  doneText: {
    color: GT_NAVY,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

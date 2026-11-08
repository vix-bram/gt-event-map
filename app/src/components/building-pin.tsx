import { StyleSheet, Text, View } from 'react-native';

import { GT_GOLD, GT_NAVY } from '@/constants/campus';

// A round gold pin with a navy border and the number of events inside,
// like the pins in map.html.
export function BuildingPin({ count }: { count: number }) {
  return (
    <View style={styles.pin}>
      <Text style={styles.count}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: GT_GOLD,
    borderColor: GT_NAVY,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    color: GT_NAVY,
    fontWeight: 'bold',
    fontSize: 13,
  },
});

import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { BuildingPin } from '@/components/building-pin';
import { GT_REGION } from '@/constants/campus';

// Test pins at three real buildings (coordinates from data/gt_buildings.json),
// until the app loads the real events and buildings from Firebase.
const TEST_PINS = [
  { id: 'clough', name: 'Clough Undergraduate Learning Commons', latitude: 33.77436, longitude: -84.39646, count: 3 },
  { id: 'student_center', name: 'John Lewis Student Center', latitude: 33.7737, longitude: -84.39845, count: 5 },
  { id: 'klaus', name: 'Klaus Advanced Computing Building', latitude: 33.7771, longitude: -84.39625, count: 1 },
];

export default function MapScreen() {
  return (
    <MapView style={styles.map} initialRegion={GT_REGION}>
      {TEST_PINS.map((pin) => (
        <Marker
          key={pin.id}
          coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
          title={pin.name}
          description={`${pin.count} test event${pin.count === 1 ? '' : 's'}`}>
          <BuildingPin count={pin.count} />
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});

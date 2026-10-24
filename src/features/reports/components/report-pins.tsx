import { Marker } from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon/icon';
import { useNow } from '@/lib/use-now';

import { activeReports, type Report } from '../core/reports-core';
import { REPORT_KIND_INFO } from '../report-kinds';
import { useReportsStore } from '../reports-store';

// Marker views are native views; keep the count modest so the map stays smooth.
const MAX_PINS = 60;

/** Report pins on the map. Must be rendered inside <Map>. */
export function ReportPins({ onPress }: { onPress: (report: Report) => void }) {
  const reports = useReportsStore((s) => s.reports);
  // Re-checks expiry every 30 s even between refreshes.
  const now = useNow(30_000);
  const visible = useMemo(() => activeReports(reports, now).slice(0, MAX_PINS), [reports, now]);

  return visible.map((report) => {
    const info = REPORT_KIND_INFO[report.kind];
    return (
      <Marker
        key={report.id}
        id={`report-${report.id}`}
        lngLat={report.coordinate}
        anchor="center"
        onPress={() => onPress(report)}
      >
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={info.label}
          style={[styles.pin, { backgroundColor: info.color }]}
        >
          <Icon name={info.icon} size={18} color="#FFFFFF" />
        </View>
      </Marker>
    );
  });
}

const styles = StyleSheet.create({
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});

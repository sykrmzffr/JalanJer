import type { SymbolViewProps } from 'expo-symbols';

import type { ReportKind } from './core/reports-core';

type KindInfo = {
  label: string;
  /** Spoken / shown in "Still there?" prompts. */
  question: string;
  /** Start of the spoken warning while navigating ("Police reported ahead, in 500 meters."). */
  spoken: string;
  icon: SymbolViewProps['name'];
  /** Badge colour (same in light and dark mode; chosen for contrast with white icons). */
  color: string;
};

export const REPORT_KIND_INFO: Record<ReportKind, KindInfo> = {
  traffic: {
    label: 'Traffic jam',
    question: 'Traffic jam still there?',
    spoken: 'Traffic jam reported',
    icon: { ios: 'car.2.fill', android: 'traffic' },
    color: '#D93036',
  },
  police: {
    label: 'Police',
    question: 'Police still there?',
    spoken: 'Police reported',
    icon: { ios: 'shield.fill', android: 'local_police' },
    color: '#3E63DD',
  },
  accident: {
    label: 'Accident',
    question: 'Accident still there?',
    spoken: 'Accident reported',
    icon: { ios: 'exclamationmark.octagon.fill', android: 'car_crash' },
    color: '#E5601A',
  },
  hazard: {
    label: 'Hazard',
    question: 'Hazard still there?',
    spoken: 'Hazard reported',
    icon: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
    color: '#B8860B',
  },
  closure: {
    label: 'Road closed',
    question: 'Road still closed?',
    spoken: 'Road closure reported',
    icon: { ios: 'xmark.octagon.fill', android: 'block' },
    color: '#5B5B66',
  },
};

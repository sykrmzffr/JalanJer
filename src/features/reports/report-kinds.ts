import type { SymbolViewProps } from 'expo-symbols';

import type { ReportKind } from './core/reports-core';

type KindInfo = {
  label: string;
  /** Spoken / shown in "Still there?" prompts. */
  question: string;
  icon: SymbolViewProps['name'];
  /** Badge colour (same in light and dark mode; chosen for contrast with white icons). */
  color: string;
};

export const REPORT_KIND_INFO: Record<ReportKind, KindInfo> = {
  traffic: {
    label: 'Traffic jam',
    question: 'Traffic jam still there?',
    icon: { ios: 'car.2.fill', android: 'traffic' },
    color: '#D93036',
  },
  police: {
    label: 'Police',
    question: 'Police still there?',
    icon: { ios: 'shield.fill', android: 'local_police' },
    color: '#3E63DD',
  },
  accident: {
    label: 'Accident',
    question: 'Accident still there?',
    icon: { ios: 'exclamationmark.octagon.fill', android: 'car_crash' },
    color: '#E5601A',
  },
  hazard: {
    label: 'Hazard',
    question: 'Hazard still there?',
    icon: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
    color: '#B8860B',
  },
  closure: {
    label: 'Road closed',
    question: 'Road still closed?',
    icon: { ios: 'xmark.octagon.fill', android: 'block' },
    color: '#5B5B66',
  },
};

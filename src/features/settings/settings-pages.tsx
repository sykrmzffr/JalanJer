import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Alert, Linking } from 'react-native';

import { useAccountStore } from '@/features/account/account-store';
import { usePlacesStore } from '@/stores/places-store';
import { useSettingsStore, type ThemeSetting } from '@/stores/settings-store';

import { ChoiceRow, InfoRow, NavRow, Section, SettingsScreen, SwitchRow } from './components';

// Icon badge colours, chosen to resemble the Waze settings list (not sampled from the screenshot).
const BADGE = {
  account: '#5B6BF0',
  general: '#2EC4D6',
  map: '#2DAA5F',
  voice: '#1FA8F0',
  navigation: '#3D7BF7',
  vehicle: '#1FB5E8',
  tolls: '#3B3D42',
  speedometer: '#F25C3A',
} as const;

export type SettingsPageId = 'general' | 'map-display' | 'voice' | 'navigation' | 'vehicle' | 'tolls' | 'speedometer';

const THEME_LABEL: Record<ThemeSetting, string> = { system: 'Automatic', light: 'Light', dark: 'Dark' };

/** Settings home: the grouped list from the Waze screenshot (MVP items only). */
export function SettingsHome() {
  const router = useRouter();
  const theme = useSettingsStore((s) => s.theme);
  const vehicle = useSettingsStore((s) => s.vehicle);
  const open = (page: SettingsPageId) => router.push({ pathname: '/settings/[page]', params: { page } });
  const email = useAccountStore((s) => s.session?.user.email);

  return (
    <SettingsScreen title="Settings">
      <Section>
        <NavRow
          label={email ? 'Account' : 'Sign in'}
          detail={email ?? 'Keep your places on all your phones'}
          icon={{ ios: 'person.crop.circle.fill', android: 'account_circle' }}
          iconColor={BADGE.account}
          onPress={() => router.push('/account')}
        />
      </Section>
      <Section>
        <NavRow
          label="General"
          icon={{ ios: 'gearshape.fill', android: 'settings' }}
          iconColor={BADGE.general}
          onPress={() => open('general')}
        />
        <NavRow
          label="Map display"
          value={THEME_LABEL[theme]}
          icon={{ ios: 'map.fill', android: 'map' }}
          iconColor={BADGE.map}
          onPress={() => open('map-display')}
        />
        <NavRow
          label="Voice and sound"
          icon={{ ios: 'speaker.wave.2.fill', android: 'volume_up' }}
          iconColor={BADGE.voice}
          onPress={() => open('voice')}
        />
      </Section>
      <Section title="Driving preferences">
        <NavRow
          label="Navigation"
          detail="Avoid tolls, highways, ferries"
          icon={{ ios: 'map.circle.fill', android: 'alt_route' }}
          iconColor={BADGE.navigation}
          onPress={() => open('navigation')}
        />
        <NavRow
          label="Vehicle details"
          value={vehicle === 'car' ? 'Car' : 'Motorcycle'}
          icon={{ ios: 'car.fill', android: 'directions_car' }}
          iconColor={BADGE.vehicle}
          onPress={() => open('vehicle')}
        />
        <NavRow
          label="Toll passes"
          icon={{ ios: 'creditcard.fill', android: 'toll' }}
          iconColor={BADGE.tolls}
          onPress={() => open('tolls')}
        />
        <NavRow
          label="Speedometer"
          icon={{ ios: 'speedometer', android: 'speed' }}
          iconColor={BADGE.speedometer}
          onPress={() => open('speedometer')}
        />
      </Section>
    </SettingsScreen>
  );
}

export function SettingsPage({ page }: { page: SettingsPageId }) {
  switch (page) {
    case 'general':
      return <GeneralPage />;
    case 'map-display':
      return <MapDisplayPage />;
    case 'voice':
      return <VoicePage />;
    case 'navigation':
      return <NavigationPage />;
    case 'vehicle':
      return <VehiclePage />;
    case 'tolls':
      return <TollsPage />;
    case 'speedometer':
      return <SpeedometerPage />;
  }
}

function GeneralPage() {
  const recents = usePlacesStore((s) => s.recents);
  const clearRecents = usePlacesStore((s) => s.clearRecents);
  const version = Constants.expoConfig?.version ?? '?';
  return (
    <SettingsScreen title="General">
      <Section title="Privacy" footer="Your places are only stored on this phone.">
        <NavRow
          label="Clear recent places"
          detail={recents.length === 0 ? 'No recent places' : `${recents.length} saved on this phone`}
          onPress={() =>
            recents.length > 0 &&
            Alert.alert('Clear recent places?', 'Home, Work and Saved places are kept.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: clearRecents },
            ])
          }
        />
      </Section>
      <Section title="About">
        <InfoRow label="Version" value={version} />
        <NavRow
          label="Map data © OpenStreetMap contributors"
          detail="Open Database License (ODbL)"
          onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
        />
        <NavRow label="Map tiles: OpenFreeMap" onPress={() => Linking.openURL('https://openfreemap.org')} />
        <NavRow label="Search: Photon" onPress={() => Linking.openURL('https://github.com/komoot/photon')} />
        <NavRow label="Routing: Valhalla" onPress={() => Linking.openURL('https://github.com/valhalla/valhalla')} />
      </Section>
    </SettingsScreen>
  );
}

function MapDisplayPage() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  return (
    <SettingsScreen title="Map display">
      <Section title="Appearance" footer="Automatic follows your phone's light/dark setting.">
        {(['system', 'light', 'dark'] as const).map((option) => (
          <ChoiceRow
            key={option}
            label={THEME_LABEL[option]}
            selected={theme === option}
            onSelect={() => setTheme(option)}
          />
        ))}
      </Section>
    </SettingsScreen>
  );
}

function VoicePage() {
  const soundMuted = useSettingsStore((s) => s.soundMuted);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  return (
    <SettingsScreen title="Voice and sound">
      <Section footer="Spoken directions come with turn-by-turn navigation. This switch is the same as the sound button on the map.">
        <SwitchRow label="Sound" detail="Directions and alerts" value={!soundMuted} onToggle={toggleSound} />
      </Section>
    </SettingsScreen>
  );
}

function NavigationPage() {
  const avoid = useSettingsStore((s) => s.avoid);
  const toggleAvoid = useSettingsStore((s) => s.toggleAvoid);
  const practiceDrive = useSettingsStore((s) => s.practiceDrive);
  const togglePracticeDrive = useSettingsStore((s) => s.togglePracticeDrive);
  return (
    <SettingsScreen title="Navigation">
      <Section
        title="Avoid"
        footer="Routes avoid these when there is another way. If there isn't, the route still uses them. Same as the Avoid buttons on the route screen."
      >
        <SwitchRow label="Toll roads" value={avoid.tolls} onToggle={() => toggleAvoid('tolls')} />
        <SwitchRow label="Highways" value={avoid.highways} onToggle={() => toggleAvoid('highways')} />
        <SwitchRow label="Ferries" value={avoid.ferries} onToggle={() => toggleAvoid('ferries')} />
      </Section>
      <Section
        title="Try it out"
        footer="Practice drive moves you along the route with fake GPS at 50 km/h, with voice and turn banners, so you can try navigation without driving. The Go button says Practice drive while this is on."
      >
        <SwitchRow label="Practice drive" detail="Simulated GPS" value={practiceDrive} onToggle={togglePracticeDrive} />
      </Section>
    </SettingsScreen>
  );
}

function VehiclePage() {
  const vehicle = useSettingsStore((s) => s.vehicle);
  const setVehicle = useSettingsStore((s) => s.setVehicle);
  return (
    <SettingsScreen title="Vehicle details">
      <Section
        title="Vehicle type"
        footer="Routes are planned for this vehicle. Motorcycle routing is marked beta by Valhalla (our routing engine), so check routes carefully."
      >
        <ChoiceRow label="Car" selected={vehicle === 'car'} onSelect={() => setVehicle('car')} />
        <ChoiceRow label="Motorcycle" selected={vehicle === 'motorcycle'} onSelect={() => setVehicle('motorcycle')} />
      </Section>
    </SettingsScreen>
  );
}

function TollsPage() {
  const passes = useSettingsStore((s) => s.tollPasses);
  const toggle = useSettingsStore((s) => s.toggleTollPass);
  return (
    <SettingsScreen title="Toll passes">
      <Section
        title="How you pay tolls"
        footer="For your information only. Later this will help show toll prices on routes. The app never charges or reads your cards."
      >
        <SwitchRow label="Touch 'n Go card" value={passes.touchNGo} onToggle={() => toggle('touchNGo')} />
        <SwitchRow label="RFID" value={passes.rfid} onToggle={() => toggle('rfid')} />
        <SwitchRow label="SmartTAG" value={passes.smartTag} onToggle={() => toggle('smartTag')} />
      </Section>
    </SettingsScreen>
  );
}

function SpeedometerPage() {
  const show = useSettingsStore((s) => s.showSpeedometer);
  const toggle = useSettingsStore((s) => s.toggleSpeedometer);
  return (
    <SettingsScreen title="Speedometer">
      <Section footer="Speed-limit warnings need speed-limit data for Malaysian roads. They come in a later update.">
        <SwitchRow label="Show speedometer" detail="Your speed on the map" value={show} onToggle={toggle} />
      </Section>
    </SettingsScreen>
  );
}

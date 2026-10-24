import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon/icon';
import { useDestinationStore } from '@/stores/destination-store';
import { type Place, toPlace, usePlacesStore } from '@/stores/places-store';
import { minTouchTarget, spacing, typography, useColors } from '@/theme';

import type { Category } from './categories';
import { iconForKind } from './categories';
import { CategoryChips } from './components/category-chips';
import { PlaceRow, SwipeToDelete } from './components/place-row';
import { SearchField } from './components/search-field';
import { formatDistance, type RankedResult } from './core/search-core';
import { useSearch } from './use-search';
import { useVoiceSearch } from './use-voice-search';
import { useUserCoordinate } from './use-user-coordinate';

/** What picking a place does: drive there, or store it as Home/Work. */
export type SearchMode = 'go' | 'home' | 'work';

const PLACEHOLDER: Record<SearchMode, string> = {
  go: 'Where to?',
  home: 'Search for your home address',
  work: 'Search for your work address',
};

const ICONS = {
  home: { ios: 'house.fill', android: 'home' },
  work: { ios: 'briefcase.fill', android: 'work' },
  saved: { ios: 'bookmark.fill', android: 'bookmark' },
  recent: { ios: 'clock.arrow.circlepath', android: 'history' },
} as const;

/**
 * Search screen (Milestone 2). With an empty field it shows Home, Work and
 * Recents like Waze; typing shows on-device matches instantly and server
 * results ranked by text match and distance.
 */
export function SearchScreen({ mode, startWithVoice = false }: { mode: SearchMode; startWithVoice?: boolean }) {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const near = useUserCoordinate();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const { results, status, error, retry } = useSearch(query, category, near);

  const home = usePlacesStore((s) => s.home);
  const work = usePlacesStore((s) => s.work);
  const saved = usePlacesStore((s) => s.saved);
  const recents = usePlacesStore((s) => s.recents);
  const addRecent = usePlacesStore((s) => s.addRecent);
  const removeRecent = usePlacesStore((s) => s.removeRecent);
  const setHome = usePlacesStore((s) => s.setHome);
  const setWork = usePlacesStore((s) => s.setWork);
  const toggleSaved = usePlacesStore((s) => s.toggleSaved);
  const setDestination = useDestinationStore((s) => s.setDestination);

  const savedIds = new Set(saved.map((p) => p.id));
  const showingResults = query.trim().length > 0 || (category != null && category.include != null);
  const showingSaved = category?.id === 'saved';

  const pick = (place: Place) => {
    Keyboard.dismiss();
    Haptics.selectionAsync();
    const clean = toPlace(place);
    if (mode === 'home') setHome(clean);
    else if (mode === 'work') setWork(clean);
    else {
      addRecent(clean);
      setDestination(clean);
    }
    router.back();
  };

  const setOnceAndGo = (kind: 'home' | 'work') => router.push({ pathname: '/search', params: { mode: kind } });

  const onChangeText = (text: string) => {
    setQuery(text);
    if (text.length > 0 && category) setCategory(null);
  };

  const voice = useVoiceSearch(onChangeText);
  // Opened from the mic on the map: start listening straight away, once.
  const voiceAutoStarted = useRef(false);
  useEffect(() => {
    if (startWithVoice && !voiceAutoStarted.current) {
      voiceAutoStarted.current = true;
      voice.start();
    }
  }, [startWithVoice, voice]);

  const renderResult = ({ item }: { item: RankedResult }) => {
    const isSaved = savedIds.has(item.id);
    const icon = item.source === 'remote' ? iconForKind(item.kind) : ICONS[item.source as keyof typeof ICONS];
    return (
      <PlaceRow
        icon={icon}
        iconColor={item.source === 'home' || item.source === 'work' ? colors.warning : undefined}
        title={item.name}
        subtitle={item.address}
        trailingText={item.distance != null ? formatDistance(item.distance) : undefined}
        onPress={() => pick(item)}
        trailing={
          mode === 'go' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isSaved ? `Remove ${item.name} from Saved` : `Save ${item.name}`}
              onPress={() => {
                Haptics.selectionAsync();
                toggleSaved(item);
              }}
              hitSlop={4}
              style={styles.saveButton}
            >
              <Icon
                name={
                  isSaved
                    ? { ios: 'bookmark.fill', android: 'bookmark' }
                    : { ios: 'bookmark', android: 'bookmark_border' }
                }
                size={20}
                color={isSaved ? colors.warning : colors.onSurfaceVariant}
              />
            </Pressable>
          ) : undefined
        }
      />
    );
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.fieldWrap}>
        <SearchField
          value={query}
          onChangeText={onChangeText}
          onBack={() => router.back()}
          onSubmit={() => results[0] && pick(results[0])}
          placeholder={PLACEHOLDER[mode]}
          loading={status === 'loading'}
          listening={voice.state === 'listening'}
          onMicPress={() => {
            Haptics.selectionAsync();
            if (voice.state === 'listening') voice.stop();
            else voice.start();
          }}
        />
      </View>
      {mode === 'go' && (
        <CategoryChips
          selected={category?.id ?? null}
          onSelect={(next) => {
            Haptics.selectionAsync();
            setCategory(next);
            if (next) setQuery('');
          }}
        />
      )}
      {voice.state === 'error' && voice.error && (
        <View style={[styles.banner, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Text style={[typography.bodyMedium, styles.bannerText, { color: colors.onSurface }]}>{voice.error}</Text>
        </View>
      )}
      {status === 'error' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${error}. Try again`}
          onPress={retry}
          style={[styles.banner, { backgroundColor: colors.errorContainer }]}
        >
          <Text style={[typography.bodyMedium, styles.bannerText, { color: colors.onErrorContainer }]}>{error}</Text>
          <Text style={[typography.labelLarge, { color: colors.onErrorContainer }]}>Try again</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.surface,
          paddingTop: insets.top + spacing.sm,
        },
      ]}
    >
      {header}

      {showingSaved ? (
        <FlashList
          data={saved}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
          ListEmptyComponent={<EmptyText text="Tap the bookmark next to a search result to save it here." />}
          renderItem={({ item }) => (
            <SwipeToDelete onDelete={() => toggleSaved(item)} label="Remove">
              <PlaceRow
                icon={ICONS.saved}
                iconColor={colors.warning}
                title={item.name}
                subtitle={item.address}
                onPress={() => pick(item)}
              />
            </SwipeToDelete>
          )}
        />
      ) : showingResults ? (
        <FlashList
          data={results}
          keyExtractor={(r) => `${r.source}:${r.id}`}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
          renderItem={renderResult}
          ListEmptyComponent={
            status === 'done' ? (
              <EmptyText
                text={
                  category
                    ? `No ${category.label.toLowerCase()} found nearby.`
                    : `No places found for "${query.trim()}".`
                }
              />
            ) : status === 'idle' && query.trim().length > 0 ? (
              <EmptyText text="Keep typing…" />
            ) : null
          }
        />
      ) : (
        <FlashList
          data={recents}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
          ListHeaderComponent={
            <View>
              {mode === 'go' && (
                <>
                  <PlaceRow
                    icon={ICONS.home}
                    iconColor={colors.warning}
                    title="Home"
                    subtitle={home ? home.address || home.name : 'Set once and go'}
                    subtitleIsAction={!home}
                    onPress={() => (home ? pick(home) : setOnceAndGo('home'))}
                  />
                  <PlaceRow
                    icon={ICONS.work}
                    iconColor={colors.warning}
                    title="Work"
                    subtitle={work ? work.address || work.name : 'Set once and go'}
                    subtitleIsAction={!work}
                    onPress={() => (work ? pick(work) : setOnceAndGo('work'))}
                  />
                </>
              )}
              {recents.length > 0 && (
                <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Recent</Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <SwipeToDelete onDelete={() => removeRecent(item.id)}>
              <PlaceRow icon={ICONS.recent} title={item.name} subtitle={item.address} onPress={() => pick(item)} />
            </SwipeToDelete>
          )}
          ListEmptyComponent={mode === 'go' ? null : <EmptyText text="Type an address or place name." />}
        />
      )}
    </View>
  );
}

function EmptyText({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={[typography.bodyMedium, styles.empty, { color: colors.onSurfaceVariant }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { gap: spacing.md, paddingBottom: spacing.sm },
  fieldWrap: { paddingHorizontal: spacing.lg },
  banner: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bannerText: { flex: 1 },
  sectionTitle: {
    ...typography.labelLarge,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  empty: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  saveButton: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

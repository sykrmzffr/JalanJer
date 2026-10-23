import { useLocalSearchParams } from 'expo-router';

import { type SearchMode, SearchScreen } from '@/features/search/search-screen';

export default function Search() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const searchMode: SearchMode = mode === 'home' || mode === 'work' ? mode : 'go';
  return <SearchScreen mode={searchMode} />;
}

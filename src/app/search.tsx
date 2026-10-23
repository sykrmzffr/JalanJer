import { useLocalSearchParams } from 'expo-router';

import { type SearchMode, SearchScreen } from '@/features/search/search-screen';

export default function Search() {
  const { mode, voice } = useLocalSearchParams<{ mode?: string; voice?: string }>();
  const searchMode: SearchMode = mode === 'home' || mode === 'work' ? mode : 'go';
  return <SearchScreen mode={searchMode} startWithVoice={voice === '1'} />;
}

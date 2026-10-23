import { ExpoSpeechRecognitionModule, TaskHintIOS, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useRef, useState } from 'react';

/** Try Malay first (Malaysian place names); fall back to English if the phone doesn't support it. */
const LANGUAGES = ['ms-MY', 'en-US'] as const;

// Words that often appear in Malaysian places; helps the recognizer spell them.
const HINTS = ['Jalan', 'Taman', 'Kampung', 'Bandar', 'Lorong', 'Persiaran', 'Lebuhraya', 'KLCC', 'Petronas'];

export type VoiceState = 'idle' | 'listening' | 'error';

/**
 * Voice search with the phone's own speech recognition (Apple / Google).
 * Words appear in the field while you speak (`onText`); `onDone` fires with
 * the final text.
 */
export function useVoiceSearch(onText: (text: string) => void) {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const languageIndex = useRef(0);

  const begin = () =>
    ExpoSpeechRecognitionModule.start({
      lang: LANGUAGES[languageIndex.current],
      interimResults: true,
      continuous: false,
      addsPunctuation: false,
      contextualStrings: HINTS,
      iosTaskHint: TaskHintIOS.search,
    });

  useSpeechRecognitionEvent('start', () => setState('listening'));
  useSpeechRecognitionEvent('end', () => setState((s) => (s === 'error' ? s : 'idle')));
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript;
    if (text) onText(text);
  });
  useSpeechRecognitionEvent('error', (event) => {
    if (event.error === 'aborted') return;
    if (event.error === 'language-not-supported' && languageIndex.current < LANGUAGES.length - 1) {
      languageIndex.current += 1;
      begin();
      return;
    }
    setState('error');
    setError(
      event.error === 'not-allowed'
        ? 'Allow the microphone and speech recognition in Settings to search by voice.'
        : event.error === 'no-speech' || event.error === 'speech-timeout'
          ? "Didn't hear anything. Tap the mic and try again."
          : event.error === 'network'
            ? 'Voice search needs internet on this phone.'
            : "Voice search didn't work. Try again or type instead.",
    );
  });

  const start = async () => {
    setError(null);
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setState('error');
      setError('Voice search is not available on this phone.');
      return;
    }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setState('error');
      setError('Allow the microphone and speech recognition in Settings to search by voice.');
      return;
    }
    begin();
  };

  const stop = () => ExpoSpeechRecognitionModule.stop();

  return { state, error, start, stop };
}

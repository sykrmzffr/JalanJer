import * as Location from 'expo-location';
import { useEffect } from 'react';

/**
 * Asks for "While Using the App" location once, on first launch.
 * Returns whether the user location puck may be shown.
 */
export function useLocationPermission() {
  const [permission, requestPermission] = Location.useForegroundPermissions();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  return {
    granted: permission?.granted ?? false,
    // Denied for good: iOS won't show the prompt again, only Settings can fix it.
    blocked: permission ? !permission.granted && !permission.canAskAgain : false,
  };
}

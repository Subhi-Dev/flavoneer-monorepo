import { useMutation, useQuery } from 'convex/react';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { api, authClient } from '@/lib/backend';
import { forgetPushToken } from '@/lib/push-notifications';

/**
 * Lists this phone under Settings › Mobile app in the web lab and keeps its
 * "last active" time current. When the phone is signed out from there, its
 * stored credentials are cleared so the app returns to the sign-in screen.
 */
export function useMobileDeviceSession(signedIn: boolean) {
  const registerCurrentDevice = useMutation(api.mobileDevices.registerCurrentDevice);
  const isRevoked = useQuery(api.mobileDevices.isCurrentSessionRevoked, signedIn ? {} : 'skip');
  const signingOutRef = useRef(false);

  useEffect(() => {
    if (!signedIn) {
      return;
    }
    const register = () => {
      // The server skips the write when nothing changed in the last few minutes.
      registerCurrentDevice({
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        modelName: Device.modelName ?? undefined,
        osVersion: Device.osVersion ?? undefined,
        appVersion: Constants.expoConfig?.version,
      }).catch((error) => console.error('Could not register this device:', error));
    };
    register();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        register();
      }
    });
    return () => subscription.remove();
  }, [registerCurrentDevice, signedIn]);

  useEffect(() => {
    if (!isRevoked || signingOutRef.current) {
      return;
    }
    signingOutRef.current = true;
    (async () => {
      await forgetPushToken().catch(() => undefined);
      await authClient.signOut();
    })()
      .catch((error) => console.error('Could not clear the revoked session:', error))
      .finally(() => {
        signingOutRef.current = false;
      });
  }, [isRevoked]);
}

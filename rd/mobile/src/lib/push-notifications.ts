import { useMutation, useQuery } from 'convex/react';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useProductionLineI18n } from '@/features/production-line/i18n';
import { api } from '@/lib/backend';

// Must match PRODUCTION_RECORDS_CHANNEL_ID in packages/backend/convex/pushNotifications.ts.
const PRODUCTION_RECORDS_CHANNEL_ID = 'production-records';
const PUSH_TOKEN_STORAGE_KEY = 'flavoneer.pushToken';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

function toPermission(status: Notifications.NotificationPermissionsStatus): NotificationPermission {
  const iosStatus = status.ios?.status;
  if (
    status.granted ||
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return 'granted';
  }
  return status.canAskAgain ? 'undetermined' : 'denied';
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

/**
 * Returns this device's Expo push token, asking for permission when `prompt` is set.
 * Returns null on simulators, when permission is refused, or when no token is available.
 */
async function getExpoPushToken(channelName: string, prompt: boolean) {
  if (!Device.isDevice) {
    return null;
  }
  // Android 13+ only shows the permission prompt once a channel exists.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(PRODUCTION_RECORDS_CHANNEL_ID, {
      name: channelName,
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let permission = await getNotificationPermission();
  if (permission === 'undetermined' && prompt) {
    permission = toPermission(await Notifications.requestPermissionsAsync());
  }
  if (permission !== 'granted') {
    return null;
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

/**
 * Registers this device for push notifications while the user is signed in and has
 * app alerts on. The permission prompt appears once, after the first sign-in.
 */
export function usePushNotificationRegistration(signedIn: boolean) {
  const { t } = useProductionLineI18n();
  const settings = useQuery(api.settings.get, signedIn ? {} : 'skip');
  const registerPushToken = useMutation(api.pushNotifications.registerPushToken);
  // Settings are null for users who never saved any, and app alerts default to on.
  const alertsEnabled = settings !== undefined && settings?.appAlerts !== false;
  const channelName = t('notificationChannelName');
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!(signedIn && alertsEnabled) || registeredRef.current) {
      return;
    }
    registeredRef.current = true;
    (async () => {
      const token = await getExpoPushToken(channelName, true);
      if (!token) {
        registeredRef.current = false;
        return;
      }
      await registerPushToken({ token, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
      await SecureStore.setItemAsync(PUSH_TOKEN_STORAGE_KEY, token);
    })().catch((error) => {
      registeredRef.current = false;
      console.error('Could not register for push notifications:', error);
    });
  }, [alertsEnabled, channelName, registerPushToken, signedIn]);
}

/** Asks for permission and registers the device. Used when the user turns alerts on. */
export async function enablePushNotifications(
  channelName: string,
  register: (args: { token: string; platform: 'ios' | 'android' }) => Promise<null>,
) {
  const token = await getExpoPushToken(channelName, true);
  if (!token) {
    return false;
  }
  await register({ token, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
  await SecureStore.setItemAsync(PUSH_TOKEN_STORAGE_KEY, token);
  return true;
}

/** Stops this device from receiving the user's notifications. Call before signing out. */
export async function unregisterPushNotifications(
  unregister: (args: { token: string }) => Promise<null>,
) {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_STORAGE_KEY);
  if (!token) {
    return;
  }
  await unregister({ token });
  await SecureStore.deleteItemAsync(PUSH_TOKEN_STORAGE_KEY);
}

/** Opens the production record when the user taps a notification about it. */
export function useNotificationNavigation(signedIn: boolean) {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (
      !signedIn ||
      !response ||
      response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      return;
    }
    const recordId = response.notification.request.content.data?.recordId;
    if (typeof recordId !== 'string') {
      return;
    }
    router.push({ pathname: '/quality/production-line/[recordId]', params: { recordId } });
    Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  }, [response, router, signedIn]);
}

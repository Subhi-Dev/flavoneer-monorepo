import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricConfirmationResult = 'confirmed' | 'cancelled' | 'failed' | 'unavailable';

/**
 * Asks the device owner to confirm a review decision with Face ID, Touch ID, or fingerprint.
 * The system falls back to the device passcode when biometrics fail or are not enrolled.
 * Authentication runs entirely on the device; only the outcome is used by the app.
 */
export async function confirmWithBiometrics({
  cancelLabel,
  promptMessage,
}: {
  cancelLabel: string;
  promptMessage: string;
}): Promise<BiometricConfirmationResult> {
  try {
    const enrolledLevel = await LocalAuthentication.getEnrolledLevelAsync();
    if (enrolledLevel === LocalAuthentication.SecurityLevel.NONE) {
      return 'unavailable';
    }
    const result = await LocalAuthentication.authenticateAsync({
      cancelLabel,
      disableDeviceFallback: false,
      promptMessage,
    });
    if (result.success) {
      return 'confirmed';
    }
    if (['app_cancel', 'system_cancel', 'user_cancel'].includes(result.error)) {
      return 'cancelled';
    }
    if (['not_available', 'not_enrolled', 'passcode_not_set'].includes(result.error)) {
      return 'unavailable';
    }
    return 'failed';
  } catch {
    return 'failed';
  }
}

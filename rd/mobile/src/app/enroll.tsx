import { type BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, Check, QrCode, RotateCcw, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandSpinner } from '@/components/brand-spinner';
import { ThemedText } from '@/components/themed-text';
import { BrandColors } from '@/constants/theme';
import {
  type EnrollmentCode,
  EnrollmentError,
  parseEnrollmentCode,
  redeemEnrollmentCode,
} from '@/features/enrollment/enrollment';
import {
  type ProductionLineTranslationKey,
  useProductionLineI18n,
} from '@/features/production-line/i18n';

type EnrollmentState =
  | { status: 'scanning' }
  | { status: 'redeeming' }
  | { message: ProductionLineTranslationKey; status: 'error' };

export default function EnrollScreen() {
  const { isRTL, t } = useProductionLineI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ organizationId?: string; token?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<EnrollmentState>(() =>
    params.token ? { status: 'redeeming' } : { status: 'scanning' },
  );
  // Scans arrive many times per second; only the first one may be redeemed.
  const isHandlingCode = useRef(false);

  const redeem = useCallback((code: EnrollmentCode) => {
    isHandlingCode.current = true;
    return redeemEnrollmentCode(code).then(
      () => {
        // The session guard in the root layout takes over navigation from here.
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      },
      (error: unknown) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
        setState({
          message: error instanceof EnrollmentError ? 'enrollmentCodeRejected' : 'enrollmentFailed',
          status: 'error',
        });
      },
    );
  }, []);

  // Opened from a deep link, e.g. after scanning the code with the system camera.
  useEffect(() => {
    if (params.token && !isHandlingCode.current) {
      redeem({ organizationId: params.organizationId, token: params.token });
    }
  }, [params.organizationId, params.token, redeem]);

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (isHandlingCode.current) {
      return;
    }
    const code = parseEnrollmentCode(data);
    if (!code) {
      isHandlingCode.current = true;
      setState({ message: 'enrollmentInvalidCode', status: 'error' });
      return;
    }
    setState({ status: 'redeeming' });
    void redeem(code);
  };

  const scanAgain = () => {
    isHandlingCode.current = false;
    setState({ status: 'scanning' });
  };

  const close = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/sign-in');
    }
  };

  const showCamera = permission?.granted && state.status === 'scanning';

  return (
    <View className="flex-1 bg-[#071B16]" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      {showCamera ? (
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <SafeAreaView className="flex-1 px-5 pb-8 pt-3" style={styles.controls}>
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityLabel={t('close')}
            accessibilityRole="button"
            className="size-12 items-center justify-center rounded-full bg-black/40 active:scale-95"
            onPress={close}
          >
            <X color="white" size={24} />
          </Pressable>
          <View className="rounded-full bg-black/40 px-4 py-2">
            <ThemedText className="!text-white" type="smallBold">
              {t('scanQrCode')}
            </ThemedText>
          </View>
        </View>

        <View className="flex-1 items-center justify-center gap-5">
          {state.status === 'scanning' && permission?.granted ? (
            <>
              <View className="aspect-square w-[72%] max-w-[320px] rounded-[30px] border-2 border-[#F5A623]" />
              <ThemedText className="max-w-[320px] text-center !text-white" type="small">
                {t('enrollmentScanHelp')}
              </ThemedText>
            </>
          ) : null}

          {state.status === 'scanning' && !permission?.granted ? (
            <>
              <View className="size-20 items-center justify-center rounded-[28px] bg-[#F5A623]">
                {permission ? (
                  <Camera color={BrandColors.ink} size={34} />
                ) : (
                  <BrandSpinner color={BrandColors.ink} />
                )}
              </View>
              <ThemedText className="text-center !text-white" type="section">
                {t('cameraPermissionTitle')}
              </ThemedText>
              <ThemedText className="max-w-[340px] text-center !text-[#A9CBBB]" type="small">
                {t('enrollmentCameraPermissionBody')}
              </ThemedText>
              {permission ? (
                <Pressable
                  accessibilityRole="button"
                  className="mt-2 min-h-[54px] flex-row items-center gap-2 rounded-[18px] bg-[#F5A623] px-6 active:scale-95"
                  onPress={requestPermission}
                >
                  <Check color={BrandColors.ink} size={19} />
                  <ThemedText className="!text-[#173E33]" type="smallBold">
                    {t('grantPermission')}
                  </ThemedText>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {state.status === 'redeeming' ? (
            <>
              <View className="size-20 items-center justify-center rounded-[28px] bg-[#F5A623]">
                <BrandSpinner color={BrandColors.ink} />
              </View>
              <ThemedText className="text-center !text-white" type="section">
                {t('enrollmentSigningIn')}
              </ThemedText>
            </>
          ) : null}

          {state.status === 'error' ? (
            <>
              <View className="size-20 items-center justify-center rounded-[28px] bg-[#F5A623]">
                <QrCode color={BrandColors.ink} size={34} />
              </View>
              <ThemedText
                accessibilityLiveRegion="polite"
                className="max-w-[340px] text-center !text-white"
                type="smallBold"
              >
                {t(state.message)}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                className="mt-2 min-h-[54px] flex-row items-center gap-2 rounded-[18px] bg-[#F5A623] px-6 active:scale-95"
                onPress={scanAgain}
              >
                <RotateCcw color={BrandColors.ink} size={19} />
                <ThemedText className="!text-[#173E33]" type="smallBold">
                  {t('scanAgain')}
                </ThemedText>
              </Pressable>
            </>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    elevation: 1,
    zIndex: 1,
  },
});

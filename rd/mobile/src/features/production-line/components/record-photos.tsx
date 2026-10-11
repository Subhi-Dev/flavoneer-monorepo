import type { Id } from '@flavoneer/backend/data-model';
import * as Sentry from '@sentry/react-native';
import { useMutation } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { BrandSurface } from '@/components/brand-screen';
import { ThemedText } from '@/components/themed-text';
import { Image } from '@/components/ui/image';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/backend';
import type { ProductionLineTranslationKey } from '../i18n';
import { uploadBatchLabelPhoto } from '../photo-upload';

// Must match maximumRecordPhotos in packages/backend/convex/productionLineRecords.ts.
const MAXIMUM_RECORD_PHOTOS = 10;

type Translate = (
  key: ProductionLineTranslationKey,
  values?: Record<string, number | string>,
) => string;

interface RecordPhoto {
  _id: Id<'productionLineRecordPhotos'>;
  createdAt: number;
  url?: string;
}

/**
 * Optional production photos picked from the photo library. The carton label stays
 * camera-only; these photos add context such as the line, product, or packaging.
 */
export function RecordPhotosSection({
  disabled,
  editable,
  photos,
  recordId,
  t,
}: {
  disabled: boolean;
  editable: boolean;
  photos: RecordPhoto[];
  recordId: Id<'productionLineRecords'>;
  t: Translate;
}) {
  const theme = useTheme();
  const generateUploadUrl = useMutation(api.productionLineRecords.generatePhotoUploadUrl);
  const attachPhoto = useMutation(api.productionLineRecords.attachRecordPhoto);
  const removePhoto = useMutation(api.productionLineRecords.removeRecordPhoto);
  const [uploadingCount, setUploadingCount] = useState(0);
  const remaining = MAXIMUM_RECORD_PHOTOS - photos.length;
  const canAdd = editable && !disabled && remaining > 0 && uploadingCount === 0;

  if (!editable && photos.length === 0) {
    return null;
  }

  const handleAdd = async () => {
    if (!canAdd) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: 'images',
      orderedSelection: true,
      quality: 1,
      selectionLimit: remaining,
    });
    if (result.canceled) {
      return;
    }
    const assets = result.assets.slice(0, remaining);
    setUploadingCount(assets.length);
    let failed = false;
    for (const asset of assets) {
      try {
        const storageId = await uploadBatchLabelPhoto(asset.uri, () =>
          generateUploadUrl({ recordId }),
        );
        await attachPhoto({ recordId, storageId: storageId as Id<'_storage'> });
      } catch (error) {
        failed = true;
        Sentry.captureException(error, { tags: { feature: 'record-photos' } });
      } finally {
        setUploadingCount((count) => Math.max(0, count - 1));
      }
    }
    if (failed) {
      Alert.alert(t('photoUploadFailed'), t('unexpectedError'));
    }
  };

  const handleRemove = (photoId: Id<'productionLineRecordPhotos'>) => {
    Alert.alert(t('removePhoto'), t('removePhotoConfirm'), [
      { style: 'cancel', text: t('cancel') },
      {
        onPress: () => {
          removePhoto({ photoId }).catch((error) => {
            Sentry.captureException(error, { tags: { feature: 'record-photos' } });
            Alert.alert(t('photoUploadFailed'), t('unexpectedError'));
          });
        },
        style: 'destructive',
        text: t('remove'),
      },
    ]);
  };

  return (
    <BrandSurface className="mb-7 gap-4">
      <View>
        <View className="flex-row items-center justify-between gap-4">
          <ThemedText themeColor="textSecondary" type="overline">
            {t('recordPhotos')}
          </ThemedText>
          <View className="rounded-full bg-[#EEF8EB] px-3 py-2 dark:bg-[#285B4D]">
            <ThemedText themeColor="textSecondary" type="caption">
              {t('recordPhotosCount', { count: photos.length, max: MAXIMUM_RECORD_PHOTOS })}
            </ThemedText>
          </View>
        </View>
        {editable ? (
          <ThemedText className="mt-2" themeColor="textSecondary" type="small">
            {remaining > 0
              ? t('recordPhotosHelp')
              : t('photoLimitReached', { max: MAXIMUM_RECORD_PHOTOS })}
          </ThemedText>
        ) : null}
      </View>

      {photos.length > 0 || uploadingCount > 0 ? (
        <View className="flex-row flex-wrap gap-3">
          {photos.map((photo) => (
            <View
              className="size-[96px] overflow-hidden rounded-[18px] bg-[#102F27]"
              key={photo._id}
            >
              {photo.url ? (
                <Image
                  accessibilityIgnoresInvertColors
                  className="size-full"
                  contentFit="cover"
                  source={{ uri: photo.url }}
                />
              ) : null}
              {editable && !disabled ? (
                <Pressable
                  accessibilityLabel={t('removePhoto')}
                  accessibilityRole="button"
                  className="absolute end-1.5 top-1.5 size-8 items-center justify-center rounded-full bg-[#102F27]/75 active:opacity-70"
                  hitSlop={6}
                  onPress={() => handleRemove(photo._id)}
                >
                  <X color="#FFFDF4" size={16} strokeWidth={2.5} />
                </Pressable>
              ) : null}
            </View>
          ))}
          {Array.from({ length: uploadingCount }, (_, index) => (
            <View
              accessibilityLabel={t('uploadingPhoto')}
              className="size-[96px] items-center justify-center rounded-[18px] border-2 border-dashed border-[#1C4A3C]/15 bg-[#EEF8EB] dark:border-[#D2F2D4]/15 dark:bg-[#285B4D]"
              // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity.
              key={`uploading-${index}`}
            >
              <ActivityIndicator color={theme.text} />
            </View>
          ))}
        </View>
      ) : (
        <ThemedText themeColor="textSecondary" type="small">
          {t('noRecordPhotos')}
        </ThemedText>
      )}

      {editable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canAdd }}
          className={`min-h-[52px] flex-row items-center justify-center gap-2 rounded-[18px] border border-[#1C4A3C]/15 active:scale-[0.98] active:opacity-70 dark:border-[#D2F2D4]/15 ${canAdd ? '' : 'opacity-50'}`}
          disabled={!canAdd}
          onPress={handleAdd}
        >
          {uploadingCount > 0 ? (
            <ActivityIndicator color={theme.text} size="small" />
          ) : (
            <ImagePlus color={theme.text} size={18} />
          )}
          <ThemedText type="smallBold">
            {uploadingCount > 0 ? t('uploadingPhoto') : t('addFromLibrary')}
          </ThemedText>
        </Pressable>
      ) : null}
    </BrandSurface>
  );
}

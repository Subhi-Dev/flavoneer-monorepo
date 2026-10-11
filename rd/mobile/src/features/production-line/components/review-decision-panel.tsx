import type { Id } from '@flavoneer/backend/data-model';
import * as Sentry from '@sentry/react-native';
import { useMutation } from 'convex/react';
import { CircleAlert, CircleCheck, ScanFace, Undo2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { BrandSpinner } from '@/components/brand-spinner';
import { BrandSurface } from '@/components/brand-screen';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { confirmWithBiometrics } from '@/features/production-line/biometric-confirmation';
import type { ProductionLineTranslationKey } from '@/features/production-line/i18n';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/backend';

type ReviewDecision = 'approved' | 'returned';

export type ReviewSummary = {
  checksCompleted: number;
  checksTotal: number;
  printedBatchCode?: string;
  readingsOutsideRange: number;
};

const SUCCESS = '#247A51';
const DANGER = '#A43434';

const MAXIMUM_NOTE_LENGTH = 1000;

export function ReviewDecisionPanel({
  connected,
  displaySerial,
  isRTL,
  onDecided,
  qcUserName,
  recordId,
  summary,
  t,
}: {
  connected: boolean;
  displaySerial: string;
  isRTL: boolean;
  onDecided: (decision: ReviewDecision) => void;
  qcUserName: string;
  recordId: Id<'productionLineRecords'>;
  summary: ReviewSummary;
  t: (key: ProductionLineTranslationKey, values?: Record<string, number | string>) => string;
}) {
  const theme = useTheme();
  const reviewRecord = useMutation(api.productionLineRecords.review);
  const [note, setNote] = useState('');
  const [pendingDecision, setPendingDecision] = useState<ReviewDecision | null>(null);
  const [message, setMessage] = useState<ProductionLineTranslationKey | null>(null);
  const trimmedNote = note.trim();
  const isBusy = pendingDecision !== null;

  const decide = async (decision: ReviewDecision) => {
    if (!connected || isBusy) {
      return;
    }
    if (decision === 'returned' && !trimmedNote) {
      setMessage('returnNoteRequired');
      return;
    }
    setMessage(null);
    setPendingDecision(decision);
    try {
      const confirmation = await confirmWithBiometrics({
        cancelLabel: t('cancel'),
        promptMessage: t(
          decision === 'approved' ? 'confirmApprovalPrompt' : 'confirmReturnPrompt',
          {
            serial: displaySerial,
          },
        ),
      });
      if (confirmation !== 'confirmed') {
        if (confirmation === 'unavailable') {
          setMessage('deviceSecurityRequired');
        } else if (confirmation === 'failed') {
          setMessage('identityNotConfirmed');
        }
        return;
      }
      await reviewRecord({
        recordId,
        decision,
        ...(trimmedNote ? { note: trimmedNote } : {}),
      });
      onDecided(decision);
    } catch (error) {
      const exception = error instanceof Error ? error : new Error(String(error));
      console.error(`[production-line] review ${decision} failed`, exception);
      Sentry.captureException(exception, {
        extra: { recordId },
        tags: { feature: 'production-line', operation: 'review', phase: decision },
      });
      setMessage('unexpectedError');
    } finally {
      setPendingDecision(null);
    }
  };

  return (
    <BrandSurface className="mb-7 gap-5">
      <View>
        <ThemedText themeColor="textSecondary" type="overline">
          {t('productionReview')}
        </ThemedText>
        <ThemedText className="mt-2" type="section">
          {t('reviewDecision')}
        </ThemedText>
        <ThemedText className="mt-2" themeColor="textSecondary" type="small">
          {t('reviewDecisionHelp')}
        </ThemedText>
      </View>

      <View className="gap-3 rounded-[18px] bg-[#EEF8EB] p-4 dark:bg-[#285B4D]">
        <SummaryRow
          label={t('confirmedEvidence')}
          ok={Boolean(summary.printedBatchCode)}
          value={summary.printedBatchCode ?? '—'}
          valueIsCode
        />
        <SummaryRow
          label={t('measurements')}
          ok={summary.readingsOutsideRange === 0}
          value={
            summary.readingsOutsideRange === 0
              ? t('allReadingsWithinRange')
              : t('readingsOutsideRange', { count: summary.readingsOutsideRange })
          }
        />
        <SummaryRow
          label={t('complianceChecks')}
          ok={summary.checksCompleted === summary.checksTotal}
          value={t('complianceCompleted', {
            completed: summary.checksCompleted,
            total: summary.checksTotal,
          })}
        />
        <ThemedText
          className="border-t border-[#1C4A3C]/10 pt-3 dark:border-[#D2F2D4]/10"
          themeColor="textSecondary"
          type="caption"
        >
          {t('inspectedBy', { name: qcUserName })}
        </ThemedText>
      </View>

      <View>
        <ThemedText themeColor="textSecondary" type="overline">
          {t('reviewNote')}
        </ThemedText>
        <TextInput
          accessibilityLabel={t('reviewNote')}
          className="mt-3 min-h-[96px] rounded-[18px] border border-[#1C4A3C]/12 bg-[#EEF8EB] px-4 py-3 text-base text-[#173E33] dark:border-[#D2F2D4]/10 dark:bg-[#285B4D] dark:text-[#F7F4DF]"
          editable={!isBusy}
          maxLength={MAXIMUM_NOTE_LENGTH}
          multiline
          onChangeText={(value) => {
            setNote(value);
            if (message === 'returnNoteRequired') {
              setMessage(null);
            }
          }}
          placeholder={t('reviewNotePlaceholder')}
          placeholderTextColor="#789489"
          style={{
            fontFamily: Fonts.sans,
            textAlign: isRTL ? 'right' : 'left',
            textAlignVertical: 'top',
            writingDirection: isRTL ? 'rtl' : 'ltr',
          }}
          testID="review-note-input"
          value={note}
        />
      </View>

      {message ? (
        <View className="rounded-[18px] bg-[#FFF0C7] p-4 dark:bg-[#8A5811]/20">
          <ThemedText type="caption">{t(message)}</ThemedText>
        </View>
      ) : null}

      <View className="flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !connected || isBusy }}
          className={`min-h-[58px] flex-1 flex-row items-center justify-center gap-2 rounded-[19px] border-2 border-[#1C4A3C] active:scale-[0.98] dark:border-[#F5A623] ${
            !connected || isBusy ? 'opacity-50' : ''
          }`}
          disabled={!connected || isBusy}
          onPress={() => decide('returned')}
          testID="return-production-record-button"
        >
          {pendingDecision === 'returned' ? (
            <BrandSpinner />
          ) : (
            <Undo2 color={theme.primary} size={19} />
          )}
          <ThemedText type="smallBold">{t('returnRecord')}</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !connected || isBusy }}
          className={`min-h-[58px] flex-[1.4] flex-row items-center justify-center gap-2 rounded-[19px] bg-[#1C4A3C] active:scale-[0.98] dark:bg-[#F5A623] ${
            !connected || isBusy ? 'opacity-50' : ''
          }`}
          disabled={!connected || isBusy}
          onPress={() => decide('approved')}
          testID="approve-production-record-button"
        >
          {pendingDecision === 'approved' ? (
            <BrandSpinner color={theme.primaryText} />
          ) : (
            <ScanFace color={theme.primaryText} size={19} />
          )}
          <ThemedText className="!text-white dark:!text-[#173E33]" type="smallBold">
            {t('approveRecord')}
          </ThemedText>
        </Pressable>
      </View>

      <ThemedText className="text-center" themeColor="textSecondary" type="caption">
        {t('biometricOnDevice')}
      </ThemedText>
    </BrandSurface>
  );
}

function SummaryRow({
  label,
  ok,
  value,
  valueIsCode = false,
}: {
  label: string;
  ok: boolean;
  value: string;
  valueIsCode?: boolean;
}) {
  const Icon = ok ? CircleCheck : CircleAlert;
  return (
    <View className="flex-row items-center gap-3">
      <Icon color={ok ? SUCCESS : DANGER} size={19} />
      <ThemedText className="min-w-0 flex-1" numberOfLines={1} type="smallBold">
        {label}
      </ThemedText>
      <ThemedText
        className="shrink-0"
        style={[
          { color: ok ? undefined : DANGER },
          valueIsCode ? { fontFamily: Fonts.mono, writingDirection: 'ltr' } : null,
        ]}
        type="caption"
      >
        {value}
      </ThemedText>
    </View>
  );
}

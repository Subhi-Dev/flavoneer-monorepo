import type { Id } from '@flavoneer/backend/data-model';
import { useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Timer,
} from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandSpinner } from '@/components/brand-spinner';
import { BrandEntrance, BrandHeader, BrandSurface } from '@/components/brand-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors } from '@/constants/theme';
import { useProductionLineI18n } from '@/features/production-line/i18n';
import { EmptyState, QueryErrorBoundary, StatusChip } from '@/features/research/components';
import {
  allergenLabel,
  formatAmount,
  formatGrams,
  formatMoney,
  formatPercent,
  formulationStatus,
  getIngredientBreakdown,
  runStatus,
} from '@/features/research/format';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/backend';

export default function FormulationDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const { isRTL, t } = useProductionLineI18n();
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  return (
    <ThemedView className="flex-1 overflow-hidden">
      <View className="pointer-events-none absolute -start-28 -top-24 size-72 rounded-full bg-[#D2F2D4]/80 dark:bg-[#285B4D]/35" />
      <View className="pointer-events-none absolute -end-24 top-[28%] size-64 rounded-full bg-[#F5A623]/10" />
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="mx-auto w-full max-w-[800px] px-5 pb-12 pt-3"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            <BrandEntrance>
              <BrandHeader
                action={
                  <Pressable
                    accessibilityLabel={t('back')}
                    accessibilityRole="button"
                    className="size-11 items-center justify-center rounded-full border border-[#1C4A3C]/10 bg-[#FFFDF4] active:scale-95 dark:border-[#D2F2D4]/10 dark:bg-[#173E33]"
                    onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))}
                  >
                    <BackIcon color={theme.text} size={20} strokeWidth={2.2} />
                  </Pressable>
                }
                actionPosition="start"
                className="mb-6"
              />
            </BrandEntrance>

            <QueryErrorBoundary resetKey={params.projectId}>
              {params.projectId ? (
                <FormulationDetail projectId={params.projectId as Id<'projects'>} />
              ) : (
                <FormulationNotFound />
              )}
            </QueryErrorBoundary>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function FormulationDetail({ projectId }: { projectId: Id<'projects'> }) {
  const { language, t } = useProductionLineI18n();
  const formulation = useQuery(api.projects.get, { id: projectId, language });

  if (formulation === undefined) {
    return <BrandSpinner className="my-16" size="large" />;
  }
  if (formulation === null) {
    return <FormulationNotFound />;
  }

  const statusDetails = formulationStatus[formulation.status];
  const { massBalance, massBalanced, rows, totalWeight } = getIngredientBreakdown(
    formulation.ingredients,
    formulation.batchWeight,
  );
  const batchWeight = formulation.batchWeight ?? totalWeight;
  const pills = [
    t('version', { version: formulation.version }),
    formulation.formattedId,
    formulation.category,
  ].filter((value): value is string => Boolean(value));

  return (
    <>
      <BrandEntrance>
        <View className="relative mb-6 overflow-hidden rounded-[36px] bg-[#1C4A3C] p-6 dark:bg-[#102F27]">
          <View className="absolute -end-14 -top-16 size-44 rounded-full border-[30px] border-[#F5A623]/15" />
          <View className="mb-6 flex-row items-center justify-between gap-3">
            <View className="size-12 items-center justify-center rounded-[17px] bg-[#F5A623]">
              <FlaskConical color={BrandColors.ink} size={23} />
            </View>
            {statusDetails ? (
              <StatusChip label={t(statusDetails.key)} tone={statusDetails.tone} />
            ) : null}
          </View>
          <ThemedText className="!text-[#B9D8C8]" type="overline">
            {t('formulation')}
          </ThemedText>
          <ThemedText className="mt-2 !text-[#FFFDF4]" type="display">
            {formulation.name}
          </ThemedText>
          <View className="mt-5 flex-row flex-wrap gap-2">
            {pills.map((pill) => (
              <View
                className="rounded-full border border-white/10 bg-white/10 px-3 py-2"
                key={pill}
              >
                <ThemedText className="!text-[#E1EEE6]" type="caption">
                  {pill}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      </BrandEntrance>

      <BrandEntrance delay={60}>
        <BrandSurface className="mb-6 !p-0 overflow-hidden">
          <View className="flex-row">
            <Figure
              label={t('batchWeight')}
              value={batchWeight > 0 ? formatGrams(batchWeight) : '—'}
            />
            <View className="w-px bg-[#1C4A3C]/10 dark:bg-[#D2F2D4]/10" />
            <Figure
              label={t('batchCost')}
              value={
                typeof formulation.batchCost === 'number' ? formatMoney(formulation.batchCost) : '—'
              }
            />
          </View>
          <View className="h-px bg-[#1C4A3C]/10 dark:bg-[#D2F2D4]/10" />
          <View className="flex-row">
            <Figure
              label={t('costPerServing')}
              value={
                typeof formulation.costPerServing === 'number'
                  ? formatMoney(formulation.costPerServing)
                  : '—'
              }
            />
            <View className="w-px bg-[#1C4A3C]/10 dark:bg-[#D2F2D4]/10" />
            <Figure
              icon={
                rows.length === 0 ? null : massBalanced ? (
                  <CheckCircle2 color="#247A51" size={17} strokeWidth={2.4} />
                ) : (
                  <AlertTriangle color="#A43434" size={17} strokeWidth={2.4} />
                )
              }
              label={t('massBalance')}
              value={rows.length > 0 ? formatPercent(massBalance) : '—'}
            />
          </View>
        </BrandSurface>
      </BrandEntrance>

      <BrandEntrance delay={110}>
        <BrandSurface className="mb-6 gap-1">
          <View className="mb-2 flex-row items-center justify-between gap-3">
            <ThemedText themeColor="textSecondary" type="overline">
              {t('ingredients')}
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="caption">
              {rows.length}
            </ThemedText>
          </View>
          {rows.length === 0 ? (
            <ThemedText className="py-3" themeColor="textSecondary" type="small">
              {t('noIngredients')}
            </ThemedText>
          ) : (
            rows.map((row) => (
              <View
                className="border-t border-[#1C4A3C]/10 py-3 dark:border-[#D2F2D4]/10"
                key={row.id}
              >
                <View className="flex-row items-baseline gap-3">
                  <ThemedText className="min-w-0 flex-1" numberOfLines={2} type="smallBold">
                    {row.name}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" type="caption">
                    {formatAmount(row.weight, row.unit)}
                  </ThemedText>
                  <ThemedText style={{ writingDirection: 'ltr' }} type="smallBold">
                    {formatPercent(row.share)}
                  </ThemedText>
                </View>
                <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#DCEBDD] dark:bg-[#285B4D]">
                  <View
                    className="h-full rounded-full bg-[#F5A623]"
                    style={{ width: `${Math.min(Math.max(row.share, 0), 100)}%` }}
                  />
                </View>
              </View>
            ))
          )}
        </BrandSurface>
      </BrandEntrance>

      {formulation.formulationAllergens ? (
        <BrandEntrance delay={150}>
          <BrandSurface className="mb-6">
            <ThemedText themeColor="textSecondary" type="overline">
              {t('allergens')}
            </ThemedText>
            {formulation.formulationAllergens.length === 0 ? (
              <ThemedText className="mt-3" themeColor="textSecondary" type="small">
                {t('noDeclaredAllergens')}
              </ThemedText>
            ) : (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {formulation.formulationAllergens.map((code) => (
                  <View className="rounded-full bg-[#FFF0C7] px-3 py-1.5" key={code}>
                    <ThemedText className="!text-[#8A5811]" type="caption">
                      {allergenLabel(code, t)}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </BrandSurface>
        </BrandEntrance>
      ) : null}

      <BrandEntrance delay={190}>
        <LabRuns projectId={projectId} />
      </BrandEntrance>

      <ThemedText className="mt-1 px-1 text-center" themeColor="textSecondary" type="caption">
        {t('editInWebLab')}
      </ThemedText>
    </>
  );
}

function LabRuns({ projectId }: { projectId: Id<'projects'> }) {
  const { language, t } = useProductionLineI18n();
  const runs = useQuery(api.runs.getByProject, { language, projectId });
  const sortedRuns = runs ? [...runs].sort((a, b) => b.startTime - a.startTime) : undefined;
  const dateFormat = new Intl.DateTimeFormat(language === 'ar' ? 'ar-PS' : 'en', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <>
      <View className="mb-3 flex-row items-end justify-between px-1">
        <ThemedText type="section">{t('labRuns')}</ThemedText>
        {sortedRuns ? (
          <ThemedText themeColor="textSecondary" type="caption">
            {sortedRuns.length}
          </ThemedText>
        ) : null}
      </View>
      <BrandSurface className="mb-6 !p-0">
        {sortedRuns === undefined ? (
          <BrandSpinner className="my-8" size="large" />
        ) : sortedRuns.length === 0 ? (
          <EmptyState icon={<Timer color={BrandColors.copy} size={28} />} text={t('noLabRuns')} />
        ) : (
          sortedRuns.map((run, index) => {
            const statusDetails = run.status ? runStatus[run.status] : undefined;
            return (
              <View key={run._id}>
                <View className="flex-row items-center gap-4 px-5 py-4">
                  <View className="min-w-0 flex-1">
                    <ThemedText
                      numberOfLines={1}
                      style={{ writingDirection: 'ltr' }}
                      type="smallBold"
                    >
                      {run.batchCode}
                    </ThemedText>
                    <ThemedText
                      className="mt-1"
                      numberOfLines={1}
                      themeColor="textSecondary"
                      type="caption"
                    >
                      {dateFormat.format(run.startTime)} · {run.durationString}
                    </ThemedText>
                  </View>
                  {statusDetails ? (
                    <StatusChip label={t(statusDetails.key)} tone={statusDetails.tone} />
                  ) : null}
                </View>
                {index < sortedRuns.length - 1 ? (
                  <View className="mx-5 h-px bg-[#1C4A3C]/10 dark:bg-[#D2F2D4]/10" />
                ) : null}
              </View>
            );
          })
        )}
      </BrandSurface>
    </>
  );
}

function Figure({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <View className="min-w-0 flex-1 px-5 py-4">
      <ThemedText numberOfLines={1} themeColor="textSecondary" type="caption">
        {label}
      </ThemedText>
      <View className="mt-1 flex-row items-center gap-1.5">
        {icon}
        <ThemedText
          adjustsFontSizeToFit
          className="text-[20px] leading-7"
          numberOfLines={1}
          style={{ writingDirection: 'ltr' }}
          type="smallBold"
        >
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

function FormulationNotFound() {
  const router = useRouter();
  const { t } = useProductionLineI18n();
  return (
    <BrandSurface className="items-center gap-5 py-10">
      <FlaskConical color={BrandColors.copy} size={30} />
      <ThemedText className="text-center" type="smallBold">
        {t('formulationNotFound')}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        className="min-h-[52px] justify-center rounded-[18px] bg-[#1C4A3C] px-6 dark:bg-[#F5A623]"
        onPress={() => router.navigate('/')}
      >
        <ThemedText className="!text-white dark:!text-[#173E33]" type="smallBold">
          {t('backToFormulations')}
        </ThemedText>
      </Pressable>
    </BrandSurface>
  );
}

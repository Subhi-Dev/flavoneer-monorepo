import type { Id } from '@flavoneer/backend/data-model';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { ChevronRight, FlaskConical, Leaf, ShieldCheck } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BrandSpinner } from '@/components/brand-spinner';
import { BrandEntrance, BrandHeader, BrandScreen, BrandSurface } from '@/components/brand-screen';
import { ThemedText } from '@/components/themed-text';
import { Image } from '@/components/ui/image';
import { UserAvatar } from '@/components/user-avatar';
import { BrandColors } from '@/constants/theme';
import { useOrganization } from '@/contexts/organization-context';
import { useProductionLineI18n } from '@/features/production-line/i18n';
import { EmptyState, QueryErrorBoundary, StatusChip } from '@/features/research/components';
import {
  formatGrams,
  formatMoney,
  formulationStatus,
  materialStatus,
} from '@/features/research/format';
import { api, authClient } from '@/lib/backend';

type ResearchTab = 'formulations' | 'materials';

const FORMULATIONS_PAGE_SIZE = 25;

export default function ResearchScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { activeOrganizationId, organizationsLoading } = useOrganization();
  const { isRTL, t } = useProductionLineI18n();
  const [tab, setTab] = useState<ResearchTab>('formulations');
  const tabs = [
    { id: 'formulations', label: t('formulations') },
    { id: 'materials', label: t('materials') },
  ] as const;

  return (
    <BrandScreen>
      <View style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <BrandEntrance>
          <BrandHeader
            action={
              <Pressable
                accessibilityLabel={t('accountSettings')}
                accessibilityRole="button"
                className="size-11 items-center justify-center rounded-full active:scale-95 active:opacity-70"
                onPress={() => router.navigate('/user-settings')}
              >
                <UserAvatar
                  name={session?.user.name || session?.user.email}
                  seed={session?.user.email}
                  size={44}
                />
              </Pressable>
            }
          />
        </BrandEntrance>

        <BrandEntrance className="mb-6" delay={70}>
          <ThemedText themeColor="textSecondary" type="overline">
            {t('researchAndDevelopment')}
          </ThemedText>
          <ThemedText className="mt-1 max-w-[390px]" type="title">
            {tab === 'formulations' ? t('formulations') : t('materials')}
          </ThemedText>
        </BrandEntrance>

        <BrandEntrance delay={120}>
          <View
            accessibilityRole="tablist"
            className="mb-7 flex-row rounded-full bg-[#D2F2D4] p-1 dark:bg-[#173E33]"
          >
            {tabs.map((item) => {
              const isActive = item.id === tab;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  className={`min-h-[44px] flex-1 items-center justify-center rounded-full ${
                    isActive ? 'bg-[#1C4A3C] dark:bg-[#F5A623]' : 'active:opacity-70'
                  }`}
                  key={item.id}
                  onPress={() => setTab(item.id)}
                >
                  <ThemedText
                    className={isActive ? '!text-[#FFFDF4] dark:!text-[#173E33]' : ''}
                    type="smallBold"
                  >
                    {item.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </BrandEntrance>

        <BrandEntrance delay={170}>
          {organizationsLoading ? (
            <BrandSpinner className="my-10" size="large" />
          ) : !activeOrganizationId ? (
            <BrandSurface className="mb-8 !p-0">
              <EmptyState
                icon={<ShieldCheck color={BrandColors.copy} size={30} />}
                text={t('researchNoOrganization')}
              />
            </BrandSurface>
          ) : (
            <QueryErrorBoundary resetKey={`${activeOrganizationId}:${tab}`}>
              {tab === 'formulations' ? (
                <FormulationList organizationId={activeOrganizationId} />
              ) : (
                <MaterialList organizationId={activeOrganizationId} />
              )}
            </QueryErrorBoundary>
          )}
        </BrandEntrance>
      </View>
    </BrandScreen>
  );
}

function FormulationList({ organizationId }: { organizationId: Id<'organizations'> }) {
  const router = useRouter();
  const { isRTL, language, t } = useProductionLineI18n();
  const { loadMore, results, status } = usePaginatedQuery(
    api.projects.listByOrganization,
    { includeFormulation: false, language, organizationId },
    { initialNumItems: FORMULATIONS_PAGE_SIZE },
  );
  // The index returns oldest first; show recently edited formulations at the top.
  const formulations = useMemo(
    () => [...results].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    [results],
  );

  return (
    <>
      <SectionHeading count={status === 'LoadingFirstPage' ? undefined : formulations.length}>
        {t('formulations')}
      </SectionHeading>
      <BrandSurface className="mb-8 !p-0">
        {status === 'LoadingFirstPage' ? (
          <BrandSpinner className="my-8" size="large" />
        ) : formulations.length === 0 ? (
          <EmptyState
            detail={t('noFormulationsHelp')}
            icon={<FlaskConical color={BrandColors.copy} size={30} />}
            text={t('noFormulations')}
          />
        ) : (
          formulations.map((formulation, index) => {
            const statusDetails = formulationStatus[formulation.status];
            const figures = [
              t('version', { version: formulation.version }),
              typeof formulation.batchWeight === 'number' && formulation.batchWeight > 0
                ? formatGrams(formulation.batchWeight)
                : null,
              typeof formulation.costPerServing === 'number' && formulation.costPerServing > 0
                ? t('perServing', { cost: formatMoney(formulation.costPerServing) })
                : null,
            ].filter(Boolean);

            return (
              <View key={formulation._id}>
                <Pressable
                  accessibilityLabel={`${t('openFormulation')} ${formulation.name}`}
                  accessibilityRole="button"
                  className="flex-row items-center gap-4 px-5 py-5 active:bg-[#D2F2D4]/35 dark:active:bg-[#D2F2D4]/10"
                  onPress={() => router.push(`/research/formulations/${formulation._id}`)}
                >
                  <ListThumbnail icon="formulation" uri={formulation.photoUrl} />
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-2">
                      <ThemedText className="min-w-0 shrink" numberOfLines={1} type="smallBold">
                        {formulation.name}
                      </ThemedText>
                      {statusDetails ? (
                        <StatusChip label={t(statusDetails.key)} tone={statusDetails.tone} />
                      ) : null}
                    </View>
                    <ThemedText
                      className="mt-1"
                      numberOfLines={1}
                      themeColor="textSecondary"
                      type="caption"
                    >
                      {figures.join(' · ')}
                    </ThemedText>
                  </View>
                  <ChevronRight
                    color={BrandColors.copy}
                    size={19}
                    style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                  />
                </Pressable>
                {index < formulations.length - 1 ? <RowDivider /> : null}
              </View>
            );
          })
        )}
        {status === 'CanLoadMore' || status === 'LoadingMore' ? (
          <LoadMoreButton
            loading={status === 'LoadingMore'}
            onPress={() => loadMore(FORMULATIONS_PAGE_SIZE)}
          />
        ) : null}
      </BrandSurface>
    </>
  );
}

function MaterialList({ organizationId }: { organizationId: Id<'organizations'> }) {
  const { language, t } = useProductionLineI18n();
  const materials = useQuery(api.ingredients.list, { language, organizationId });

  return (
    <>
      <SectionHeading count={materials?.length}>{t('materials')}</SectionHeading>
      <BrandSurface className="mb-8 !p-0">
        {materials === undefined ? (
          <BrandSpinner className="my-8" size="large" />
        ) : materials.length === 0 ? (
          <EmptyState
            detail={t('noMaterialsHelp')}
            icon={<Leaf color={BrandColors.copy} size={30} />}
            text={t('noMaterials')}
          />
        ) : (
          materials.map((material, index) => {
            const statusDetails = material.status ? materialStatus[material.status] : undefined;
            const cost = material.costPerKg ?? material.price;
            const details = [
              material.code,
              typeof cost === 'number' && cost > 0
                ? t('perKilogram', { cost: formatMoney(cost) })
                : null,
            ].filter(Boolean);

            return (
              <View key={material._id}>
                <View className="flex-row items-center gap-4 px-5 py-4">
                  <ListThumbnail icon="material" uri={material.coverImageUrl ?? undefined} />
                  <View className="min-w-0 flex-1">
                    <ThemedText numberOfLines={1} type="smallBold">
                      {material.name}
                    </ThemedText>
                    {details.length > 0 ? (
                      <ThemedText
                        className="mt-1"
                        numberOfLines={1}
                        themeColor="textSecondary"
                        type="caption"
                      >
                        {details.join(' · ')}
                      </ThemedText>
                    ) : null}
                  </View>
                  {statusDetails ? (
                    <StatusChip label={t(statusDetails.key)} tone={statusDetails.tone} />
                  ) : null}
                </View>
                {index < materials.length - 1 ? <RowDivider /> : null}
              </View>
            );
          })
        )}
      </BrandSurface>
    </>
  );
}

function SectionHeading({ children, count }: { children: string; count?: number }) {
  return (
    <View className="mb-3 flex-row items-end justify-between px-1">
      <ThemedText type="section">{children}</ThemedText>
      {count === undefined ? null : (
        <ThemedText themeColor="textSecondary" type="caption">
          {count}
        </ThemedText>
      )}
    </View>
  );
}

function ListThumbnail({ icon, uri }: { icon: 'formulation' | 'material'; uri?: string }) {
  if (uri) {
    return (
      <Image
        className="size-12 rounded-[17px] bg-[#DDEBE0] dark:bg-[#173E33]"
        contentFit="cover"
        source={{ uri }}
        transition={150}
      />
    );
  }
  const Icon = icon === 'formulation' ? FlaskConical : Leaf;
  return (
    <View className="size-12 items-center justify-center rounded-[17px] bg-[#D2F2D4]">
      <Icon color={BrandColors.ink} size={21} strokeWidth={2.3} />
    </View>
  );
}

function RowDivider() {
  return <View className="ms-[84px] h-px bg-[#1C4A3C]/10 dark:bg-[#D2F2D4]/10" />;
}

function LoadMoreButton({ loading, onPress }: { loading: boolean; onPress: () => void }) {
  const { t } = useProductionLineI18n();
  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-[56px] flex-row items-center justify-center gap-2 border-t border-[#1C4A3C]/10 active:bg-[#D2F2D4]/35 dark:border-[#D2F2D4]/10"
      disabled={loading}
      onPress={onPress}
    >
      {loading ? <BrandSpinner /> : null}
      <ThemedText type="smallBold">{t('loadMore')}</ThemedText>
    </Pressable>
  );
}

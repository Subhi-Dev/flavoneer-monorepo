import * as Sentry from '@sentry/react-native';
import { CloudOff } from 'lucide-react-native';
import { Component, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useProductionLineI18n } from '@/features/production-line/i18n';
import type { ChipTone } from '@/features/research/format';

const chipToneClassNames: Record<ChipTone, { container: string; text: string }> = {
  amber: { container: 'bg-[#FFF0C7]', text: '!text-[#8A5811]' },
  green: { container: 'bg-[#DDF3E4]', text: '!text-[#247A51]' },
  mint: { container: 'bg-[#D2F2D4]', text: '!text-[#173E33]' },
  red: { container: 'bg-[#FBE3E0]', text: '!text-[#A43434]' },
};

export function StatusChip({ label, tone }: { label: string; tone: ChipTone }) {
  const classNames = chipToneClassNames[tone];
  return (
    <View className={`shrink-0 rounded-full px-2.5 py-1 ${classNames.container}`}>
      <ThemedText className={`text-[11px] leading-[14px] ${classNames.text}`} type="smallBold">
        {label}
      </ThemedText>
    </View>
  );
}

export function EmptyState({
  detail,
  icon,
  text,
}: {
  detail?: string;
  icon: ReactNode;
  text: string;
}) {
  return (
    <View className="items-center gap-3 px-6 py-10">
      {icon}
      <ThemedText className="text-center" type="smallBold">
        {text}
      </ThemedText>
      {detail ? (
        <ThemedText className="text-center" themeColor="textSecondary" type="small">
          {detail}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function LoadErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useProductionLineI18n();
  return (
    <View className="items-center gap-4 px-6 py-10">
      <CloudOff color="#A43434" size={28} />
      <ThemedText className="text-center" themeColor="textSecondary" type="small">
        {t('researchLoadFailed')}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        className="min-h-[48px] justify-center rounded-[16px] bg-[#1C4A3C] px-6 active:scale-[0.98] dark:bg-[#F5A623]"
        onPress={onRetry}
      >
        <ThemedText className="!text-white dark:!text-[#173E33]" type="smallBold">
          {t('retry')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

/**
 * Convex `useQuery` throws query errors during render. This boundary turns them into a retryable
 * error state; retrying remounts the children, which subscribes to the query again.
 */
export class QueryErrorBoundary extends Component<
  { children: ReactNode; resetKey?: string },
  { attempt: number; failed: boolean; resetKey?: string }
> {
  state = { attempt: 0, failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: { resetKey?: string },
    state: { attempt: number; failed: boolean; resetKey?: string },
  ) {
    return props.resetKey === state.resetKey
      ? null
      : { attempt: state.attempt, failed: false, resetKey: props.resetKey };
  }

  componentDidCatch(error: unknown) {
    Sentry.captureException(error, { tags: { feature: 'research' } });
  }

  retry = () => {
    this.setState(({ attempt }) => ({ attempt: attempt + 1, failed: false }));
  };

  render() {
    if (this.state.failed) {
      return <LoadErrorState onRetry={this.retry} />;
    }
    return <View key={this.state.attempt}>{this.props.children}</View>;
  }
}

import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { BrandColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Fraunces ExtraBold "F" from design/exports/logo/svg/flavoneer-mark.svg.
const F_PATH =
  'M409.6 -640.72Q429.74 -640.72 443.47 -644.61Q457.2 -648.5 468.41 -651.93Q479.62 -655.36 490.6 -655.36Q510.28 -655.36 520.12 -645.75Q529.96 -636.14 536.83 -612.8L576.19 -474.13Q580.3 -460.86 572.52 -451.93Q564.74 -443.01 551.01 -440.72Q540.03 -438.89 529.28 -443.01Q518.52 -447.13 511.66 -461.31Q486.94 -510.74 464.29 -536.6Q441.64 -562.46 417.61 -571.84Q393.58 -581.22 363.38 -581.22L302.05 -581.22L302.05 -93.82Q302.05 -82.84 307.31 -75.06Q312.58 -67.28 324.93 -64.99L356.05 -59.04Q369.78 -56.29 375.73 -48.97Q381.68 -41.65 381.68 -27.92Q381.68 -15.1 372.99 -7.55Q364.29 0 345.99 0L77.8 0Q59.49 0 50.8 -7.55Q42.1 -15.1 42.1 -27.92Q42.1 -50.34 64.53 -58.58L84.21 -64.99Q96.11 -69.11 101.83 -75.97Q107.55 -82.84 107.55 -93.82L107.55 -546.9Q107.55 -557.88 101.83 -564.74Q96.11 -571.61 84.21 -575.73L64.53 -582.14Q42.1 -590.37 42.1 -612.8Q42.1 -626.07 50.8 -633.39Q59.49 -640.72 77.8 -640.72ZM231.12 -335.46L359.72 -335.46Q389.01 -335.46 401.59 -347.13Q414.18 -358.8 424.24 -393.12Q428.36 -405.94 435.69 -410.97Q443.01 -416.01 453.08 -416.46Q477.33 -416.46 482.82 -393.12L518.52 -248.96Q522.18 -233.86 517.61 -225.62Q513.03 -217.39 502.05 -213.27Q490.15 -209.15 480.08 -212.81Q470.01 -216.47 460.86 -228.37Q447.59 -247.59 436.14 -258.35Q424.7 -269.1 410.06 -273.22Q395.41 -277.34 372.07 -277.34L231.12 -277.34Z';

const SIZES = {
  small: { box: 20, stroke: 2.5 },
  large: { box: 48, stroke: 3.5 },
} as const;

const ARC_FRACTION = 0.28;
const TURN_DURATION = 900;

type BrandSpinnerProps = {
  accessibilityLabel?: string;
  className?: string;
  /** Arc color. Defaults to the theme's primary action color. */
  color?: string;
  /** `large` adds the F mark in the center for screen- and section-level loading. */
  size?: keyof typeof SIZES;
};

/**
 * Flavoneer loading indicator: a rounded arc on a faint track, matching the
 * 1 px / 14% border language. Use it wherever `ActivityIndicator` would go.
 */
export function BrandSpinner({
  accessibilityLabel,
  className,
  color,
  size = 'small',
}: BrandSpinnerProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const tint = color ?? theme.primary;
  const { box, stroke } = SIZES[size];
  const radius = (box - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    progress.value = reduceMotion
      ? withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true)
      : withRepeat(withTiming(1, { duration: TURN_DURATION, easing: Easing.linear }), -1);

    return () => cancelAnimation(progress);
  }, [progress, reduceMotion]);

  const arcStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - progress.value * 0.55 }
      : { transform: [{ rotate: `${progress.value * 360}deg` }] },
  );

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      className={className}
      style={{ alignItems: 'center', justifyContent: 'center', height: box, width: box }}
    >
      {size === 'large' ? (
        <Svg height={box * 0.42} viewBox="22 -676 578 696" width={box * 0.42}>
          <Path
            d={F_PATH}
            fill={BrandColors.amber}
            stroke={BrandColors.ink}
            strokeLinejoin="round"
            strokeWidth={36}
          />
        </Svg>
      ) : null}
      <Animated.View style={[{ position: 'absolute', height: box, width: box }, arcStyle]}>
        <Svg height={box} width={box}>
          <Circle
            cx={box / 2}
            cy={box / 2}
            fill="none"
            r={radius}
            stroke={tint}
            strokeOpacity={0.16}
            strokeWidth={stroke}
          />
          <Circle
            cx={box / 2}
            cy={box / 2}
            fill="none"
            r={radius}
            stroke={tint}
            strokeDasharray={`${circumference * ARC_FRACTION} ${circumference}`}
            strokeLinecap="round"
            strokeWidth={stroke}
            transform={`rotate(-90 ${box / 2} ${box / 2})`}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

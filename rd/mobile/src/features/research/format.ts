import type { ProductionLineTranslationKey } from '@/features/production-line/i18n';

export type ChipTone = 'amber' | 'green' | 'mint' | 'red';

// Formulation statuses come from `projectStatusValidator` in the backend.
export const formulationStatus: Record<
  string,
  { key: ProductionLineTranslationKey; tone: ChipTone }
> = {
  Draft: { key: 'draft', tone: 'amber' },
  Testing: { key: 'statusTesting', tone: 'mint' },
  Prototype: { key: 'statusPrototype', tone: 'mint' },
  'Under Review': { key: 'statusUnderReview', tone: 'mint' },
  Approved: { key: 'approved', tone: 'green' },
  Released: { key: 'statusReleased', tone: 'green' },
  'On Hold': { key: 'statusOnHold', tone: 'red' },
};

export const materialStatus: Record<string, { key: ProductionLineTranslationKey; tone: ChipTone }> =
  {
    Draft: { key: 'draft', tone: 'amber' },
    Approved: { key: 'approved', tone: 'green' },
  };

export const runStatus: Record<string, { key: ProductionLineTranslationKey; tone: ChipTone }> = {
  completed: { key: 'runCompleted', tone: 'green' },
  failed: { key: 'runFailed', tone: 'red' },
  'In Progress': { key: 'runInProgress', tone: 'amber' },
};

const allergenKeys: Record<string, ProductionLineTranslationKey> = {
  allergen_almonds: 'allergenAlmonds',
  allergen_brazil_nuts: 'allergenBrazilNuts',
  allergen_cashews: 'allergenCashews',
  allergen_celery: 'allergenCelery',
  allergen_cereals_gluten: 'allergenCerealsGluten',
  allergen_crustacean_shellfish: 'allergenCrustaceanShellfish',
  allergen_crustaceans: 'allergenCrustaceans',
  allergen_eggs: 'allergenEggs',
  allergen_fish: 'allergenFish',
  allergen_hazelnuts: 'allergenHazelnuts',
  allergen_lupin: 'allergenLupin',
  allergen_macadamia: 'allergenMacadamia',
  allergen_milk: 'allergenMilk',
  allergen_molluscs: 'allergenMolluscs',
  allergen_mustard: 'allergenMustard',
  allergen_peanuts: 'allergenPeanuts',
  allergen_pecans: 'allergenPecans',
  allergen_pine_nuts: 'allergenPineNuts',
  allergen_pistachios: 'allergenPistachios',
  allergen_sesame: 'allergenSesame',
  allergen_soybeans: 'allergenSoybeans',
  allergen_sulphites: 'allergenSulphites',
  allergen_tree_nuts: 'allergenTreeNuts',
  allergen_walnuts: 'allergenWalnuts',
  allergen_wheat: 'allergenWheat',
};

export function allergenLabel(
  code: string,
  t: (key: ProductionLineTranslationKey) => string,
): string {
  const key = allergenKeys[code];
  if (key) {
    return t(key);
  }
  return code
    .replace(/^allergen_/i, '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Figures use Latin digits in both languages, matching the formulation lab.
function formatNumber(value: number, digits: number) {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatMoney(value: number) {
  return `$${formatNumber(value, 2)}`;
}

export function formatPercent(value: number) {
  return `${formatNumber(value, value >= 10 ? 1 : 2)}%`;
}

/** Batch weight is stored in grams, the formulation lab's default ingredient unit. */
export function formatGrams(grams: number) {
  return grams >= 1000 ? `${formatNumber(grams / 1000, 1)} kg` : `${formatNumber(grams, 1)} g`;
}

export function formatAmount(weight: number, unit = 'g') {
  return `${formatNumber(weight, weight % 1 === 0 ? 0 : 1)} ${unit}`;
}

type BreakdownIngredient = {
  id: string;
  name: string;
  percentage?: number;
  unit?: string;
  weight: number;
};

/** Percentages fall back to each ingredient's share of the summed weight, as the lab computes them. */
export function getIngredientBreakdown(ingredients: BreakdownIngredient[], batchWeight?: number) {
  const totalWeight =
    batchWeight && batchWeight > 0
      ? batchWeight
      : ingredients.reduce((total, ingredient) => total + ingredient.weight, 0);
  const rows = ingredients.map((ingredient) => ({
    ...ingredient,
    share:
      typeof ingredient.percentage === 'number'
        ? ingredient.percentage
        : totalWeight > 0
          ? (ingredient.weight / totalWeight) * 100
          : 0,
  }));
  const massBalance = rows.reduce((total, row) => total + row.share, 0);

  return {
    massBalance,
    // Rounding in stored percentages leaves a small remainder, so half a percent still balances.
    massBalanced: rows.length > 0 && Math.abs(massBalance - 100) <= 0.5,
    rows,
    totalWeight,
  };
}

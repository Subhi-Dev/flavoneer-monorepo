/**
 * Factory folders that apps/qc-floor ships under src/factories/<key>.
 * Add a key here when a new factory folder is added, then assign it to an
 * organization from the super admin page.
 */
export const FACTORY_BASE_KEYS = ["ice-cream-plant", "sauce-plant"] as const;

export type FactoryBaseKey = (typeof FACTORY_BASE_KEYS)[number];

export const FACTORY_BASE_NAMES: Record<FactoryBaseKey, string> = {
  "ice-cream-plant": "Ice cream plant",
  "sauce-plant": "Sauce plant",
};

/** Organizations without an assignment see this factory. */
export const DEFAULT_FACTORY_BASE_KEY: FactoryBaseKey = "sauce-plant";

export function isFactoryBaseKey(value: unknown): value is FactoryBaseKey {
  return typeof value === "string" && (FACTORY_BASE_KEYS as readonly string[]).includes(value);
}

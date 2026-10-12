import type { FactoryBaseKey } from "@flavoneer/backend/factory-bases";
import type { HallLayout, MachineAsset } from "../floor/types";
import type { Language } from "../lib/i18n";

export interface FactoryHall {
  id: string;
  layout: HallLayout;
  name: Record<Language, string>;
}

/**
 * One organization's 3D floor. Each factory lives in its own folder with its
 * models under public/factories/<key>/models.
 */
export interface FactoryBase {
  assets: Record<string, MachineAsset>;
  halls: FactoryHall[];
  key: FactoryBaseKey;
}

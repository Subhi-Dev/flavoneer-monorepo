import type { FactoryBaseKey } from "@flavoneer/backend/factory-bases";
import { iceCreamPlant } from "./ice-cream-plant";
import { saucePlant } from "./sauce-plant";
import type { FactoryBase } from "./types";

export const FACTORY_BASES: Record<FactoryBaseKey, FactoryBase> = {
  "ice-cream-plant": iceCreamPlant,
  "sauce-plant": saucePlant,
};

export type { FactoryBase, FactoryHall } from "./types";

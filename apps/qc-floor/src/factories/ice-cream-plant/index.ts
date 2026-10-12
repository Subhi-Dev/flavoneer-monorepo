import type { FactoryBase } from "../types";
import { ICE_CREAM_ASSETS } from "./assets";
import { PRODUCTION_HALL_1, PRODUCTION_HALL_2 } from "./layout";

export const iceCreamPlant: FactoryBase = {
  key: "ice-cream-plant",
  assets: ICE_CREAM_ASSETS,
  halls: [
    {
      id: "hall1",
      layout: PRODUCTION_HALL_1,
      name: { en: "Production hall 1", ar: "صالة الإنتاج 1" },
    },
    {
      id: "hall2",
      layout: PRODUCTION_HALL_2,
      name: { en: "Production hall 2", ar: "صالة الإنتاج 2" },
    },
  ],
};

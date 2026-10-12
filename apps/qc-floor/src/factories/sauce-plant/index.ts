import type { FactoryBase } from "../types";
import { SAUCE_ASSETS } from "./assets";
import { SAUCE_LINE } from "./layout";

export const saucePlant: FactoryBase = {
  key: "sauce-plant",
  assets: SAUCE_ASSETS,
  halls: [{ id: "sauce-line", layout: SAUCE_LINE, name: { en: "Sauce line", ar: "خط الصلصة" } }],
};

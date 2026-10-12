import type { MachineAsset } from "../../floor/types";

const MODEL_BASE_URL = "/factories/sauce-plant/models";

// These models come from Blender at arbitrary sizes, so each one is fitted to
// its installed envelope (metres) when it loads.
function asset(
  fileName: string,
  dimensions: MachineAsset["dimensions"],
  maxDimension: number,
  ignoredNodes?: readonly string[],
): MachineAsset {
  return {
    dimensions,
    fit: { ignoredNodes, maxDimension },
    modelUrl: `${MODEL_BASE_URL}/${fileName}`,
    source: "reference estimate",
    visualScale: 1,
  };
}

export const SAUCE_ASSETS = {
  "tomato-paste-pasteurizer": asset(
    "tomato-paste-pasteurizer.glb",
    { length: 4.6, width: 1.8, height: 2.65 },
    4.6,
    ["StudioFloor"],
  ),
  "jacketed-mixing-tank": asset(
    "jacketed-mixing-tank.glb",
    { length: 2.4, width: 2.4, height: 3.35 },
    3.4,
  ),
  "process-tank": asset("process-tank.glb", { length: 2.5, width: 2.5, height: 3.55 }, 3.6),
  "mixer-homogenizer": asset(
    "mixer-homogenizer.glb",
    { length: 2.2, width: 1.8, height: 2.75 },
    2.8,
  ),
  "sauce-filling-machine": asset(
    "sauce-filling-machine.glb",
    { length: 4.2, width: 2, height: 2.8 },
    4.4,
  ),
  "container-sanitizer": asset(
    "container-sanitizer.glb",
    { length: 5, width: 1.8, height: 2.7 },
    5,
  ),
  "continuous-spray-sterilizer": asset(
    "continuous-spray-sterilizer.glb",
    { length: 6.8, width: 2.6, height: 3.1 },
    6.8,
  ),
} satisfies Record<string, MachineAsset>;

export type SauceAssetKey = keyof typeof SAUCE_ASSETS;

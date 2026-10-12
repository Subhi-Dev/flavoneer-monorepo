import type { EquipmentPlacement, HallLayout } from "../../floor/types";
import { SAUCE_ASSETS, type SauceAssetKey } from "./assets";

// Ported from Rania's reference production line (rd/formulation-lab, Oct 2026).
const THERMAL = "Thermal processing";
const MIXING = "Mixing & transfer";
const PACKAGING = "Packaging & sanitation";

function machine(
  id: string,
  label: string,
  line: string,
  assetKey: SauceAssetKey,
  x: number,
  z: number,
  rotationY = 0,
  visualScale?: number,
): EquipmentPlacement {
  return {
    assetKey,
    dimensions: SAUCE_ASSETS[assetKey].dimensions,
    id,
    kind: "machine",
    label,
    line,
    position: [x, 0, z],
    rotationY,
    status: "normal",
    visualScale,
  };
}

export const SAUCE_LINE: HallLayout = {
  center: [0.6, -0.3],
  dimensions: { length: 30, width: 34, height: 7 },
  lineZones: [
    {
      id: "thermal-processing",
      label: THERMAL,
      center: [0, -10.2],
      size: [18, 11.8],
      status: "normal",
    },
    { id: "mixing-transfer", label: MIXING, center: [0, -0.5], size: [14, 5], status: "normal" },
    {
      id: "packaging-line",
      label: PACKAGING,
      center: [0, 9.5],
      size: [26, 12],
      status: "normal",
    },
    {
      id: "spice-prep",
      label: "Spice & prep room",
      center: [12.2, -11.2],
      size: [4, 4.6],
      status: "normal",
    },
    {
      id: "service-corridor",
      label: "Service corridor",
      center: [12.2, -3.9],
      size: [4, 7.2],
      status: "normal",
    },
  ],
  equipment: [
    machine(
      "pasteurizer",
      "Horizontal pasteurizer",
      THERMAL,
      "tomato-paste-pasteurizer",
      -5.2,
      -11.8,
      1.57,
      1.2,
    ),
    machine("jacketed-tank", "Jacketed mixing tank", THERMAL, "jacketed-mixing-tank", 0, -7.3, 0.2),
    machine("buffer-tank", "Buffer tank", THERMAL, "process-tank", 5.5, -7.4, -0.3),
    machine("homogenizer", "Homogenizer", THERMAL, "mixer-homogenizer", 4, -12.7, -0.5),
    machine("agitated-tank", "Mixing tank with agitators", MIXING, "process-tank", 0, -0.5),
    machine("sauce-filler", "Sauce filling machine", PACKAGING, "sauce-filling-machine", -8, 9.5),
    machine(
      "container-sanitizer",
      "Container sanitizing tunnel",
      PACKAGING,
      "container-sanitizer",
      -0.5,
      9.5,
    ),
    machine(
      "continuous-sterilizer",
      "Continuous spray sterilizer",
      PACKAGING,
      "continuous-spray-sterilizer",
      7.8,
      9.5,
    ),
  ],
  connections: [
    {
      id: "pasteurizer-to-jacketed",
      kind: "pipe",
      from: "pasteurizer",
      to: "jacketed-tank",
      color: "#6f8e82",
      height: 1.3,
    },
    {
      id: "jacketed-to-buffer",
      kind: "pipe",
      from: "jacketed-tank",
      to: "buffer-tank",
      color: "#6f8e82",
      height: 1.5,
    },
    {
      id: "buffer-to-homogenizer",
      kind: "materialFlow",
      from: "buffer-tank",
      to: "homogenizer",
      color: "#f5a623",
      height: 1.1,
    },
    {
      id: "homogenizer-to-agitated",
      kind: "pipe",
      from: "homogenizer",
      to: "agitated-tank",
      color: "#4f8877",
      height: 1.6,
    },
    {
      id: "agitated-to-filler",
      kind: "materialFlow",
      from: "agitated-tank",
      to: "sauce-filler",
      color: "#ff7738",
      height: 1,
    },
    {
      id: "filler-to-sanitizer",
      kind: "conveyor",
      from: "sauce-filler",
      to: "container-sanitizer",
      color: "#168aad",
      height: 0.35,
    },
    {
      id: "sanitizer-to-continuous",
      kind: "conveyor",
      from: "container-sanitizer",
      to: "continuous-sterilizer",
      color: "#168aad",
      height: 0.35,
    },
  ],
};

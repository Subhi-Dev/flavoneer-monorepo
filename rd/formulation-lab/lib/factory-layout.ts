export const factoryMachineAssetKeys = [
  "tomato-paste-pasteurizer",
  "jacketed-mixing-tank",
  "process-tank",
  "mixer-homogenizer",
  "sauce-filling-machine",
  "container-sanitizer",
  "continuous-spray-sterilizer",
] as const;

export type FactoryMachineAssetKey = (typeof factoryMachineAssetKeys)[number];
export type FactoryConnectionKind = "pipe" | "conveyor" | "materialFlow";

export interface FactoryLayoutMachine {
  assetKey: FactoryMachineAssetKey;
  color: string;
  label: string;
  machineKey: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationY: number;
  scale: number;
  sortOrder: number;
  visible: boolean;
}

export interface FactoryLayoutConnection {
  color: string;
  connectionKey: string;
  fromMachineKey: string;
  height: number;
  kind: FactoryConnectionKind;
  sortOrder: number;
  toMachineKey: string;
  visible: boolean;
}

export interface FactoryLayoutZone {
  color: string;
  depth: number;
  label: string;
  positionX: number;
  positionZ: number;
  sortOrder: number;
  visible: boolean;
  width: number;
  zoneKey: string;
}

export interface FactoryLayoutDefinition {
  connections: FactoryLayoutConnection[];
  machines: FactoryLayoutMachine[];
  name: string;
  zones: FactoryLayoutZone[];
}

export const factoryAssetLabels: Record<FactoryMachineAssetKey, string> = {
  "tomato-paste-pasteurizer": "Horizontal pasteurizer",
  "jacketed-mixing-tank": "Jacketed mixing tank",
  "process-tank": "Agitated process tank",
  "mixer-homogenizer": "Mixer / homogenizer",
  "sauce-filling-machine": "Sauce filling machine",
  "container-sanitizer": "Container sanitizer",
  "continuous-spray-sterilizer": "Continuous spray sterilizer",
};

/** Non-equipment authoring helpers that must not affect GLB normalization. */
export const factoryAssetIgnoredSceneNodeNames: Partial<
  Record<FactoryMachineAssetKey, readonly string[]>
> = {
  "tomato-paste-pasteurizer": ["StudioFloor"],
};

export interface FactoryAssetPhysicalEnvelopeMeters {
  depth: number;
  height: number;
  width: number;
}

/**
 * Operational envelopes in metres. Width and depth describe the installed
 * machine footprint before the mandatory personnel safety clearance is added.
 */
export const factoryAssetPhysicalEnvelopesMeters: Record<
  FactoryMachineAssetKey,
  FactoryAssetPhysicalEnvelopeMeters
> = {
  "tomato-paste-pasteurizer": { width: 4.6, depth: 1.8, height: 2.65 },
  "jacketed-mixing-tank": { width: 2.4, depth: 2.4, height: 3.35 },
  "process-tank": { width: 2.5, depth: 2.5, height: 3.55 },
  "mixer-homogenizer": { width: 2.2, depth: 1.8, height: 2.75 },
  "sauce-filling-machine": { width: 4.2, depth: 2, height: 2.8 },
  "container-sanitizer": { width: 5, depth: 1.8, height: 2.7 },
  "continuous-spray-sterilizer": { width: 6.8, depth: 2.6, height: 3.1 },
};

export const factoryMachineSafetyClearanceMeters = 1.2;

/**
 * Approximate real-world longest dimension used to normalize differently-authored
 * GLB files into one coherent factory scale. The editable machine `scale` remains
 * a fine-tuning multiplier on top of this physical envelope.
 */
export const factoryAssetTargetMaxDimensionMeters: Record<
  FactoryMachineAssetKey,
  number
> = {
  "tomato-paste-pasteurizer": 4.6,
  "jacketed-mixing-tank": 3.4,
  "process-tank": 3.6,
  "mixer-homogenizer": 2.8,
  "sauce-filling-machine": 4.4,
  "container-sanitizer": 5,
  "continuous-spray-sterilizer": 6.8,
};

export const referenceFactoryLayout: FactoryLayoutDefinition = {
  name: "Flavoneer reference production line",
  zones: [
    {
      zoneKey: "thermal-processing",
      label: "Thermal processing",
      color: "#ead9f8",
      positionX: 0,
      positionZ: -10.2,
      width: 18,
      depth: 11.8,
      sortOrder: 0,
      visible: true,
    },
    {
      zoneKey: "mixing-transfer",
      label: "Mixing & transfer",
      color: "#d9edf7",
      positionX: 0,
      positionZ: -0.5,
      width: 14,
      depth: 5,
      sortOrder: 1,
      visible: true,
    },
    {
      zoneKey: "packaging-line",
      label: "Packaging & sanitation",
      color: "#ffe3bc",
      positionX: 0,
      positionZ: 9.5,
      width: 26,
      depth: 12,
      sortOrder: 2,
      visible: true,
    },
    {
      zoneKey: "spice-prep",
      label: "Spice & prep room",
      color: "#d2f2d4",
      positionX: 12.2,
      positionZ: -11.2,
      width: 4,
      depth: 4.6,
      sortOrder: 3,
      visible: true,
    },
    {
      zoneKey: "service-corridor",
      label: "Service corridor",
      color: "#e4eee8",
      positionX: 12.2,
      positionZ: -3.9,
      width: 4,
      depth: 7.2,
      sortOrder: 4,
      visible: true,
    },
  ],
  machines: [
    {
      machineKey: "pasteurizer",
      assetKey: "tomato-paste-pasteurizer",
      label: "Horizontal pasteurizer",
      color: "#a56cc1",
      positionX: -5.2,
      positionY: 0,
      positionZ: -11.8,
      rotationY: 1.57,
      scale: 1.2,
      sortOrder: 0,
      visible: true,
    },
    {
      machineKey: "jacketed-tank",
      assetKey: "jacketed-mixing-tank",
      label: "Jacketed mixing tank",
      color: "#bd8bcc",
      positionX: 0,
      positionY: 0,
      positionZ: -7.3,
      rotationY: 0.2,
      scale: 1,
      sortOrder: 1,
      visible: true,
    },
    {
      machineKey: "buffer-tank",
      assetKey: "process-tank",
      label: "Buffer tank",
      color: "#cf9ed8",
      positionX: 5.5,
      positionY: 0,
      positionZ: -7.4,
      rotationY: -0.3,
      scale: 1,
      sortOrder: 2,
      visible: true,
    },
    {
      machineKey: "homogenizer",
      assetKey: "mixer-homogenizer",
      label: "Homogenizer",
      color: "#f5a623",
      positionX: 4,
      positionY: 0,
      positionZ: -12.7,
      rotationY: -0.5,
      scale: 1,
      sortOrder: 3,
      visible: true,
    },
    {
      machineKey: "agitated-tank",
      assetKey: "process-tank",
      label: "Mixing tank with agitators",
      color: "#73a9c2",
      positionX: 0,
      positionY: 0,
      positionZ: -0.5,
      rotationY: 0,
      scale: 1,
      sortOrder: 4,
      visible: true,
    },
    {
      machineKey: "sauce-filler",
      assetKey: "sauce-filling-machine",
      label: "Sauce filling machine",
      color: "#ffb965",
      positionX: -8,
      positionY: 0,
      positionZ: 9.5,
      rotationY: 0,
      scale: 1,
      sortOrder: 5,
      visible: true,
    },
    {
      machineKey: "container-sanitizer",
      assetKey: "container-sanitizer",
      label: "Container sanitizing tunnel",
      color: "#ff8f5e",
      positionX: -0.5,
      positionY: 0,
      positionZ: 9.5,
      rotationY: 0,
      scale: 1,
      sortOrder: 6,
      visible: true,
    },
    {
      machineKey: "continuous-sterilizer",
      assetKey: "continuous-spray-sterilizer",
      label: "Continuous spray sterilizer",
      color: "#f5a623",
      positionX: 7.8,
      positionY: 0,
      positionZ: 9.5,
      rotationY: 0,
      scale: 1,
      sortOrder: 7,
      visible: true,
    },
  ],
  connections: [
    {
      connectionKey: "pasteurizer-to-jacketed",
      kind: "pipe",
      fromMachineKey: "pasteurizer",
      toMachineKey: "jacketed-tank",
      color: "#6f8e82",
      height: 1.3,
      sortOrder: 0,
      visible: true,
    },
    {
      connectionKey: "jacketed-to-buffer",
      kind: "pipe",
      fromMachineKey: "jacketed-tank",
      toMachineKey: "buffer-tank",
      color: "#6f8e82",
      height: 1.5,
      sortOrder: 1,
      visible: true,
    },
    {
      connectionKey: "buffer-to-homogenizer",
      kind: "materialFlow",
      fromMachineKey: "buffer-tank",
      toMachineKey: "homogenizer",
      color: "#f5a623",
      height: 1.1,
      sortOrder: 2,
      visible: true,
    },
    {
      connectionKey: "homogenizer-to-agitated",
      kind: "pipe",
      fromMachineKey: "homogenizer",
      toMachineKey: "agitated-tank",
      color: "#4f8877",
      height: 1.6,
      sortOrder: 3,
      visible: true,
    },
    {
      connectionKey: "agitated-to-filler",
      kind: "materialFlow",
      fromMachineKey: "agitated-tank",
      toMachineKey: "sauce-filler",
      color: "#ff7738",
      height: 1.0,
      sortOrder: 4,
      visible: true,
    },
    {
      connectionKey: "filler-to-sanitizer",
      kind: "conveyor",
      fromMachineKey: "sauce-filler",
      toMachineKey: "container-sanitizer",
      color: "#168aad",
      height: 0.35,
      sortOrder: 5,
      visible: true,
    },
    {
      connectionKey: "sanitizer-to-continuous",
      kind: "conveyor",
      fromMachineKey: "container-sanitizer",
      toMachineKey: "continuous-sterilizer",
      color: "#168aad",
      height: 0.35,
      sortOrder: 6,
      visible: true,
    },
  ],
};

export function cloneFactoryLayout(
  layout: FactoryLayoutDefinition
): FactoryLayoutDefinition {
  return {
    name: layout.name,
    machines: layout.machines.map((machine) => ({ ...machine })),
    connections: layout.connections.map((connection) => ({ ...connection })),
    zones: layout.zones.map((zone) => ({ ...zone })),
  };
}

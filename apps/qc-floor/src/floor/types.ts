export type EquipmentStatus = "normal" | "pending" | "attention" | "unknown";

export type EquipmentKind = "machine" | "facility";

export interface EquipmentDimensions {
  length: number;
  width: number;
  height: number;
}

export interface EquipmentPlacement {
  assetKey?: string;
  dimensions: EquipmentDimensions;
  id: string;
  kind: EquipmentKind;
  label: string;
  line: string;
  position: [number, number, number];
  rotationY?: number;
  selectable?: boolean;
  status: EquipmentStatus;
  visualScale?: number;
}

export interface MachineAsset {
  dimensions: EquipmentDimensions;
  /**
   * Scale models that were not authored in metres so they fill `dimensions`:
   * the longest side matches `maxDimension` without exceeding the height.
   */
  fit?: {
    ignoredNodes?: readonly string[];
    maxDimension: number;
  };
  modelUrl: string;
  source: "manufacturer" | "manual" | "reference estimate";
  visualScale?: number;
}

export type FlowConnectionKind = "pipe" | "conveyor" | "materialFlow";

export interface FlowConnection {
  color: string;
  from: string;
  height: number;
  id: string;
  kind: FlowConnectionKind;
  to: string;
}

export interface LineZone {
  id: string;
  label: string;
  center: [number, number];
  size: [number, number];
  status: EquipmentStatus;
}

export interface HallLayout {
  center?: [number, number];
  connections?: FlowConnection[];
  dimensions: EquipmentDimensions;
  entrance?: {
    side: "left" | "right";
    width: number;
  };
  equipment: EquipmentPlacement[];
  lineZones: LineZone[];
  partitions?: Array<{
    center: [number, number];
    length: number;
  }>;
}

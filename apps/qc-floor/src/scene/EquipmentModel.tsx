import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Box3, Group, type Material, Mesh, type Object3D, Vector3 } from "three";
import type { EquipmentPlacement, MachineAsset } from "../floor/types";

const STATUS_COLOR = {
  attention: "#ff7738",
  normal: "#3f8069",
  pending: "#f5a623",
  unknown: "#789087",
};

interface EquipmentModelProps {
  asset: MachineAsset;
  equipment: EquipmentPlacement;
  onHoverLine: (line: string | null) => void;
  onSelect: (line: string) => void;
  selected: boolean;
}

function cloneMaterial(material: Material | Material[]) {
  return Array.isArray(material) ? material.map((item) => item.clone()) : material.clone();
}

/** Scales a model to its metric envelope and sets it on the floor, centred. */
function fitToEnvelope(model: Object3D, asset: MachineAsset) {
  if (!asset.fit) {
    return model;
  }
  for (const nodeName of asset.fit.ignoredNodes ?? []) {
    model.getObjectByName(nodeName)?.removeFromParent();
  }
  model.updateMatrixWorld(true);
  const size = new Box3().setFromObject(model).getSize(new Vector3());
  const largestSide = Math.max(size.x, size.y, size.z, 0.001);
  model.scale.multiplyScalar(
    Math.min(
      asset.fit.maxDimension / largestSide,
      asset.dimensions.height / Math.max(size.y, 0.001),
    ),
  );
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model);
  const center = box.getCenter(new Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;

  const wrapper = new Group();
  wrapper.add(model);
  return wrapper;
}

export function EquipmentModel({
  asset,
  equipment,
  onHoverLine,
  onSelect,
  selected,
}: EquipmentModelProps) {
  const selectable = equipment.selectable !== false;
  const visualScale = equipment.visualScale ?? asset.visualScale ?? 1;
  const gltf = useGLTF(asset.modelUrl);
  const model = useMemo(() => {
    const next = gltf.scene.clone(true);
    next.traverse((child: Object3D) => {
      if (child instanceof Mesh) {
        child.material = cloneMaterial(child.material);
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return fitToEnvelope(next, asset);
  }, [asset, gltf.scene]);

  const active = selectable && selected;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: The WebGL group has a keyboard-accessible DOM list fallback.
    <group
      onClick={(event) => {
        if (!selectable) {
          return;
        }
        event.stopPropagation();
        onSelect(equipment.line);
      }}
      onPointerEnter={(event) => {
        if (!selectable) {
          return;
        }
        event.stopPropagation();
        document.body.style.cursor = "pointer";
        onHoverLine(equipment.line);
      }}
      onPointerLeave={() => {
        document.body.style.cursor = "default";
        onHoverLine(null);
      }}
      position={equipment.position}
      rotation={[0, equipment.rotationY ?? 0, 0]}
    >
      {active ? (
        <mesh position={[0, 0.045, 0]} receiveShadow>
          <boxGeometry
            args={[
              equipment.dimensions.length * visualScale + 0.55,
              0.08,
              equipment.dimensions.width * visualScale + 0.55,
            ]}
          />
          <meshStandardMaterial
            color={STATUS_COLOR[equipment.status]}
            emissive={STATUS_COLOR[equipment.status]}
            emissiveIntensity={0.35}
            transparent
            opacity={0.78}
          />
        </mesh>
      ) : null}
      <primitive object={model} scale={[visualScale, visualScale, visualScale]} />
    </group>
  );
}

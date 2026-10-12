import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CatmullRomCurve3, Color, type Mesh, Vector3 } from "three";
import type { EquipmentPlacement, FlowConnection, HallLayout } from "../floor/types";

const FLOW_DOT_OFFSETS = [0, 0.2, 0.4, 0.6, 0.8];
const FLOW_SPEED = 0.11;
// Keeps the belt from running into the machines at either end.
const CONVEYOR_END_GAP = 2.3;

function connectionCurve(from: EquipmentPlacement, to: EquipmentPlacement, height: number) {
  const start = new Vector3(
    from.position[0],
    Math.max(0.3, from.position[1] + height),
    from.position[2],
  );
  const end = new Vector3(to.position[0], Math.max(0.3, to.position[1] + height), to.position[2]);
  const midpointX = (start.x + end.x) / 2;
  return new CatmullRomCurve3(
    [
      start,
      new Vector3(midpointX, start.y + 0.25, start.z),
      new Vector3(midpointX, end.y + 0.25, end.z),
      end,
    ],
    false,
    "catmullrom",
    0.16,
  );
}

function Conveyor({
  connection,
  from,
  to,
}: {
  connection: FlowConnection;
  from: EquipmentPlacement;
  to: EquipmentPlacement;
}) {
  const dx = to.position[0] - from.position[0];
  const dz = to.position[2] - from.position[2];
  const length = Math.max(0.8, Math.hypot(dx, dz) - CONVEYOR_END_GAP);
  return (
    <group
      position={[
        (from.position[0] + to.position[0]) / 2,
        connection.height,
        (from.position[2] + to.position[2]) / 2,
      ]}
      rotation={[0, -Math.atan2(dz, dx), 0]}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[length, 0.16, 0.7]} />
        <meshStandardMaterial color={connection.color} metalness={0.18} roughness={0.44} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 0, side * 0.39]}>
          <boxGeometry args={[length, 0.19, 0.07]} />
          <meshStandardMaterial color="#a6b2b0" metalness={0.9} roughness={0.24} />
        </mesh>
      ))}
    </group>
  );
}

function FlowDots({ color, curve }: { color: string; curve: CatmullRomCurve3 }) {
  const dots = useRef<Array<Mesh | null>>([]);
  const reducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useFrame(({ clock, invalidate }) => {
    const elapsed = reducedMotion ? 0 : clock.getElapsedTime();
    dots.current.forEach((dot, index) => {
      dot?.position.copy(curve.getPoint((elapsed * FLOW_SPEED + FLOW_DOT_OFFSETS[index]) % 1));
    });
    if (!reducedMotion) {
      invalidate();
    }
  });

  return (
    <>
      {FLOW_DOT_OFFSETS.map((offset, index) => (
        <mesh
          key={offset}
          position={curve.getPoint(offset)}
          ref={(mesh) => {
            dots.current[index] = mesh;
          }}
        >
          <sphereGeometry args={[0.12, 18, 18]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </>
  );
}

function Pipe({
  connection,
  from,
  to,
}: {
  connection: FlowConnection;
  from: EquipmentPlacement;
  to: EquipmentPlacement;
}) {
  const curve = useMemo(
    () => connectionCurve(from, to, connection.height),
    [connection.height, from, to],
  );
  const isPipe = connection.kind === "pipe";
  const emissive = useMemo(() => new Color(connection.color), [connection.color]);

  return (
    <>
      <mesh castShadow>
        <tubeGeometry args={[curve, 48, isPipe ? 0.11 : 0.065, 12, false]} />
        <meshStandardMaterial
          color={connection.color}
          emissive={isPipe ? undefined : emissive}
          emissiveIntensity={isPipe ? 0 : 0.35}
          metalness={isPipe ? 0.78 : 0.16}
          roughness={isPipe ? 0.25 : 0.4}
        />
      </mesh>
      {connection.kind === "materialFlow" ? (
        <FlowDots color={connection.color} curve={curve} />
      ) : null}
    </>
  );
}

/** Pipes, conveyors and animated material flow between machines in a hall. */
export function FlowConnections({ layout }: { layout: HallLayout }) {
  const equipmentById = useMemo(
    () => new Map(layout.equipment.map((equipment) => [equipment.id, equipment])),
    [layout.equipment],
  );

  return (
    <>
      {layout.connections?.map((connection) => {
        const from = equipmentById.get(connection.from);
        const to = equipmentById.get(connection.to);
        if (!(from && to)) {
          return null;
        }
        const Component = connection.kind === "conveyor" ? Conveyor : Pipe;
        return <Component connection={connection} from={from} key={connection.id} to={to} />;
      })}
    </>
  );
}

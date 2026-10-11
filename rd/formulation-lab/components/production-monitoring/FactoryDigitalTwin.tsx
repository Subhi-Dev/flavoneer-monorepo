import { useEffect, useMemo, useRef, useState } from "react";
// biome-ignore lint/performance/noNamespaceImport: Three.js scene construction uses its runtime namespace extensively.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type {
  FactoryLayoutConnection,
  FactoryLayoutMachine,
  FactoryLayoutZone,
} from "../../lib/factory-layout";
import {
  factoryAssetIgnoredSceneNodeNames,
  factoryAssetPhysicalEnvelopesMeters,
  factoryAssetTargetMaxDimensionMeters,
  factoryMachineSafetyClearanceMeters,
} from "../../lib/factory-layout";
import { readFactoryModelAssets } from "./factory-model-assets";

const PARTITION_HEIGHT = 2.65;
const PARTITION_THICKNESS = 0.14;
const DOORWAY_WIDTH = 2.1;
const DOORWAY_HEADER_HEIGHT = 0.36;

type PartitionSide = "east" | "north" | "south" | "west";

interface DoorwayOpening {
  offset: number;
  width?: number;
}

interface WalkwayDefinition {
  depth: number;
  width: number;
  x: number;
  z: number;
}

const zoneDoorways: Record<
  string,
  Partial<Record<PartitionSide, DoorwayOpening[]>>
> = {
  "thermal-processing": {
    south: [{ offset: 0 }],
    east: [{ offset: -1.2 }, { offset: 3.8 }],
  },
  "mixing-transfer": {
    north: [{ offset: 0 }],
    south: [{ offset: 0 }],
    east: [{ offset: -1.2 }],
  },
  "packaging-line": {
    north: [{ offset: 0 }, { offset: 11.4 }],
    south: [{ offset: 0 }],
  },
  "spice-prep": {
    south: [{ offset: 0 }],
    west: [{ offset: 0 }],
  },
  "service-corridor": {
    north: [{ offset: 0 }],
    south: [{ offset: 0 }],
    west: [{ offset: -2.3 }, { offset: 2.2 }],
  },
};

const referenceWalkways: WalkwayDefinition[] = [
  { x: 0, z: -3.65, width: 3.2, depth: 1.3 },
  { x: 0, z: 2.75, width: 3.2, depth: 1.5 },
  { x: 9.6, z: -11.2, width: 1.2, depth: 2.2 },
  { x: 9.6, z: -6.2, width: 1.2, depth: 2.2 },
  { x: 8.6, z: -1.7, width: 3.2, depth: 2.1 },
  { x: 12.2, z: -8.2, width: 2.2, depth: 1.4 },
  { x: 12.2, z: 1.6, width: 2.2, depth: 3.8 },
];

interface FactoryDigitalTwinProps {
  connections: FactoryLayoutConnection[];
  machines: FactoryLayoutMachine[];
  onSelectMachine: (machineKey: string | null) => void;
  selectedMachineKey: string | null;
  zones: FactoryLayoutZone[];
}

interface AnimatedFlowDot {
  curve: THREE.CatmullRomCurve3;
  mesh: THREE.Mesh;
  offset: number;
}

function addPartitionSegment({
  end,
  fixedPosition,
  horizontal,
  room,
  start,
  trimMaterial,
  wallMaterial,
}: {
  end: number;
  fixedPosition: number;
  horizontal: boolean;
  room: THREE.Group;
  start: number;
  trimMaterial: THREE.Material;
  wallMaterial: THREE.Material;
}) {
  const length = end - start;
  if (length < 0.12) {
    return;
  }
  const center = (start + end) / 2;
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(
      horizontal ? length : PARTITION_THICKNESS,
      PARTITION_HEIGHT,
      horizontal ? PARTITION_THICKNESS : length
    ),
    wallMaterial
  );
  wall.position.set(
    horizontal ? center : fixedPosition,
    PARTITION_HEIGHT / 2 + 0.1,
    horizontal ? fixedPosition : center
  );
  wall.castShadow = true;
  wall.receiveShadow = true;
  room.add(wall);

  const topTrim = new THREE.Mesh(
    new THREE.BoxGeometry(
      horizontal ? length + 0.03 : PARTITION_THICKNESS + 0.03,
      0.08,
      horizontal ? PARTITION_THICKNESS + 0.03 : length + 0.03
    ),
    trimMaterial
  );
  topTrim.position.set(
    horizontal ? center : fixedPosition,
    PARTITION_HEIGHT + 0.13,
    horizontal ? fixedPosition : center
  );
  topTrim.castShadow = true;
  room.add(topTrim);
}

function addPartitionSide({
  fixedPosition,
  horizontal,
  length,
  openings,
  room,
  trimMaterial,
  wallMaterial,
}: {
  fixedPosition: number;
  horizontal: boolean;
  length: number;
  openings: DoorwayOpening[];
  room: THREE.Group;
  trimMaterial: THREE.Material;
  wallMaterial: THREE.Material;
}) {
  const halfLength = length / 2;
  const edgeMargin = 0.42;
  const normalizedOpenings = openings
    .map((opening) => {
      const width = Math.min(opening.width ?? DOORWAY_WIDTH, length - 1);
      const center = THREE.MathUtils.clamp(
        opening.offset,
        -halfLength + edgeMargin + width / 2,
        halfLength - edgeMargin - width / 2
      );
      return { center, end: center + width / 2, start: center - width / 2 };
    })
    .sort((first, second) => first.start - second.start);

  let cursor = -halfLength;
  for (const opening of normalizedOpenings) {
    addPartitionSegment({
      end: opening.start,
      fixedPosition,
      horizontal,
      room,
      start: cursor,
      trimMaterial,
      wallMaterial,
    });

    const header = new THREE.Mesh(
      new THREE.BoxGeometry(
        horizontal ? opening.end - opening.start : PARTITION_THICKNESS,
        DOORWAY_HEADER_HEIGHT,
        horizontal ? PARTITION_THICKNESS : opening.end - opening.start
      ),
      wallMaterial
    );
    header.position.set(
      horizontal ? opening.center : fixedPosition,
      PARTITION_HEIGHT - DOORWAY_HEADER_HEIGHT / 2 + 0.1,
      horizontal ? fixedPosition : opening.center
    );
    header.castShadow = true;
    room.add(header);

    for (const doorwayEdge of [opening.start, opening.end]) {
      const jamb = new THREE.Mesh(
        new THREE.BoxGeometry(
          horizontal ? 0.08 : PARTITION_THICKNESS + 0.04,
          PARTITION_HEIGHT - DOORWAY_HEADER_HEIGHT,
          horizontal ? PARTITION_THICKNESS + 0.04 : 0.08
        ),
        trimMaterial
      );
      jamb.position.set(
        horizontal ? doorwayEdge : fixedPosition,
        (PARTITION_HEIGHT - DOORWAY_HEADER_HEIGHT) / 2 + 0.1,
        horizontal ? fixedPosition : doorwayEdge
      );
      room.add(jamb);
    }
    cursor = opening.end;
  }

  addPartitionSegment({
    end: halfLength,
    fixedPosition,
    horizontal,
    room,
    start: cursor,
    trimMaterial,
    wallMaterial,
  });
}

function createZoneRoom(zone: FactoryLayoutZone) {
  const room = new THREE.Group();
  room.name = zone.label;
  room.userData.zoneKey = zone.zoneKey;

  const zoneColor = new THREE.Color(zone.color);
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(zone.width, 0.1, zone.depth),
    new THREE.MeshStandardMaterial({
      color: zoneColor,
      roughness: 0.8,
      metalness: 0.02,
    })
  );
  floor.position.y = 0.05;
  floor.receiveShadow = true;
  room.add(floor);

  const aisleInset = Math.min(
    factoryMachineSafetyClearanceMeters,
    zone.width / 4,
    zone.depth / 4
  );
  const aislePoints = [
    new THREE.Vector3(
      -zone.width / 2 + aisleInset,
      0.115,
      -zone.depth / 2 + aisleInset
    ),
    new THREE.Vector3(
      zone.width / 2 - aisleInset,
      0.115,
      -zone.depth / 2 + aisleInset
    ),
    new THREE.Vector3(
      zone.width / 2 - aisleInset,
      0.115,
      zone.depth / 2 - aisleInset
    ),
    new THREE.Vector3(
      -zone.width / 2 + aisleInset,
      0.115,
      zone.depth / 2 - aisleInset
    ),
  ];
  const aisleBoundary = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(aislePoints),
    new THREE.LineDashedMaterial({
      color: "#f0b429",
      dashSize: 0.42,
      gapSize: 0.24,
      transparent: true,
      opacity: 0.82,
    })
  );
  aisleBoundary.computeLineDistances();
  room.add(aisleBoundary);

  const wallColor = zoneColor.clone().lerp(new THREE.Color("#f5fbf7"), 0.72);
  const wallMaterial = new THREE.MeshPhysicalMaterial({
    color: wallColor,
    transparent: true,
    opacity: 0.78,
    roughness: 0.38,
    metalness: 0.08,
    transmission: 0.08,
    side: THREE.DoubleSide,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: zoneColor.clone().lerp(new THREE.Color("#173e33"), 0.42),
    roughness: 0.32,
    metalness: 0.64,
  });
  const doorwayConfiguration = zoneDoorways[zone.zoneKey] ?? {
    south: [{ offset: 0 }],
  };

  const partitionSides: Array<{
    fixedPosition: number;
    horizontal: boolean;
    length: number;
    side: PartitionSide;
  }> = [
    {
      side: "north",
      horizontal: true,
      length: zone.width,
      fixedPosition: -zone.depth / 2,
    },
    {
      side: "south",
      horizontal: true,
      length: zone.width,
      fixedPosition: zone.depth / 2,
    },
    {
      side: "west",
      horizontal: false,
      length: zone.depth,
      fixedPosition: -zone.width / 2,
    },
    {
      side: "east",
      horizontal: false,
      length: zone.depth,
      fixedPosition: zone.width / 2,
    },
  ];

  for (const side of partitionSides) {
    addPartitionSide({
      ...side,
      openings: doorwayConfiguration[side.side] ?? [],
      room,
      trimMaterial,
      wallMaterial,
    });
  }

  for (const x of [-zone.width / 2, zone.width / 2]) {
    for (const z of [-zone.depth / 2, zone.depth / 2]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(
          PARTITION_THICKNESS * 0.72,
          PARTITION_THICKNESS * 0.82,
          PARTITION_HEIGHT + 0.18,
          12
        ),
        trimMaterial
      );
      post.position.set(x, PARTITION_HEIGHT / 2 + 0.12, z);
      post.castShadow = true;
      room.add(post);
    }
  }

  const label = createLabelSprite(zone.label, zone.color, 3.6);
  label.position.set(0, PARTITION_HEIGHT + 0.55, -zone.depth / 2 + 0.55);
  room.add(label);
  room.position.set(zone.positionX, 0, zone.positionZ);
  return room;
}

function createWalkway(definition: WalkwayDefinition) {
  const walkway = new THREE.Group();
  const surface = new THREE.Mesh(
    new THREE.BoxGeometry(definition.width, 0.055, definition.depth),
    new THREE.MeshStandardMaterial({
      color: "#bddfca",
      roughness: 0.92,
      metalness: 0,
    })
  );
  surface.position.y = 0.075;
  surface.receiveShadow = true;
  walkway.add(surface);

  const borderPoints = [
    new THREE.Vector3(-definition.width / 2, 0.108, -definition.depth / 2),
    new THREE.Vector3(definition.width / 2, 0.108, -definition.depth / 2),
    new THREE.Vector3(definition.width / 2, 0.108, definition.depth / 2),
    new THREE.Vector3(-definition.width / 2, 0.108, definition.depth / 2),
  ];
  walkway.add(
    new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(borderPoints),
      new THREE.LineBasicMaterial({ color: "#f0b429" })
    )
  );
  walkway.position.set(definition.x, 0, definition.z);
  return walkway;
}

function createMachineSafetyClearance(machine: FactoryLayoutMachine) {
  const envelope = factoryAssetPhysicalEnvelopesMeters[machine.assetKey];
  const width =
    envelope.width * machine.scale + factoryMachineSafetyClearanceMeters * 2;
  const depth =
    envelope.depth * machine.scale + factoryMachineSafetyClearanceMeters * 2;
  const clearance = new THREE.Group();
  const surface = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.035, depth),
    new THREE.MeshBasicMaterial({
      color: "#f7cf59",
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    })
  );
  surface.position.y = 0.105;
  clearance.add(surface);

  const outlinePoints = [
    new THREE.Vector3(-width / 2, 0.128, -depth / 2),
    new THREE.Vector3(width / 2, 0.128, -depth / 2),
    new THREE.Vector3(width / 2, 0.128, depth / 2),
    new THREE.Vector3(-width / 2, 0.128, depth / 2),
  ];
  const outline = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(outlinePoints),
    new THREE.LineDashedMaterial({
      color: "#df8b18",
      dashSize: 0.32,
      gapSize: 0.2,
      transparent: true,
      opacity: 0.9,
    })
  );
  outline.computeLineDistances();
  clearance.add(outline);
  return clearance;
}

function createLabelSprite(text: string, background: string, scale = 2.8) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.Sprite();
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = background;
  context.beginPath();
  context.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 34);
  context.fill();
  context.strokeStyle = "rgba(23, 62, 51, 0.22)";
  context.lineWidth = 5;
  context.stroke();
  context.fillStyle = "#173e33";
  context.font = "700 48px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2, 700);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale * 0.208, 1);
  return sprite;
}

function makeConnectionCurve(
  from: FactoryLayoutMachine,
  to: FactoryLayoutMachine,
  height: number
) {
  const start = new THREE.Vector3(
    from.positionX,
    Math.max(0.3, from.positionY + height),
    from.positionZ
  );
  const end = new THREE.Vector3(
    to.positionX,
    Math.max(0.3, to.positionY + height),
    to.positionZ
  );
  const midpointX = (start.x + end.x) / 2;
  return new THREE.CatmullRomCurve3(
    [
      start,
      new THREE.Vector3(midpointX, start.y + 0.25, start.z),
      new THREE.Vector3(midpointX, end.y + 0.25, end.z),
      end,
    ],
    false,
    "catmullrom",
    0.16
  );
}

export function FactoryDigitalTwin({
  connections,
  machines,
  onSelectMachine,
  selectedMachineKey,
  zones,
}: FactoryDigitalTwinProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);
  const assetKeys = useMemo(
    () =>
      machines
        .filter((machine) => machine.visible)
        .map((machine) => machine.assetKey),
    [machines]
  );
  const modelAssets = useMemo(
    () => readFactoryModelAssets(assetKeys),
    [assetKeys]
  );

  if (runtimeError) {
    throw runtimeError;
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#102f27");
    scene.fog = new THREE.Fog("#102f27", 28, 58);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    camera.position.set(22, 24, 26);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
    });
    if (!context) {
      setRuntimeError(
        new Error(
          "WebGL 2 is unavailable. Enable hardware acceleration or use a browser and GPU that support WebGL 2."
        )
      );
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas,
        context,
        powerPreference: "high-performance",
      });
    } catch (error) {
      setRuntimeError(
        new Error("Unable to initialize the WebGL renderer.", { cause: error })
      );
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D factory layout"
    );
    renderer.domElement.style.display = "block";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.width = "100%";
    container.appendChild(renderer.domElement);
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setRuntimeError(
        new Error(
          "The WebGL context was lost. Close other graphics-heavy tabs and retry the 3D view."
        )
      );
    };
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minDistance = 12;
    controls.maxDistance = 52;
    controls.target.set(0, 0.8, 0);

    scene.add(new THREE.HemisphereLight("#f7f4df", "#173e33", 2.5));
    const keyLight = new THREE.DirectionalLight("#fff7db", 3.2);
    keyLight.position.set(-10, 20, 12);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -25;
    keyLight.shadow.camera.right = 25;
    keyLight.shadow.camera.top = 25;
    keyLight.shadow.camera.bottom = -25;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight("#9ad5c2", 1.8);
    fillLight.position.set(16, 10, -14);
    scene.add(fillLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 36),
      new THREE.MeshStandardMaterial({
        color: "#e8f1e7",
        roughness: 0.92,
        metalness: 0.02,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(30, 30, "#4f8877", "#a9cbbb");
    grid.position.y = 0.012;
    const gridMaterials = Array.isArray(grid.material)
      ? grid.material
      : [grid.material];
    for (const material of gridMaterials) {
      material.transparent = true;
      material.opacity = 0.18;
    }
    scene.add(grid);

    for (const zone of zones.filter((item) => item.visible)) {
      scene.add(createZoneRoom(zone));
    }
    for (const walkway of referenceWalkways) {
      scene.add(createWalkway(walkway));
    }

    const visibleMachines = machines.filter((machine) => machine.visible);
    const machineByKey = new Map(
      visibleMachines.map((machine) => [machine.machineKey, machine])
    );
    const selectableGroups: THREE.Group[] = [];
    const loader = new GLTFLoader();
    let disposed = false;

    for (const machine of visibleMachines) {
      const machineGroup = new THREE.Group();
      machineGroup.name = machine.label;
      machineGroup.userData.machineKey = machine.machineKey;
      machineGroup.position.set(
        machine.positionX,
        machine.positionY,
        machine.positionZ
      );
      machineGroup.rotation.y = machine.rotationY;

      const targetEnvelope =
        factoryAssetPhysicalEnvelopesMeters[machine.assetKey];
      const targetMaxDimension =
        factoryAssetTargetMaxDimensionMeters[machine.assetKey];
      machineGroup.add(createMachineSafetyClearance(machine));
      const markerOuterRadius = THREE.MathUtils.clamp(
        Math.max(targetEnvelope.width, targetEnvelope.depth) * 0.55,
        1.25,
        3.15
      );
      const marker = new THREE.Mesh(
        new THREE.RingGeometry(markerOuterRadius - 0.22, markerOuterRadius, 56),
        new THREE.MeshBasicMaterial({
          color: machine.color,
          transparent: true,
          opacity: machine.machineKey === selectedMachineKey ? 0.96 : 0.62,
          side: THREE.DoubleSide,
        })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.y = 0.12;
      machineGroup.add(marker);

      const label = createLabelSprite(machine.label, machine.color);
      label.position.set(0, targetMaxDimension * 0.72 + 0.75, 0);
      machineGroup.add(label);
      selectableGroups.push(machineGroup);
      scene.add(machineGroup);

      const asset = modelAssets.get(machine.assetKey);
      if (!asset) {
        setRuntimeError(
          new Error(`No 3D asset was loaded for ${machine.assetKey}`)
        );
        continue;
      }
      const resourcePath = new URL(".", asset.url).toString();
      loader
        .parseAsync(asset.buffer.slice(0), resourcePath)
        .then((gltf) => {
          if (disposed) {
            return;
          }
          const model = gltf.scene;
          for (const nodeName of factoryAssetIgnoredSceneNodeNames[
            machine.assetKey
          ] ?? []) {
            model.getObjectByName(nodeName)?.removeFromParent();
          }
          model.updateMatrixWorld(true);
          const initialBox = new THREE.Box3().setFromObject(model);
          const initialSize = initialBox.getSize(new THREE.Vector3());
          const largestDimension = Math.max(
            initialSize.x,
            initialSize.y,
            initialSize.z,
            0.001
          );
          const maxDimensionScale = targetMaxDimension / largestDimension;
          const targetHeightScale =
            targetEnvelope.height / Math.max(initialSize.y, 0.001);
          const normalizedScale =
            Math.min(maxDimensionScale, targetHeightScale) * machine.scale;
          model.scale.setScalar(normalizedScale);
          model.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.x -= center.x;
          model.position.z -= center.z;
          model.position.y -= box.min.y;
          label.position.y = Math.max(2.4, box.max.y - box.min.y + 0.65);
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          machineGroup.add(model);
        })
        .catch((error: unknown) => {
          if (disposed) {
            return;
          }
          setRuntimeError(
            new Error(
              `The 3D model for ${machine.label} could not be parsed.`,
              { cause: error }
            )
          );
        });
    }

    const animatedDots: AnimatedFlowDot[] = [];
    for (const connection of connections.filter((item) => item.visible)) {
      const from = machineByKey.get(connection.fromMachineKey);
      const to = machineByKey.get(connection.toMachineKey);
      if (!(from && to)) {
        continue;
      }
      const color = new THREE.Color(connection.color);
      if (connection.kind === "conveyor") {
        const start = new THREE.Vector3(from.positionX, 0, from.positionZ);
        const end = new THREE.Vector3(to.positionX, 0, to.positionZ);
        const delta = end.clone().sub(start);
        const length = Math.max(0.8, delta.length() - 2.3);
        const conveyor = new THREE.Group();
        const belt = new THREE.Mesh(
          new THREE.BoxGeometry(length, 0.16, 0.7),
          new THREE.MeshStandardMaterial({
            color,
            roughness: 0.44,
            metalness: 0.18,
          })
        );
        belt.castShadow = true;
        belt.receiveShadow = true;
        conveyor.add(belt);
        for (const side of [-1, 1]) {
          const rail = new THREE.Mesh(
            new THREE.BoxGeometry(length, 0.19, 0.07),
            new THREE.MeshStandardMaterial({
              color: "#a6b2b0",
              roughness: 0.24,
              metalness: 0.9,
            })
          );
          rail.position.z = side * 0.39;
          conveyor.add(rail);
        }
        conveyor.position.copy(start.clone().add(end).multiplyScalar(0.5));
        conveyor.position.y = connection.height;
        conveyor.rotation.y = -Math.atan2(delta.z, delta.x);
        scene.add(conveyor);
        continue;
      }

      const curve = makeConnectionCurve(from, to, connection.height);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(
          curve,
          48,
          connection.kind === "pipe" ? 0.11 : 0.065,
          12,
          false
        ),
        new THREE.MeshStandardMaterial({
          color,
          metalness: connection.kind === "pipe" ? 0.78 : 0.16,
          roughness: connection.kind === "pipe" ? 0.25 : 0.4,
          ...(connection.kind === "materialFlow"
            ? { emissive: color.clone(), emissiveIntensity: 0.35 }
            : {}),
        })
      );
      tube.castShadow = true;
      scene.add(tube);

      if (connection.kind === "materialFlow") {
        for (let index = 0; index < 5; index += 1) {
          const dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 18, 18),
            new THREE.MeshBasicMaterial({ color })
          );
          scene.add(dot);
          animatedDots.push({ curve, mesh: dot, offset: index / 5 });
        }
      }
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handlePointerUp = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(selectableGroups, true);
      let current: THREE.Object3D | null = hits[0]?.object ?? null;
      while (current && typeof current.userData.machineKey !== "string") {
        current = current.parent;
      }
      onSelectMachine(current?.userData.machineKey ?? null);
    };
    renderer.domElement.addEventListener("pointerup", handlePointerUp);

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const clock = new THREE.Clock();
    let animationFrame = 0;
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      for (const dot of animatedDots) {
        dot.mesh.position.copy(
          dot.curve.getPoint((elapsed * 0.11 + dot.offset) % 1)
        );
      }
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        handleContextLost
      );
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          for (const material of materials) {
            material.dispose();
          }
        }
        if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [
    connections,
    machines,
    modelAssets,
    onSelectMachine,
    selectedMachineKey,
    zones,
  ]);

  return <div className="h-full min-h-[30rem] w-full" ref={containerRef} />;
}

export default FactoryDigitalTwin;

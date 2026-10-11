import { expect, test } from "@playwright/test";
import {
  factoryAssetIgnoredSceneNodeNames,
  factoryAssetPhysicalEnvelopesMeters,
  factoryAssetTargetMaxDimensionMeters,
  factoryMachineAssetKeys,
  factoryMachineSafetyClearanceMeters,
  referenceFactoryLayout,
} from "../lib/factory-layout";

test.describe("reference 3D factory layout", () => {
  test("includes every generated machine asset", () => {
    const assignedAssets = new Set(
      referenceFactoryLayout.machines.map((machine) => machine.assetKey)
    );
    expect([...assignedAssets].sort()).toEqual(
      [...factoryMachineAssetKeys].sort()
    );
  });

  test("connects only machines that exist in the assigned layout", () => {
    const machineKeys = new Set(
      referenceFactoryLayout.machines.map((machine) => machine.machineKey)
    );
    expect(machineKeys.size).toBe(referenceFactoryLayout.machines.length);
    for (const connection of referenceFactoryLayout.connections) {
      expect(machineKeys.has(connection.fromMachineKey)).toBe(true);
      expect(machineKeys.has(connection.toMachineKey)).toBe(true);
    }
  });

  test("uses proportional physical envelopes for every machine model", () => {
    expect(Object.keys(factoryAssetTargetMaxDimensionMeters).sort()).toEqual(
      [...factoryMachineAssetKeys].sort()
    );
    for (const targetDimension of Object.values(
      factoryAssetTargetMaxDimensionMeters
    )) {
      expect(targetDimension).toBeGreaterThanOrEqual(2);
      expect(targetDimension).toBeLessThanOrEqual(8);
    }
    expect(
      factoryAssetTargetMaxDimensionMeters["continuous-spray-sterilizer"]
    ).toBeGreaterThan(
      factoryAssetTargetMaxDimensionMeters["mixer-homogenizer"]
    );
    const pasteurizer = referenceFactoryLayout.machines.find(
      (machine) => machine.machineKey === "pasteurizer"
    );
    expect(pasteurizer?.scale).toBe(1.2);
    for (const machine of referenceFactoryLayout.machines.filter(
      (item) => item.machineKey !== "pasteurizer"
    )) {
      expect(machine.scale).toBe(1);
    }
    expect(Object.keys(factoryAssetPhysicalEnvelopesMeters).sort()).toEqual(
      [...factoryMachineAssetKeys].sort()
    );
    const pasteurizerEnvelope =
      factoryAssetPhysicalEnvelopesMeters["tomato-paste-pasteurizer"];
    expect(pasteurizerEnvelope.height).toBeGreaterThanOrEqual(2.4);
    expect(pasteurizerEnvelope.height).toBeLessThanOrEqual(3);
    expect(pasteurizerEnvelope.height).toBeLessThan(
      factoryAssetPhysicalEnvelopesMeters["jacketed-mixing-tank"].height
    );
    expect(pasteurizerEnvelope.height * (pasteurizer?.scale ?? 0)).toBeCloseTo(
      3.18,
      2
    );
    expect(factoryMachineSafetyClearanceMeters).toBeGreaterThanOrEqual(1.2);
    expect(
      factoryAssetIgnoredSceneNodeNames["tomato-paste-pasteurizer"]
    ).toContain("StudioFloor");
  });

  test("keeps machine safety envelopes inside their assigned rooms", () => {
    const assignedZones: Record<string, string> = {
      pasteurizer: "thermal-processing",
      "jacketed-tank": "thermal-processing",
      "buffer-tank": "thermal-processing",
      homogenizer: "thermal-processing",
      "agitated-tank": "mixing-transfer",
      "sauce-filler": "packaging-line",
      "container-sanitizer": "packaging-line",
      "continuous-sterilizer": "packaging-line",
    };
    const zoneByKey = new Map(
      referenceFactoryLayout.zones.map((zone) => [zone.zoneKey, zone])
    );

    for (const machine of referenceFactoryLayout.machines) {
      const zone = zoneByKey.get(assignedZones[machine.machineKey]);
      expect(zone, `missing room for ${machine.machineKey}`).toBeTruthy();
      if (!zone) {
        continue;
      }
      const envelope = factoryAssetPhysicalEnvelopesMeters[machine.assetKey];
      const cosine = Math.abs(Math.cos(machine.rotationY));
      const sine = Math.abs(Math.sin(machine.rotationY));
      const rotatedWidth = envelope.width * cosine + envelope.depth * sine;
      const rotatedDepth = envelope.width * sine + envelope.depth * cosine;
      const clearanceWidth =
        rotatedWidth * machine.scale + factoryMachineSafetyClearanceMeters * 2;
      const clearanceDepth =
        rotatedDepth * machine.scale + factoryMachineSafetyClearanceMeters * 2;

      expect(
        Math.abs(machine.positionX - zone.positionX) + clearanceWidth / 2,
        `${machine.machineKey} exceeds the room width clearance`
      ).toBeLessThanOrEqual(zone.width / 2);
      expect(
        Math.abs(machine.positionZ - zone.positionZ) + clearanceDepth / 2,
        `${machine.machineKey} exceeds the room depth clearance`
      ).toBeLessThanOrEqual(zone.depth / 2);
    }
  });

  test("keeps operational safety envelopes from overlapping", () => {
    const assignedZones: Record<string, string> = {
      pasteurizer: "thermal-processing",
      "jacketed-tank": "thermal-processing",
      "buffer-tank": "thermal-processing",
      homogenizer: "thermal-processing",
      "agitated-tank": "mixing-transfer",
      "sauce-filler": "packaging-line",
      "container-sanitizer": "packaging-line",
      "continuous-sterilizer": "packaging-line",
    };
    const safetyBounds = referenceFactoryLayout.machines.map((machine) => {
      const envelope = factoryAssetPhysicalEnvelopesMeters[machine.assetKey];
      const cosine = Math.abs(Math.cos(machine.rotationY));
      const sine = Math.abs(Math.sin(machine.rotationY));
      const width =
        (envelope.width * cosine + envelope.depth * sine) * machine.scale +
        factoryMachineSafetyClearanceMeters * 2;
      const depth =
        (envelope.width * sine + envelope.depth * cosine) * machine.scale +
        factoryMachineSafetyClearanceMeters * 2;
      return {
        machineKey: machine.machineKey,
        zoneKey: assignedZones[machine.machineKey],
        minX: machine.positionX - width / 2,
        maxX: machine.positionX + width / 2,
        minZ: machine.positionZ - depth / 2,
        maxZ: machine.positionZ + depth / 2,
      };
    });

    for (
      let firstIndex = 0;
      firstIndex < safetyBounds.length;
      firstIndex += 1
    ) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < safetyBounds.length;
        secondIndex += 1
      ) {
        const first = safetyBounds[firstIndex];
        const second = safetyBounds[secondIndex];
        if (first.zoneKey !== second.zoneKey) {
          continue;
        }
        const overlapsX =
          first.minX < second.maxX - 0.001 && first.maxX > second.minX + 0.001;
        const overlapsZ =
          first.minZ < second.maxZ - 0.001 && first.maxZ > second.minZ + 0.001;
        expect(
          overlapsX && overlapsZ,
          `${first.machineKey} safety area overlaps ${second.machineKey}`
        ).toBe(false);
      }
    }
  });

  test("keeps reference factory rooms physically separated", () => {
    const zones = referenceFactoryLayout.zones.filter((zone) => zone.visible);
    for (let firstIndex = 0; firstIndex < zones.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < zones.length;
        secondIndex += 1
      ) {
        const first = zones[firstIndex];
        const second = zones[secondIndex];
        const overlapsX =
          Math.abs(first.positionX - second.positionX) <
          (first.width + second.width) / 2;
        const overlapsZ =
          Math.abs(first.positionZ - second.positionZ) <
          (first.depth + second.depth) / 2;
        expect(
          overlapsX && overlapsZ,
          `${first.zoneKey} overlaps ${second.zoneKey}`
        ).toBe(false);
      }
    }
  });

  test("serves every model as a valid GLB asset", async ({ request }) => {
    for (const assetKey of factoryMachineAssetKeys) {
      const response = await request.get(`/models/factory/${assetKey}.glb`);
      expect(response.ok(), `${assetKey} should be served`).toBe(true);
      expect(response.headers()["content-type"]).toContain("model/gltf-binary");
      const body = await response.body();
      expect(body.subarray(0, 4).toString("ascii")).toBe("glTF");
    }
  });

  test("browser can initialize a WebGL 2 context", async ({ page }) => {
    await page.goto("/login");
    const supportsWebGl2 = await page.evaluate(() =>
      Boolean(document.createElement("canvas").getContext("webgl2"))
    );
    expect(supportsWebGl2).toBe(true);
  });
});

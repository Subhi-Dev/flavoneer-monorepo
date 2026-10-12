import { describe, expect, test } from "vitest";
import { FACTORY_BASE_KEYS, isFactoryBaseKey } from "../lib/factory-bases";
import { factoryBaseChangeSummary } from "./factoryBases";

describe("factory bases", () => {
  test("recognizes only the shipped factory keys", () => {
    for (const key of FACTORY_BASE_KEYS) {
      expect(isFactoryBaseKey(key)).toBe(true);
    }
    expect(isFactoryBaseKey("hall1")).toBe(false);
    expect(isFactoryBaseKey(null)).toBe(false);
  });

  test("skips the audit entry when the assignment does not change", () => {
    expect(factoryBaseChangeSummary("sauce-plant", "sauce-plant")).toBeNull();
    expect(factoryBaseChangeSummary(null, null)).toBeNull();
  });

  test("describes assignments and removals", () => {
    expect(factoryBaseChangeSummary(null, "ice-cream-plant")).toBe(
      "Assigned 3D factory: Ice cream plant",
    );
    expect(factoryBaseChangeSummary("ice-cream-plant", "sauce-plant")).toBe(
      "Assigned 3D factory: Sauce plant",
    );
    expect(factoryBaseChangeSummary("sauce-plant", null)).toBe("Removed 3D factory: Sauce plant");
  });
});

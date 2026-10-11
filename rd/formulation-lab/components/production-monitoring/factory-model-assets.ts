import type { FactoryMachineAssetKey } from "../../lib/factory-layout";

const assetFileNames: Record<FactoryMachineAssetKey, string> = {
  "tomato-paste-pasteurizer": "tomato-paste-pasteurizer.glb",
  "jacketed-mixing-tank": "jacketed-mixing-tank.glb",
  "process-tank": "process-tank.glb",
  "mixer-homogenizer": "mixer-homogenizer.glb",
  "sauce-filling-machine": "sauce-filling-machine.glb",
  "container-sanitizer": "container-sanitizer.glb",
  "continuous-spray-sterilizer": "continuous-spray-sterilizer.glb",
};

interface FactoryModelAsset {
  buffer: ArrayBuffer;
  url: string;
}

type AssetRecord =
  | { promise: Promise<void>; status: "pending" }
  | { error: Error; promise: Promise<void>; status: "rejected" }
  | { asset: FactoryModelAsset; promise: Promise<void>; status: "fulfilled" };

const assetCache = new Map<string, AssetRecord>();

function getPublicAssetUrl(assetKey: FactoryMachineAssetKey) {
  const baseUrl = new URL(
    import.meta.env.BASE_URL || "/",
    window.location.origin
  );
  return new URL(
    `models/factory/${assetFileNames[assetKey]}`,
    baseUrl
  ).toString();
}

function describeLoadFailure(url: string, cause: unknown) {
  const assetOrigin = new URL(url).origin;
  const isCrossOrigin = assetOrigin !== window.location.origin;
  const detail = cause instanceof Error ? cause.message : String(cause);
  const corsHint = isCrossOrigin
    ? " Confirm that the Convex storage or CDN response allows this application origin with Access-Control-Allow-Origin."
    : " Confirm that the deployed public/models/factory asset exists and is not being rewritten to index.html.";
  return new Error(
    `Unable to load 3D model from ${url}. ${detail}.${corsHint}`
  );
}

async function fetchGlb(url: string): Promise<FactoryModelAsset> {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "force-cache",
      credentials: "omit",
      mode: "cors",
    });
  } catch (error) {
    throw describeLoadFailure(url, error);
  }

  if (!response.ok) {
    throw describeLoadFailure(
      url,
      new Error(`HTTP ${response.status} ${response.statusText}`)
    );
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (
    contentType.includes("text/html") ||
    contentType.includes("application/json") ||
    contentType.includes("text/xml")
  ) {
    throw describeLoadFailure(
      url,
      new Error(`Unexpected content type ${contentType}`)
    );
  }

  const buffer = await response.arrayBuffer();
  const header = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 4));
  const isGlb =
    header.length === 4 &&
    header[0] === 0x67 &&
    header[1] === 0x6c &&
    header[2] === 0x54 &&
    header[3] === 0x46;
  if (!isGlb) {
    throw describeLoadFailure(
      url,
      new Error("Response is not a valid GLB file")
    );
  }

  return { buffer, url };
}

function getOrCreateRecord(url: string) {
  const existing = assetCache.get(url);
  if (existing) {
    return existing;
  }

  const pending: AssetRecord = {
    status: "pending",
    promise: Promise.resolve(),
  };
  pending.promise = fetchGlb(url).then(
    (asset) => {
      assetCache.set(url, {
        asset,
        promise: pending.promise,
        status: "fulfilled",
      });
    },
    (error: unknown) => {
      assetCache.set(url, {
        error: error instanceof Error ? error : new Error(String(error)),
        promise: pending.promise,
        status: "rejected",
      });
    }
  );
  assetCache.set(url, pending);
  return pending;
}

export function readFactoryModelAssets(
  assetKeys: readonly FactoryMachineAssetKey[]
) {
  const uniqueKeys = [...new Set(assetKeys)];
  const records = uniqueKeys.map((assetKey) => {
    const url = getPublicAssetUrl(assetKey);
    return { assetKey, record: getOrCreateRecord(url) };
  });
  const rejected = records.find(({ record }) => record.status === "rejected");
  if (rejected?.record.status === "rejected") {
    throw rejected.record.error;
  }
  const pending = records.filter(({ record }) => record.status === "pending");
  if (pending.length > 0) {
    throw Promise.all(pending.map(({ record }) => record.promise));
  }

  return new Map(
    records.map(({ assetKey, record }) => {
      if (record.status !== "fulfilled") {
        throw new Error(`3D model cache for ${assetKey} is not ready`);
      }
      return [assetKey, record.asset] as const;
    })
  );
}

export function clearFactoryModelAssetCache() {
  assetCache.clear();
}

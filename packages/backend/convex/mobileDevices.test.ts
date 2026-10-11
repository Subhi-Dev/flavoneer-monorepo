/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, components } from "./_generated/api";
import authSchema from "./betterAuth/schema";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const betterAuthModules = import.meta.glob("./betterAuth/**/*.ts");

type Backend = ReturnType<typeof createTestBackend>;

function createTestBackend() {
  const backend = convexTest(schema, modules);
  backend.registerComponent("betterAuth", authSchema, betterAuthModules);
  return backend;
}

async function createAuthUser(backend: Backend, name: string) {
  const now = Date.now();
  const email = `${name.toLowerCase().replaceAll(" ", ".")}@example.com`;
  const authUser = (await backend.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "user",
      data: { name, email, emailVerified: true, createdAt: now, updatedAt: now },
    },
  })) as { _id: string };
  return { id: authUser._id, name, email };
}

/** Signs the user in on a new device and returns a client for that session. */
async function signIn(backend: Backend, user: { id: string }, label: string) {
  const now = Date.now();
  const session = (await backend.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "session",
      data: {
        token: `${user.id}-${label}`,
        userId: user.id,
        expiresAt: now + 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      },
    },
  })) as { _id: string };
  return backend.withIdentity({
    subject: user.id,
    sessionId: session._id,
    tokenIdentifier: `test|${user.id}|${label}`,
  });
}

async function seedWorkspace(backend: Backend) {
  const owner = await createAuthUser(backend, "Workspace Owner");
  const admin = await createAuthUser(backend, "Workspace Admin");
  const inspector = await createAuthUser(backend, "Line Inspector");
  const organizationId = await backend.run(async (ctx) => {
    const id = await ctx.db.insert("organizations", {
      name: "Sample workspace",
      slug: "sample-workspace",
      ownerId: owner.id,
      createdAt: Date.now(),
      status: "active",
    });
    for (const [user, role] of [
      [owner, "owner"],
      [admin, "admin"],
      [inspector, "member"],
    ] as const) {
      await ctx.db.insert("organizationMembers", {
        organizationId: id,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        role,
        joinedAt: Date.now(),
      });
    }
    return id;
  });
  return { owner, admin, inspector, organizationId };
}

const IPHONE = { platform: "ios", modelName: "iPhone 15", osVersion: "18.1" } as const;
const PIXEL = { platform: "android", modelName: "Pixel 8", osVersion: "15" } as const;

describe("mobile devices", () => {
  test("lists each phone session separately and signs out only the chosen one", async () => {
    const backend = createTestBackend();
    const user = await createAuthUser(backend, "Line Inspector");
    const web = await signIn(backend, user, "web");
    const iphone = await signIn(backend, user, "iphone");
    const pixel = await signIn(backend, user, "pixel");

    await iphone.mutation(api.mobileDevices.registerCurrentDevice, IPHONE);
    await pixel.mutation(api.mobileDevices.registerCurrentDevice, PIXEL);
    await pixel.mutation(api.pushNotifications.registerPushToken, {
      token: "ExponentPushToken[pixel]",
      platform: "android",
    });

    const devices = await web.query(api.mobileDevices.listMine, {});
    expect(devices.map((device) => device.modelName).sort()).toEqual(["Pixel 8", "iPhone 15"]);

    const [pixelDevice] = devices.filter((device) => device.modelName === "Pixel 8");
    await web.mutation(api.mobileDevices.signOutDevice, { deviceId: pixelDevice._id });

    expect(await pixel.query(api.mobileDevices.isCurrentSessionRevoked, {})).toBe(true);
    expect(await iphone.query(api.mobileDevices.isCurrentSessionRevoked, {})).toBe(false);
    await expect(pixel.query(api.mobileDevices.listMine, {})).rejects.toThrow("Not authenticated");
    expect((await web.query(api.mobileDevices.listMine, {})).map((d) => d.modelName)).toEqual([
      "iPhone 15",
    ]);
    const pushTokens = await backend.run((ctx) => ctx.db.query("pushTokens").collect());
    expect(pushTokens).toEqual([]);
  });

  test("re-registering the same session updates the row instead of adding one", async () => {
    const backend = createTestBackend();
    const user = await createAuthUser(backend, "Line Inspector");
    const phone = await signIn(backend, user, "phone");

    await phone.mutation(api.mobileDevices.registerCurrentDevice, IPHONE);
    await phone.mutation(api.mobileDevices.registerCurrentDevice, { ...IPHONE, osVersion: "18.2" });

    const devices = await phone.query(api.mobileDevices.listMine, {});
    expect(devices).toHaveLength(1);
    expect(devices[0].osVersion).toBe("18.2");
  });

  test("hides devices whose session ended and removes the row on sign-out", async () => {
    const backend = createTestBackend();
    const user = await createAuthUser(backend, "Line Inspector");
    const web = await signIn(backend, user, "web");
    const phone = await signIn(backend, user, "phone");
    await phone.mutation(api.mobileDevices.registerCurrentDevice, IPHONE);

    await phone.mutation(api.mobileDevices.unregisterCurrentDevice, {});

    expect(await web.query(api.mobileDevices.listMine, {})).toEqual([]);
  });

  test("users cannot sign out someone else's phone without a workspace", async () => {
    const backend = createTestBackend();
    const { admin, inspector } = await seedWorkspace(backend);
    const inspectorPhone = await signIn(backend, inspector, "phone");
    await inspectorPhone.mutation(api.mobileDevices.registerCurrentDevice, PIXEL);
    const [device] = await inspectorPhone.query(api.mobileDevices.listMine, {});

    const adminWeb = await signIn(backend, admin, "web");
    await expect(
      adminWeb.mutation(api.mobileDevices.signOutDevice, { deviceId: device._id }),
    ).rejects.toThrow("Device belongs to another user");
  });

  test("admins sign out members' phones, and the action is audited", async () => {
    const backend = createTestBackend();
    const { admin, inspector, organizationId } = await seedWorkspace(backend);
    const inspectorPhone = await signIn(backend, inspector, "phone");
    await inspectorPhone.mutation(api.mobileDevices.registerCurrentDevice, PIXEL);
    const adminWeb = await signIn(backend, admin, "web");

    const devices = await adminWeb.query(api.mobileDevices.listForOrganization, {
      organizationId,
    });
    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({ userId: inspector.id, canSignOut: true });

    await adminWeb.mutation(api.mobileDevices.signOutDevice, {
      deviceId: devices[0]._id,
      organizationId,
    });

    expect(await inspectorPhone.query(api.mobileDevices.isCurrentSessionRevoked, {})).toBe(true);
    const logs = await backend.run((ctx) => ctx.db.query("organizationAuditLogs").collect());
    expect(logs).toMatchObject([
      { action: "member.device_signed_out", targetId: inspector.id, meta: { device: "Pixel 8" } },
    ]);
  });

  test("admins cannot sign out the owner's or another admin's phone", async () => {
    const backend = createTestBackend();
    const { owner, admin, inspector, organizationId } = await seedWorkspace(backend);
    const ownerPhone = await signIn(backend, owner, "phone");
    await ownerPhone.mutation(api.mobileDevices.registerCurrentDevice, IPHONE);
    const adminPhone = await signIn(backend, admin, "phone");
    await adminPhone.mutation(api.mobileDevices.registerCurrentDevice, PIXEL);

    const secondAdmin = await createAuthUser(backend, "Second Admin");
    await backend.run((ctx) =>
      ctx.db.insert("organizationMembers", {
        organizationId,
        userId: secondAdmin.id,
        userName: secondAdmin.name,
        userEmail: secondAdmin.email,
        role: "admin",
        joinedAt: Date.now(),
      }),
    );
    const secondAdminWeb = await signIn(backend, secondAdmin, "web");
    const visible = await secondAdminWeb.query(api.mobileDevices.listForOrganization, {
      organizationId,
    });
    expect(visible.map((device) => [device.userId, device.canSignOut])).toEqual(
      expect.arrayContaining([
        [owner.id, false],
        [admin.id, false],
      ]),
    );
    for (const device of visible) {
      await expect(
        secondAdminWeb.mutation(api.mobileDevices.signOutDevice, {
          deviceId: device._id,
          organizationId,
        }),
      ).rejects.toThrow("Insufficient permissions");
    }

    // The owner can sign out an admin's phone.
    const ownerWeb = await signIn(backend, owner, "web");
    const [adminDevice] = visible.filter((device) => device.userId === admin.id);
    await ownerWeb.mutation(api.mobileDevices.signOutDevice, {
      deviceId: adminDevice._id,
      organizationId,
    });
    expect(await adminPhone.query(api.mobileDevices.isCurrentSessionRevoked, {})).toBe(true);

    // Members cannot list the workspace's phones.
    const inspectorWeb = await signIn(backend, inspector, "web");
    await expect(
      inspectorWeb.query(api.mobileDevices.listForOrganization, { organizationId }),
    ).rejects.toThrow("Insufficient permissions");
  });
});

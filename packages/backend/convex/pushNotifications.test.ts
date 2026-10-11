/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import authSchema from "./betterAuth/schema";
import { notifyReviewersOfSubmission } from "./pushNotifications";
import { openReviewCycle } from "./qualityReportingFacts";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const betterAuthModules = import.meta.glob("./betterAuth/**/*.ts");

type Backend = ReturnType<typeof createTestBackend>;

function createTestBackend() {
  const backend = convexTest(schema, modules);
  backend.registerComponent("betterAuth", authSchema, betterAuthModules);
  return backend;
}

async function createUser(backend: Backend, name: string) {
  const now = Date.now();
  const email = `${name.toLowerCase().replaceAll(" ", ".")}@example.com`;
  const authUser = (await backend.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "user",
      data: { name, email, emailVerified: true, createdAt: now, updatedAt: now },
    },
  })) as { _id: string };
  const session = (await backend.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "session",
      data: {
        token: `${authUser._id}-session`,
        userId: authUser._id,
        expiresAt: now + 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      },
    },
  })) as { _id: string };
  await backend.run((ctx) => ctx.db.insert("users", { authUserId: authUser._id, name, email }));
  return {
    id: authUser._id,
    name,
    email,
    client: backend.withIdentity({
      subject: authUser._id,
      sessionId: session._id,
      tokenIdentifier: `test|${authUser._id}`,
    }),
  };
}

async function seedWorkspace(backend: Backend) {
  const owner = await createUser(backend, "Workspace Owner");
  const inspector = await createUser(backend, "Line Inspector");
  const manager = await createUser(backend, "Production Manager");
  const operator = await createUser(backend, "Lab Operator");
  const now = Date.now();

  const ids = await backend.run(async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", {
      name: "Sample workspace",
      slug: "sample-workspace",
      ownerId: owner.id,
      createdAt: now,
      status: "active",
    });
    const roleIds = {
      quality_officer: await ctx.db.insert("roles", {
        organizationId,
        key: "quality_officer",
        name: "Quality Officer",
        description: "Records checks",
        permissions: ["record_production_checks", "view_production_checks"],
      }),
      production_manager: await ctx.db.insert("roles", {
        organizationId,
        key: "production_manager",
        name: "Production Manager",
        description: "Reviews checks",
        permissions: ["review_production_checks", "view_production_checks"],
      }),
      operator: await ctx.db.insert("roles", {
        organizationId,
        key: "operator",
        name: "Operator",
        description: "Runs",
        permissions: ["execute_runs"],
      }),
    };
    const members = [
      [owner, "owner", undefined],
      [inspector, "member", roleIds.quality_officer],
      [manager, "member", roleIds.production_manager],
      [operator, "member", roleIds.operator],
    ] as const;
    for (const [user, role, roleId] of members) {
      await ctx.db.insert("organizationMembers", {
        organizationId,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        role,
        roleId,
        joinedAt: now,
      });
    }
    const productId = await ctx.db.insert("projects", {
      name: "Wafer bites",
      version: "1.0",
      status: "Released",
      lead: "R&D",
      description: "Finished product",
      ingredients: [],
      organizationId,
    });
    const specificationId = await ctx.db.insert("productionLineSpecifications", {
      organizationId,
      productId,
      productName: "Wafer bites",
      version: 1,
      status: "active",
      createdAt: now,
      createdBy: owner.id,
    });
    const recordId = await ctx.db.insert("productionLineRecords", {
      organizationId,
      productionHallCode: "A",
      serialSequence: 413,
      displaySerial: "A-0413",
      departmentName: "Coating line 1",
      productId,
      productName: "Wafer bites",
      inspectionAt: now,
      inspectionHourKey: "2026-10-11T14",
      specificationId,
      specificationVersion: 1,
      status: "draft",
      editableOwnerUserId: inspector.id,
      qcUserId: inspector.id,
      qcUserName: inspector.name,
      recordRevision: 1,
      createdAt: now,
      updatedAt: now,
    });
    return { organizationId, recordId };
  });

  return { ...ids, owner, inspector, manager, operator };
}

// Puts the record in review the way submitForReview does, without filling in every reading.
async function submitRecord(backend: Backend, recordId: Id<"productionLineRecords">) {
  await backend.run(async (ctx) => {
    await ctx.db.patch(recordId, { status: "pending_production_review" });
    const record = await ctx.db.get(recordId);
    await openReviewCycle(ctx, record!, Date.now());
  });
}

function tokenFor(name: string) {
  return `ExponentPushToken[${name.replaceAll(" ", "-")}]`;
}

async function registerDevices(users: Awaited<ReturnType<typeof createUser>>[]) {
  for (const user of users) {
    await user.client.mutation(api.pushNotifications.registerPushToken, {
      token: tokenFor(user.name),
      platform: "ios",
    });
  }
}

async function scheduledRecipients(backend: Backend) {
  const jobs = await backend.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  return jobs.flatMap((job) =>
    (job.args[0] as { messages: { to: string; title: string }[] }).messages.map(
      (message) => message.to,
    ),
  );
}

describe("push tokens", () => {
  test("moves a device to the user who signed in last and rejects malformed tokens", async () => {
    const backend = createTestBackend();
    const { inspector, manager } = await seedWorkspace(backend);
    const token = "ExponentPushToken[shared-device]";

    await inspector.client.mutation(api.pushNotifications.registerPushToken, {
      token,
      platform: "android",
    });
    await manager.client.mutation(api.pushNotifications.registerPushToken, {
      token,
      platform: "android",
    });
    const rows = await backend.run((ctx) => ctx.db.query("pushTokens").collect());
    expect(rows).toEqual([expect.objectContaining({ token, userId: manager.id })]);

    // Another user's sign-out does not remove the device.
    await inspector.client.mutation(api.pushNotifications.unregisterPushToken, { token });
    expect(await backend.run((ctx) => ctx.db.query("pushTokens").collect())).toHaveLength(1);
    await manager.client.mutation(api.pushNotifications.unregisterPushToken, { token });
    expect(await backend.run((ctx) => ctx.db.query("pushTokens").collect())).toHaveLength(0);

    await expect(
      manager.client.mutation(api.pushNotifications.registerPushToken, {
        token: "not-a-token",
        platform: "ios",
      }),
    ).rejects.toThrow("Invalid Expo push token");
  });
});

describe("production record notifications", () => {
  test("a submission notifies reviewers and full-access members, not the submitter", async () => {
    const backend = createTestBackend();
    const workspace = await seedWorkspace(backend);
    const { owner, inspector, manager, operator, recordId } = workspace;
    await registerDevices([owner, inspector, manager, operator]);

    await backend.run(async (ctx) => {
      const record = await ctx.db.get(recordId);
      await notifyReviewersOfSubmission(ctx, record!, { _id: inspector.id, name: inspector.name });
    });

    expect((await scheduledRecipients(backend)).sort()).toEqual(
      [tokenFor(owner.name), tokenFor(manager.name)].sort(),
    );
  });

  test("a review decision notifies the inspector in their language", async () => {
    const backend = createTestBackend();
    const { inspector, manager, recordId } = await seedWorkspace(backend);
    await registerDevices([inspector, manager]);
    await inspector.client.mutation(api.settings.upsert, { language: "ar" });
    await submitRecord(backend, recordId);

    await manager.client.mutation(api.productionLineRecords.review, {
      recordId,
      decision: "returned",
      note: "Retake the label photo",
    });

    const jobs = await backend.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    const messages = jobs.flatMap(
      (job) => (job.args[0] as { messages: { to: string; title: string; body: string }[] }).messages,
    );
    expect(messages).toEqual([
      expect.objectContaining({
        to: tokenFor(inspector.name),
        title: "أُعيد السجل A-0413",
        body: "Retake the label photo",
      }),
    ]);
  });

  test("skips users who turned app alerts off", async () => {
    const backend = createTestBackend();
    const { inspector, manager, recordId } = await seedWorkspace(backend);
    await registerDevices([inspector]);
    await inspector.client.mutation(api.settings.upsert, { appAlerts: false });
    await submitRecord(backend, recordId);

    await manager.client.mutation(api.productionLineRecords.review, {
      recordId,
      decision: "approved",
    });

    expect(await scheduledRecipients(backend)).toEqual([]);
  });
});

describe("record photos", () => {
  // convex-test does not record a stored blob's content type, so these tests seed
  // photo rows directly and leave the MIME check to the rejection test.
  async function seedPhotos(backend: Backend, recordId: Id<"productionLineRecords">, count: number) {
    return await backend.run(async (ctx) => {
      const record = await ctx.db.get(recordId);
      const ids: Id<"productionLineRecordPhotos">[] = [];
      for (let index = 0; index < count; index += 1) {
        const storageId = await ctx.storage.store(new Blob(["photo"]));
        ids.push(
          await ctx.db.insert("productionLineRecordPhotos", {
            recordId,
            organizationId: record!.organizationId,
            storageId,
            mimeType: "image/jpeg",
            size: 5,
            uploadedBy: record!.qcUserId,
            createdAt: Date.now(),
          }),
        );
      }
      return ids;
    });
  }

  async function storeFile(backend: Backend) {
    return await backend.run((ctx) => ctx.storage.store(new Blob(["file"])));
  }

  test("returns photos with the record, caps them at ten, and removes them", async () => {
    const backend = createTestBackend();
    const { inspector, recordId } = await seedWorkspace(backend);
    const photoIds = await seedPhotos(backend, recordId, 10);

    const record = await inspector.client.query(api.productionLineRecords.get, { recordId });
    expect(record?.photos).toHaveLength(10);
    expect(record?.photos[0]?.url).toEqual(expect.any(String));

    await expect(
      inspector.client.mutation(api.productionLineRecords.attachRecordPhoto, {
        recordId,
        storageId: await storeFile(backend),
      }),
    ).rejects.toThrow("at most 10 photos");

    await inspector.client.mutation(api.productionLineRecords.removeRecordPhoto, {
      photoId: photoIds[0],
    });
    const updated = await inspector.client.query(api.productionLineRecords.get, { recordId });
    expect(updated?.photos).toHaveLength(9);
  });

  test("rejects files that are not images and records that are locked", async () => {
    const backend = createTestBackend();
    const { inspector, manager, recordId } = await seedWorkspace(backend);

    await expect(
      inspector.client.mutation(api.productionLineRecords.attachRecordPhoto, {
        recordId,
        storageId: await storeFile(backend),
      }),
    ).rejects.toThrow("JPEG, PNG, or WebP");

    // Only the inspector who owns the draft may add photos.
    await expect(
      manager.client.mutation(api.productionLineRecords.attachRecordPhoto, {
        recordId,
        storageId: await storeFile(backend),
      }),
    ).rejects.toThrow();

    await submitRecord(backend, recordId);
    await expect(
      inspector.client.mutation(api.productionLineRecords.attachRecordPhoto, {
        recordId,
        storageId: await storeFile(backend),
      }),
    ).rejects.toThrow("no longer editable");
  });
});

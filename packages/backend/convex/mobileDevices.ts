import type { GenericCtx } from "@convex-dev/better-auth";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { DataModel, Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { logOrganizationAction } from "./organizationAuditLogs";
import { getAuthUserOrThrow, requireWorkspaceAdmin } from "./workspaceAccess";

// The app reports activity each time it opens; skip writes closer together than this.
const LAST_ACTIVE_RESOLUTION_MS = 5 * 60 * 1000;
const MAXIMUM_DEVICES_PER_USER = 20;
const MAXIMUM_MEMBERS_SCANNED = 100;
const MAXIMUM_DEVICE_FIELD_LENGTH = 100;

const platformValidator = v.union(v.literal("ios"), v.literal("android"));

const deviceReturnValidator = v.object({
  _id: v.id("mobileDevices"),
  platform: platformValidator,
  modelName: v.optional(v.string()),
  osVersion: v.optional(v.string()),
  appVersion: v.optional(v.string()),
  createdAt: v.number(),
  lastActiveAt: v.number(),
  // Lets the client hide sessions that expired without being deleted.
  sessionExpiresAt: v.number(),
});

/** The Better Auth session behind the caller's Convex token, if any. */
export async function getCurrentSessionId(ctx: GenericCtx<DataModel>) {
  const identity = await ctx.auth.getUserIdentity();
  return typeof identity?.sessionId === "string" ? identity.sessionId : null;
}

async function findSession(ctx: QueryCtx | MutationCtx, sessionId: string) {
  return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "session",
    where: [{ field: "_id", value: sessionId }],
  })) as { expiresAt: number } | null;
}

/** The user's devices whose session still exists, most recently active first. */
async function listSignedInDevices(ctx: QueryCtx, userId: string) {
  const devices = await ctx.db
    .query("mobileDevices")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(MAXIMUM_DEVICES_PER_USER);
  const signedIn = [];
  for (const device of devices) {
    const session = await findSession(ctx, device.sessionId);
    if (session) {
      signedIn.push({
        _id: device._id,
        sessionId: device.sessionId,
        platform: device.platform,
        modelName: device.modelName,
        osVersion: device.osVersion,
        appVersion: device.appVersion,
        createdAt: device.createdAt,
        lastActiveAt: device.lastActiveAt,
        sessionExpiresAt: session.expiresAt,
      });
    }
  }
  return signedIn.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

function trimDeviceField(value: string | undefined) {
  const trimmed = value?.trim().slice(0, MAXIMUM_DEVICE_FIELD_LENGTH);
  return trimmed || undefined;
}

/**
 * Records the phone behind the current session and when it was last used.
 * The mobile app calls this after signing in and each time it comes to the foreground.
 */
export const registerCurrentDevice = mutation({
  args: {
    platform: platformValidator,
    modelName: v.optional(v.string()),
    osVersion: v.optional(v.string()),
    appVersion: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authUser = await getAuthUserOrThrow(ctx);
    const sessionId = await getCurrentSessionId(ctx);
    if (!sessionId) {
      throw new Error("Not authenticated");
    }
    const now = Date.now();
    const fields = {
      userId: authUser._id,
      platform: args.platform,
      modelName: trimDeviceField(args.modelName),
      osVersion: trimDeviceField(args.osVersion),
      appVersion: trimDeviceField(args.appVersion),
    };
    const existing = await ctx.db
      .query("mobileDevices")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (!existing) {
      await ctx.db.insert("mobileDevices", {
        sessionId,
        ...fields,
        createdAt: now,
        lastActiveAt: now,
      });
      return null;
    }
    const unchanged =
      existing.userId === fields.userId &&
      existing.platform === fields.platform &&
      existing.modelName === fields.modelName &&
      existing.osVersion === fields.osVersion &&
      existing.appVersion === fields.appVersion;
    if (unchanged && now - existing.lastActiveAt < LAST_ACTIVE_RESOLUTION_MS) {
      return null;
    }
    await ctx.db.patch(existing._id, { ...fields, lastActiveAt: now });
    return null;
  },
});

/** Called by the phone before it signs itself out. */
export const unregisterCurrentDevice = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const sessionId = await getCurrentSessionId(ctx);
    if (!sessionId) {
      return null;
    }
    const existing = await ctx.db
      .query("mobileDevices")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

/**
 * True once the phone's session has been signed out from another device.
 * The Convex token outlives the session briefly, which is what lets the
 * phone learn about it and clear its stored credentials.
 */
export const isCurrentSessionRevoked = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const sessionId = await getCurrentSessionId(ctx);
    if (!sessionId) {
      return false;
    }
    return (await findSession(ctx, sessionId)) === null;
  },
});

export const listMine = query({
  args: {},
  // `isCurrent` marks the phone making the request, so it can label itself.
  returns: v.array(deviceReturnValidator.extend({ isCurrent: v.boolean() })),
  handler: async (ctx) => {
    const authUser = await getAuthUserOrThrow(ctx);
    const sessionId = await getCurrentSessionId(ctx);
    const devices = await listSignedInDevices(ctx, authUser._id);
    return devices.map((device) => ({ ...device, isCurrent: device.sessionId === sessionId }));
  },
});

/** Phones of the other workspace members. Owners and admins only. */
export const listForOrganization = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    deviceReturnValidator.extend({
      userId: v.string(),
      userName: v.string(),
      userEmail: v.string(),
      canSignOut: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAdmin(ctx, args.organizationId);
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .take(MAXIMUM_MEMBERS_SCANNED);
    const result = [];
    for (const member of members) {
      if (member.userId === access.authUser._id) {
        continue;
      }
      const canSignOut = canAdminSignOutMember(access, member);
      for (const device of await listSignedInDevices(ctx, member.userId)) {
        result.push({
          ...device,
          userId: member.userId,
          userName: member.userName,
          userEmail: member.userEmail,
          canSignOut,
        });
      }
    }
    return result.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  },
});

// Mirrors member removal: nobody signs out the owner, and only the owner signs out admins.
function canAdminSignOutMember(
  access: Awaited<ReturnType<typeof requireWorkspaceAdmin>>,
  member: Doc<"organizationMembers">,
) {
  if (member.role === "owner" || access.organization.ownerId === member.userId) {
    return false;
  }
  return member.role !== "admin" || access.role === "owner";
}

/**
 * Signs a phone out by deleting its session, and stops its push notifications.
 * Other devices, including the web lab, stay signed in. Workspace admins may
 * sign out other members' phones by passing the workspace.
 */
export const signOutDevice = mutation({
  args: {
    deviceId: v.id("mobileDevices"),
    organizationId: v.optional(v.id("organizations")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authUser = await getAuthUserOrThrow(ctx);
    const device = await ctx.db.get(args.deviceId);
    if (!device) {
      throw new Error("Device not found");
    }

    if (device.userId !== authUser._id) {
      if (!args.organizationId) {
        throw new Error("Device belongs to another user");
      }
      const access = await requireWorkspaceAdmin(ctx, args.organizationId);
      const member = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organizationId_and_userId", (q) =>
          q.eq("organizationId", access.organization._id).eq("userId", device.userId),
        )
        .unique();
      if (!member) {
        throw new Error("Device owner is not a member of this organization");
      }
      if (!canAdminSignOutMember(access, member)) {
        throw new Error("Insufficient permissions");
      }
      await logOrganizationAction(ctx, {
        organizationId: access.organization._id,
        actorId: authUser._id,
        actorName: authUser.name ?? authUser.email ?? "Unknown",
        action: "member.device_signed_out",
        targetType: "member",
        targetId: member.userId,
        targetLabel: member.userName,
        meta: device.modelName ? { device: device.modelName } : undefined,
      });
    }

    await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: { model: "session", where: [{ field: "_id", value: device.sessionId }] },
    });
    const pushTokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", device.sessionId))
      .take(MAXIMUM_DEVICES_PER_USER);
    for (const pushToken of pushTokens) {
      await ctx.db.delete(pushToken._id);
    }
    await ctx.db.delete(device._id);
    return null;
  },
});

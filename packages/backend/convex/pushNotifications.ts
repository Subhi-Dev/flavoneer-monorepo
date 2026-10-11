import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { env, internalAction, internalMutation, mutation } from "./_generated/server";
import { getCurrentSessionId } from "./mobileDevices";
import { roleHasPermission } from "./permissions";
import { getAuthUserOrThrow } from "./workspaceAccess";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// Expo accepts at most 100 messages per request.
const EXPO_PUSH_BATCH_SIZE = 100;
const EXPO_PUSH_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\]]{1,200}\]$/;
// Android channel created by the mobile app in src/lib/push-notifications.ts.
const PRODUCTION_RECORDS_CHANNEL_ID = "production-records";
const MAXIMUM_TOKENS_PER_USER = 10;
const MAXIMUM_MEMBERS_SCANNED = 500;

const pushMessageValidator = v.object({
  to: v.string(),
  title: v.string(),
  body: v.string(),
  channelId: v.string(),
  data: v.object({
    type: v.string(),
    recordId: v.id("productionLineRecords"),
  }),
});

type PushMessage = typeof pushMessageValidator.type;
type Language = "en" | "ar";
type RecordNotification =
  | { type: "record_submitted"; submitterName: string }
  | { type: "record_approved" }
  | { type: "record_returned"; note?: string };

function buildText(
  notification: RecordNotification,
  record: Doc<"productionLineRecords">,
  language: Language,
) {
  const context = `${record.productName} · ${record.departmentName}`;
  const serial = record.displaySerial;
  switch (notification.type) {
    case "record_submitted":
      return language === "ar"
        ? {
            title: `السجل ${serial} بانتظار المراجعة`,
            body: `${context}، أرسله ${notification.submitterName}`,
          }
        : {
            title: `${serial} needs review`,
            body: `${context}, submitted by ${notification.submitterName}`,
          };
    case "record_approved":
      return language === "ar"
        ? { title: `تم اعتماد السجل ${serial}`, body: context }
        : { title: `${serial} approved`, body: context };
    case "record_returned":
      return language === "ar"
        ? { title: `أُعيد السجل ${serial}`, body: notification.note || context }
        : { title: `${serial} returned`, body: notification.note || context };
  }
}

/**
 * Schedules push notifications about a production-line record. Recipients with
 * app alerts turned off in their settings are skipped. Errors are logged rather
 * than thrown so a notification problem never rolls back the record change.
 */
async function notifyUsers(
  ctx: MutationCtx,
  userIds: string[],
  record: Doc<"productionLineRecords">,
  notification: RecordNotification,
) {
  try {
    const messages: PushMessage[] = [];
    for (const userId of new Set(userIds)) {
      const settings = await ctx.db
        .query("userSettings")
        .withIndex("by_settingsKey", (q) => q.eq("settingsKey", userId))
        .first();
      // New users have no settings row yet; app alerts default to on.
      if (settings?.appAlerts === false) {
        continue;
      }
      const tokens = await ctx.db
        .query("pushTokens")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(MAXIMUM_TOKENS_PER_USER);
      const text = buildText(notification, record, settings?.language ?? "en");
      for (const { token } of tokens) {
        messages.push({
          to: token,
          ...text,
          channelId: PRODUCTION_RECORDS_CHANNEL_ID,
          data: { type: notification.type, recordId: record._id },
        });
      }
    }
    if (messages.length > 0) {
      await ctx.scheduler.runAfter(0, internal.pushNotifications.sendExpoPushMessages, {
        messages,
      });
    }
  } catch (error) {
    console.error("Could not schedule production-line push notifications", error);
  }
}

/** Notifies every workspace member who may review the record, except the submitter. */
export async function notifyReviewersOfSubmission(
  ctx: MutationCtx,
  record: Doc<"productionLineRecords">,
  submitter: { _id: string; name?: string | null; email?: string | null },
) {
  const members = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organizationId", (q) => q.eq("organizationId", record.organizationId))
    .take(MAXIMUM_MEMBERS_SCANNED);
  const organization = await ctx.db.get(record.organizationId);
  const roleCache = new Map<string, Doc<"roles"> | null>();
  const getRole = async (member: Doc<"organizationMembers">) => {
    // Members without an explicit role fall back to the operator role, as in permissions.ts.
    const cacheKey = member.roleId ?? "operator";
    if (!roleCache.has(cacheKey)) {
      roleCache.set(
        cacheKey,
        member.roleId
          ? await ctx.db.get(member.roleId)
          : await ctx.db
              .query("roles")
              .withIndex("by_organizationId_and_key", (q) =>
                q.eq("organizationId", record.organizationId).eq("key", "operator"),
              )
              .unique(),
      );
    }
    return roleCache.get(cacheKey) ?? null;
  };

  const reviewerIds: string[] = [];
  for (const member of members) {
    if (member.userId === submitter._id) {
      continue;
    }
    const hasFullAccess =
      member.role === "owner" || member.role === "admin" || organization?.ownerId === member.userId;
    if (hasFullAccess || roleHasPermission(await getRole(member), "review_production_checks")) {
      reviewerIds.push(member.userId);
    }
  }

  await notifyUsers(ctx, reviewerIds, record, {
    type: "record_submitted",
    submitterName: submitter.name ?? submitter.email ?? "",
  });
}

/** Notifies the inspector who owns the record about a review decision. */
export async function notifyInspectorOfDecision(
  ctx: MutationCtx,
  record: Doc<"productionLineRecords">,
  decision: "approved" | "returned",
  note?: string,
) {
  await notifyUsers(
    ctx,
    [record.qcUserId],
    record,
    decision === "approved" ? { type: "record_approved" } : { type: "record_returned", note },
  );
}

export const registerPushToken = mutation({
  args: {
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authUser = await getAuthUserOrThrow(ctx);
    if (!EXPO_PUSH_TOKEN_PATTERN.test(args.token)) {
      throw new Error("Invalid Expo push token");
    }
    const sessionId = (await getCurrentSessionId(ctx)) ?? undefined;
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: authUser._id,
        platform: args.platform,
        sessionId,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("pushTokens", {
        userId: authUser._id,
        token: args.token,
        platform: args.platform,
        sessionId,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

/** Called before sign-out so the device stops receiving the user's notifications. */
export const unregisterPushToken = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authUser = await getAuthUserOrThrow(ctx);
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (existing && existing.userId === authUser._id) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

export const removePushTokens = internalMutation({
  args: { tokens: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const token of args.tokens) {
      const existing = await ctx.db
        .query("pushTokens")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique();
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    }
    return null;
  },
});

export const sendExpoPushMessages = internalAction({
  args: { messages: v.array(pushMessageValidator) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const unregisteredTokens: string[] = [];
    for (let start = 0; start < args.messages.length; start += EXPO_PUSH_BATCH_SIZE) {
      const batch = args.messages.slice(start, start + EXPO_PUSH_BATCH_SIZE);
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(batch.map((message) => ({ ...message, sound: "default" }))),
      });
      if (!response.ok) {
        console.error(`Expo push request failed with HTTP ${response.status}`, await response.text());
        continue;
      }
      const result: unknown = await response.json();
      const tickets =
        typeof result === "object" && result !== null && "data" in result && Array.isArray(result.data)
          ? (result.data as unknown[])
          : [];
      tickets.forEach((ticket, index) => {
        if (typeof ticket !== "object" || ticket === null || !("status" in ticket)) {
          return;
        }
        if (ticket.status !== "error") {
          return;
        }
        const details = "details" in ticket ? ticket.details : undefined;
        const errorCode =
          typeof details === "object" && details !== null && "error" in details
            ? details.error
            : undefined;
        if (errorCode === "DeviceNotRegistered") {
          unregisteredTokens.push(batch[index].to);
        } else {
          console.error("Expo push ticket error", ticket);
        }
      });
    }
    if (unregisteredTokens.length > 0) {
      await ctx.runMutation(internal.pushNotifications.removePushTokens, {
        tokens: unregisteredTokens,
      });
    }
    return null;
  },
});

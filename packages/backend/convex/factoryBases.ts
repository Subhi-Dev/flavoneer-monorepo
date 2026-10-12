import { v } from "convex/values";
import {
  DEFAULT_FACTORY_BASE_KEY,
  FACTORY_BASE_NAMES,
  type FactoryBaseKey,
} from "../lib/factory-bases";
import { mutation, query } from "./_generated/server";
import { requireSuperAdmin } from "./superAdminAccess";
import { factoryBaseKeyValidator } from "./validators";
import { requireWorkspaceMember } from "./workspaceAccess";

const MAX_ASSIGNMENTS = 1000;

const nullableFactoryBaseKeyValidator = v.union(factoryBaseKeyValidator, v.null());

/** Returns the audit summary for an assignment change, or null when nothing changes. */
export function factoryBaseChangeSummary(
  previous: FactoryBaseKey | null,
  next: FactoryBaseKey | null,
): string | null {
  if (previous === next) {
    return null;
  }
  if (next === null) {
    return `Removed 3D factory: ${FACTORY_BASE_NAMES[previous as FactoryBaseKey]}`;
  }
  return `Assigned 3D factory: ${FACTORY_BASE_NAMES[next]}`;
}

export const getForOrganization = query({
  args: { organizationId: v.id("organizations") },
  returns: factoryBaseKeyValidator,
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.organizationId);
    const assignment = await ctx.db
      .query("organizationFactoryBases")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    return assignment?.factoryKey ?? DEFAULT_FACTORY_BASE_KEY;
  },
});

export const listForSuperAdmin = query({
  args: {},
  returns: v.array(
    v.object({
      organizationId: v.id("organizations"),
      factoryKey: factoryBaseKeyValidator,
    }),
  ),
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const assignments = await ctx.db.query("organizationFactoryBases").take(MAX_ASSIGNMENTS);
    return assignments.map(({ organizationId, factoryKey }) => ({ organizationId, factoryKey }));
  },
});

export const assign = mutation({
  args: {
    organizationId: v.id("organizations"),
    factoryKey: nullableFactoryBaseKeyValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireSuperAdmin(ctx);
    const organization = await ctx.db.get("organizations", args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const existing = await ctx.db
      .query("organizationFactoryBases")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    const summary = factoryBaseChangeSummary(existing?.factoryKey ?? null, args.factoryKey);
    if (!summary) {
      return null;
    }

    const now = Date.now();
    if (args.factoryKey === null) {
      if (existing) {
        await ctx.db.delete("organizationFactoryBases", existing._id);
      }
    } else if (existing) {
      await ctx.db.patch("organizationFactoryBases", existing._id, {
        factoryKey: args.factoryKey,
        updatedAt: now,
        updatedBy: identity.authUser._id,
      });
    } else {
      await ctx.db.insert("organizationFactoryBases", {
        organizationId: args.organizationId,
        factoryKey: args.factoryKey,
        updatedAt: now,
        updatedBy: identity.authUser._id,
      });
    }

    await ctx.db.insert("platformAuditLogs", {
      actorId: identity.authUser._id,
      actorName: identity.user.name ?? identity.user.email ?? "Super admin",
      action: "factory_base.assigned",
      targetType: "organization",
      targetId: organization._id,
      targetLabel: organization.name,
      summary,
      createdAt: now,
    });
    return null;
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const getActivePlans = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("plans")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("asc")
      .collect();
  },
});

export const getAllPlans = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("plans").order("asc").collect();
  },
});

export const getPlanById = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.planId);
  },
});

// Seed default plans (admin only, idempotent)
export const seedDefaultPlans = mutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });

    const existing = await ctx.db.query("plans").collect();
    if (existing.length > 0) return;

    const defaults = [
      { name: "Starter", price: 400, level1Commission: 8, level2Commission: 1, sortOrder: 1 },
      { name: "Growth", price: 560, level1Commission: 10, level2Commission: 2, sortOrder: 2 },
      { name: "Elite", price: 750, level1Commission: 15, level2Commission: 4, sortOrder: 3 },
    ];

    for (const plan of defaults) {
      await ctx.db.insert("plans", { ...plan, isActive: true });
    }
  },
});

export const adminCreatePlan = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    level1Commission: v.number(),
    level2Commission: v.number(),
    isActive: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });

    await ctx.db.insert("plans", args);
  },
});

export const adminUpdatePlan = mutation({
  args: {
    planId: v.id("plans"),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    level1Commission: v.optional(v.number()),
    level2Commission: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });

    const { planId, ...updates } = args;
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    await ctx.db.patch(planId, clean);
  },
});

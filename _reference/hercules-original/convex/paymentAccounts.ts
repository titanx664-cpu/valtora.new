import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const getActivePaymentAccounts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("paymentAccounts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("asc")
      .collect();
  },
});

export const getAllPaymentAccounts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });

    return await ctx.db.query("paymentAccounts").order("asc").collect();
  },
});

export const adminCreatePaymentAccount = mutation({
  args: {
    method: v.string(),
    accountName: v.string(),
    accountNumber: v.string(),
    instructions: v.optional(v.string()),
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

    await ctx.db.insert("paymentAccounts", args);
  },
});

export const adminUpdatePaymentAccount = mutation({
  args: {
    accountId: v.id("paymentAccounts"),
    method: v.optional(v.string()),
    accountName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    instructions: v.optional(v.string()),
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

    const { accountId, ...updates } = args;
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    await ctx.db.patch(accountId, clean);
  },
});

export const adminDeletePaymentAccount = mutation({
  args: { accountId: v.id("paymentAccounts") },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });

    await ctx.db.delete(args.accountId);
  },
});

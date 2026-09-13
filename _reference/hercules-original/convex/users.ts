import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

// Called from auth callback
export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: identity.name ?? existing.name,
        email: identity.email ?? existing.email,
      });
    }
  },
});

// Register a new user with optional referral code
export const registerUser = mutation({
  args: {
    username: v.string(),
    referralCode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"users">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });

    // Check if already registered
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (existing) return existing._id;

    // Validate username uniqueness
    const usernameCheck = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username.toLowerCase()))
      .unique();
    if (usernameCheck) {
      throw new ConvexError({ code: "CONFLICT", message: "Username already taken" });
    }

    // Resolve referral
    let referrerId: Id<"users"> | undefined;
    if (args.referralCode) {
      const referrer = await ctx.db
        .query("users")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referralCode!))
        .unique();
      if (!referrer) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid referral code" });
      }
      referrerId = referrer._id;
    }

    // Generate unique referral code
    const myCode = generateReferralCode(args.username);

    const userId = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name ?? args.username,
      email: identity.email,
      username: args.username.toLowerCase(),
      referralCode: myCode,
      referredBy: referrerId,
      isAdmin: false,
      isActive: true,
    });

    return userId;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});

export const isRegistered = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    return !!user;
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

    await ctx.db.patch(user._id, {
      name: args.name ?? user.name,
    });
  },
});

// Admin: get paginated users
export const adminListUsers = query({
  args: {
    paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });

    const results = await ctx.db.query("users").order("desc").paginate(args.paginationOpts);
    return results;
  },
});

export const adminGetUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });
    return await ctx.db.get(args.userId);
  },
});

export const adminSetAdmin = mutation({
  args: { userId: v.id("users"), isAdmin: v.boolean() },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });

    await ctx.db.patch(args.userId, { isAdmin: args.isAdmin });
  },
});

export const adminSetActive = mutation({
  args: { userId: v.id("users"), isActive: v.boolean() },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });

    await ctx.db.patch(args.userId, { isActive: args.isActive });
  },
});

// Seed initial admin by token identifier (run once via dashboard)
export const seedAdmin = mutation({
  args: { secretKey: v.string() },
  handler: async (ctx, args): Promise<string> => {
    if (args.secretKey !== "VALTORA_SEED_ADMIN_2024") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Invalid key" });
    }
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "Register first" });

    await ctx.db.patch(user._id, { isAdmin: true });
    return user._id;
  },
});

function generateReferralCode(username: string): string {
  const base = username.toUpperCase().slice(0, 4).replace(/[^A-Z0-9]/g, "X");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}${rand}`;
}

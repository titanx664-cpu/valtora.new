import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";

// Helper: get authed user or throw
async function getAuthedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
  return user;
}

// ── USER: Get or create their support chat ──────────────────────────────────
export const getOrCreateMyChat = mutation({
  args: {},
  handler: async (ctx): Promise<Id<"supportChats">> => {
    const user = await getAuthedUser(ctx);
    const existing = await ctx.db
      .query("supportChats")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("supportChats", {
      userId: user._id,
      status: "open",
      lastMessageAt: new Date().toISOString(),
      unreadByAdmin: 0,
      unreadByUser: 0,
    });
  },
});

// ── USER: Get their chat ────────────────────────────────────────────────────
export const getMyChat = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;
    return await ctx.db
      .query("supportChats")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

// ── USER: Get messages for their chat ──────────────────────────────────────
export const getMyChatMessages = query({
  args: { chatId: v.id("supportChats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];
    const chat = await ctx.db.get("supportChats", args.chatId);
    if (!chat || chat.userId !== user._id) return [];
    return await ctx.db
      .query("supportMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
  },
});

// ── USER: Send a message ────────────────────────────────────────────────────
export const sendMessage = mutation({
  args: { chatId: v.id("supportChats"), body: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthedUser(ctx);
    const chat = await ctx.db.get("supportChats", args.chatId);
    if (!chat || chat.userId !== user._id) {
      throw new ConvexError({ message: "Chat not found", code: "NOT_FOUND" });
    }
    const trimmed = args.body.trim();
    if (!trimmed) throw new ConvexError({ message: "Message cannot be empty", code: "BAD_REQUEST" });

    await ctx.db.insert("supportMessages", {
      chatId: args.chatId,
      senderId: user._id,
      senderRole: "user",
      body: trimmed,
      isRead: false,
    });
    await ctx.db.patch("supportChats", args.chatId, {
      lastMessageAt: new Date().toISOString(),
      lastMessagePreview: trimmed.slice(0, 80),
      unreadByAdmin: (chat.unreadByAdmin ?? 0) + 1,
      status: "open",
    });
  },
});

// ── USER: Mark admin messages as read ──────────────────────────────────────
export const markAdminMessagesRead = mutation({
  args: { chatId: v.id("supportChats") },
  handler: async (ctx, args) => {
    const user = await getAuthedUser(ctx);
    const chat = await ctx.db.get("supportChats", args.chatId);
    if (!chat || chat.userId !== user._id) return;

    const unread = await ctx.db
      .query("supportMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();

    for (const msg of unread) {
      if (msg.senderRole === "admin" && !msg.isRead) {
        await ctx.db.patch("supportMessages", msg._id, { isRead: true });
      }
    }
    await ctx.db.patch("supportChats", args.chatId, { unreadByUser: 0 });
  },
});

// ── USER: Get unread count from admin ──────────────────────────────────────
export const getMyUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return 0;
    const chat = await ctx.db
      .query("supportChats")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    return chat?.unreadByUser ?? 0;
  },
});

// ── ADMIN: List all chats ────────────────────────────────────────────────────
export const adminListChats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) return [];

    const chats = await ctx.db.query("supportChats").order("desc").take(200);

    return await Promise.all(
      chats.map(async (chat) => {
        const user = await ctx.db.get("users", chat.userId);
        return { ...chat, user: { name: user?.name, username: user?.username } };
      })
    );
  },
});

// ── ADMIN: Get messages for a chat ─────────────────────────────────────────
export const adminGetMessages = query({
  args: { chatId: v.id("supportChats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) return [];

    return await ctx.db
      .query("supportMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
  },
});

// ── ADMIN: Reply to a chat ─────────────────────────────────────────────────
export const adminReply = mutation({
  args: { chatId: v.id("supportChats"), body: v.string() },
  handler: async (ctx, args) => {
    const admin = await getAuthedUser(ctx);
    if (!admin.isAdmin) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });

    const chat = await ctx.db.get("supportChats", args.chatId);
    if (!chat) throw new ConvexError({ message: "Chat not found", code: "NOT_FOUND" });

    const trimmed = args.body.trim();
    if (!trimmed) throw new ConvexError({ message: "Message cannot be empty", code: "BAD_REQUEST" });

    await ctx.db.insert("supportMessages", {
      chatId: args.chatId,
      senderId: admin._id,
      senderRole: "admin",
      body: trimmed,
      isRead: false,
    });
    await ctx.db.patch("supportChats", args.chatId, {
      lastMessageAt: new Date().toISOString(),
      lastMessagePreview: `[Admin] ${trimmed.slice(0, 70)}`,
      unreadByUser: (chat.unreadByUser ?? 0) + 1,
    });
  },
});

// ── ADMIN: Mark user messages as read ──────────────────────────────────────
export const adminMarkRead = mutation({
  args: { chatId: v.id("supportChats") },
  handler: async (ctx, args) => {
    const admin = await getAuthedUser(ctx);
    if (!admin.isAdmin) return;

    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();

    for (const msg of messages) {
      if (msg.senderRole === "user" && !msg.isRead) {
        await ctx.db.patch("supportMessages", msg._id, { isRead: true });
      }
    }
    await ctx.db.patch("supportChats", args.chatId, { unreadByAdmin: 0 });
  },
});

// ── ADMIN: Close / reopen a chat ────────────────────────────────────────────
export const adminSetChatStatus = mutation({
  args: { chatId: v.id("supportChats"), status: v.union(v.literal("open"), v.literal("closed")) },
  handler: async (ctx, args) => {
    const admin = await getAuthedUser(ctx);
    if (!admin.isAdmin) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    await ctx.db.patch("supportChats", args.chatId, { status: args.status });
  },
});

// ── ADMIN: Total unread from users ─────────────────────────────────────────
export const adminTotalUnread = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) return 0;
    const chats = await ctx.db.query("supportChats").take(500);
    return chats.reduce((sum, c) => sum + (c.unreadByAdmin ?? 0), 0);
  },
});

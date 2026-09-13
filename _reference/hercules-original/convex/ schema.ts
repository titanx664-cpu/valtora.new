import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Core user profiles
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    username: v.string(),
    referralCode: v.string(), // unique code for this user
    referredBy: v.optional(v.id("users")), // direct referrer (Level 1 source)
    isAdmin: v.boolean(),
    isActive: v.boolean(),
    avatarUrl: v.optional(v.string()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_username", ["username"])
    .index("by_referral_code", ["referralCode"])
    .index("by_referred_by", ["referredBy"]),

  // Plans configuration
  plans: defineTable({
    name: v.string(),
    price: v.number(), // PKR
    level1Commission: v.number(), // percentage (e.g. 8 = 8%)
    level2Commission: v.number(), // percentage
    isActive: v.boolean(),
    sortOrder: v.number(),
  }).index("by_active", ["isActive"]),

  // Payment accounts (admin-managed, shown during deposit)
  paymentAccounts: defineTable({
    method: v.string(), // "Easypaisa" | "JazzCash" | "Bank"
    accountName: v.string(),
    accountNumber: v.string(),
    instructions: v.optional(v.string()),
    isActive: v.boolean(),
    sortOrder: v.number(),
  }).index("by_active", ["isActive"]),

  // Deposits submitted by users
  deposits: defineTable({
    userId: v.id("users"),
    planId: v.id("plans"),
    planSnapshot: v.object({
      name: v.string(),
      price: v.number(),
      level1Commission: v.number(),
      level2Commission: v.number(),
    }),
    amount: v.number(),
    transactionId: v.string(), // user-submitted reference
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    adminNote: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.string()),
    commissionsGenerated: v.boolean(), // prevent double commission
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_transaction_id", ["transactionId"])
    .index("by_user_status", ["userId", "status"]),

  // Withdrawals submitted by users
  withdrawals: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    method: v.union(
      v.literal("Easypaisa"),
      v.literal("JazzCash"),
      v.literal("Bank")
    ),
    accountDetails: v.object({
      accountNumber: v.string(),
      accountName: v.optional(v.string()),
      bankName: v.optional(v.string()),
      additionalInfo: v.optional(v.string()),
    }),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("rejected")
    ),
    adminNote: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.string()),
    submittedOnSunday: v.boolean(), // server-side enforced
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"]),

  // Financial ledger — immutable append-only records
  ledger: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("deposit"),
      v.literal("commission"),
      v.literal("withdrawal_debit"),
      v.literal("withdrawal_refund"),
      v.literal("admin_adjustment")
    ),
    direction: v.union(v.literal("credit"), v.literal("debit")),
    amount: v.number(),
    status: v.union(
      v.literal("completed"),
      v.literal("pending"),
      v.literal("reversed")
    ),
    referenceId: v.optional(v.string()), // depositId or withdrawalId
    referenceType: v.optional(v.string()),
    description: v.string(),
    metadata: v.optional(v.string()), // JSON string for extra data
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"])
    .index("by_reference", ["referenceId"]),

  // Commission records
  commissions: defineTable({
    recipientId: v.id("users"), // who receives the commission
    sourceUserId: v.id("users"), // whose deposit triggered it
    depositId: v.id("deposits"),
    level: v.union(v.literal(1), v.literal(2)),
    amount: v.number(),
    percentage: v.number(),
    planName: v.string(),
    status: v.union(v.literal("pending"), v.literal("credited"), v.literal("reversed")),
  })
    .index("by_recipient", ["recipientId"])
    .index("by_deposit", ["depositId"])
    .index("by_recipient_status", ["recipientId", "status"]),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("deposit_submitted"),
      v.literal("deposit_approved"),
      v.literal("deposit_rejected"),
      v.literal("plan_activated"),
      v.literal("commission_received"),
      v.literal("withdrawal_submitted"),
      v.literal("withdrawal_approved"),
      v.literal("withdrawal_processing"),
      v.literal("withdrawal_rejected"),
      v.literal("withdrawal_completed")
    ),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    referenceId: v.optional(v.string()),
    referenceType: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"]),

  // Support chat conversations
  supportChats: defineTable({
    userId: v.id("users"),
    subject: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("closed")),
    lastMessageAt: v.string(), // ISO 8601
    lastMessagePreview: v.optional(v.string()),
    unreadByAdmin: v.number(), // count of messages not yet read by admin
    unreadByUser: v.number(),  // count of messages not yet read by user
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_last_message", ["lastMessageAt"]),

  // Individual messages inside a support chat
  supportMessages: defineTable({
    chatId: v.id("supportChats"),
    senderId: v.id("users"),
    senderRole: v.union(v.literal("user"), v.literal("admin")),
    body: v.string(),
    isRead: v.boolean(),
  })
    .index("by_chat", ["chatId"])
    .index("by_chat_read", ["chatId", "isRead"]),

  // Admin audit log
  auditLogs: defineTable({
    adminId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.optional(v.string()), // JSON
    ipAddress: v.optional(v.string()),
  })
    .index("by_admin", ["adminId"])
    .index("by_entity", ["entityType", "entityId"]),
});

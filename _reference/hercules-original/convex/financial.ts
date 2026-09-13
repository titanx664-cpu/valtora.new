import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel.d.ts";
import type { MutationCtx } from "./_generated/server";

// ---- HELPERS ----

async function requireUser(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  if (!user.isActive) throw new ConvexError({ code: "FORBIDDEN", message: "Account inactive" });
  return user;
}

async function requireAdmin(ctx: MutationCtx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!user.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });
  return user;
}

async function computeBalance(ctx: MutationCtx, userId: Id<"users">): Promise<number> {
  const entries = await ctx.db
    .query("ledger")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  let balance = 0;
  for (const entry of entries) {
    if (entry.status !== "completed") continue;
    if (entry.direction === "credit") balance += entry.amount;
    else balance -= entry.amount;
  }
  return Math.max(0, balance);
}

// ---- QUERIES ----

export const getMyDeposits = query({
  args: {
    paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: "" };
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return { page: [], isDone: true, continueCursor: "" };

    return await ctx.db
      .query("deposits")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getMyWallet = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const allLedger = await ctx.db
      .query("ledger")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let balance = 0;
    let totalEarnings = 0;
    let totalCommissions = 0;
    let totalWithdrawals = 0;

    for (const entry of allLedger) {
      if (entry.status !== "completed") continue;
      if (entry.direction === "credit") {
        balance += entry.amount;
        totalEarnings += entry.amount;
        if (entry.type === "commission") totalCommissions += entry.amount;
      } else {
        balance -= entry.amount;
        if (entry.type === "withdrawal_debit") totalWithdrawals += entry.amount;
      }
    }

    // Pending deposits
    const pendingDeposits = await ctx.db
      .query("deposits")
      .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "pending"))
      .collect();

    // Pending withdrawals
    const pendingWithdrawals = await ctx.db
      .query("withdrawals")
      .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "pending"))
      .collect();

    // Active plan (most recent approved deposit)
    const approvedDeposits = await ctx.db
      .query("deposits")
      .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "approved"))
      .order("desc")
      .take(1);

    return {
      balance: Math.max(0, balance),
      totalEarnings,
      totalCommissions,
      totalWithdrawals,
      pendingDepositsCount: pendingDeposits.length,
      pendingWithdrawalsCount: pendingWithdrawals.length,
      activePlan: approvedDeposits[0]?.planSnapshot ?? null,
    };
  },
});

export const getMyLedger = query({
  args: {
    paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: "" };
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return { page: [], isDone: true, continueCursor: "" };

    return await ctx.db
      .query("ledger")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getMyCommissions = query({
  args: {
    paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: "" };
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return { page: [], isDone: true, continueCursor: "" };

    return await ctx.db
      .query("commissions")
      .withIndex("by_recipient", (q) => q.eq("recipientId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getMyWithdrawals = query({
  args: {
    paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: "" };
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return { page: [], isDone: true, continueCursor: "" };

    return await ctx.db
      .query("withdrawals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getMyReferrals = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { level1: [], level2: [] };
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return { level1: [], level2: [] };

    const level1 = await ctx.db
      .query("users")
      .withIndex("by_referred_by", (q) => q.eq("referredBy", user._id))
      .collect();

    const level2: Doc<"users">[] = [];
    for (const l1 of level1) {
      const children = await ctx.db
        .query("users")
        .withIndex("by_referred_by", (q) => q.eq("referredBy", l1._id))
        .collect();
      level2.push(...children);
    }

    return {
      level1: level1.map((u) => ({ id: u._id, name: u.name, username: u.username, createdAt: u._creationTime })),
      level2: level2.map((u) => ({ id: u._id, name: u.name, username: u.username, createdAt: u._creationTime })),
    };
  },
});

// ---- MUTATIONS ----

export const submitDeposit = mutation({
  args: {
    planId: v.id("plans"),
    transactionId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"deposits">> => {
    const user = await requireUser(ctx);

    const plan = await ctx.db.get(args.planId);
    if (!plan || !plan.isActive) throw new ConvexError({ code: "BAD_REQUEST", message: "Plan not available" });

    // Prevent duplicate transaction IDs
    const dupCheck = await ctx.db
      .query("deposits")
      .withIndex("by_transaction_id", (q) => q.eq("transactionId", args.transactionId.trim()))
      .unique();
    if (dupCheck) throw new ConvexError({ code: "CONFLICT", message: "Transaction ID already submitted" });

    const depositId = await ctx.db.insert("deposits", {
      userId: user._id,
      planId: args.planId,
      planSnapshot: {
        name: plan.name,
        price: plan.price,
        level1Commission: plan.level1Commission,
        level2Commission: plan.level2Commission,
      },
      amount: plan.price,
      transactionId: args.transactionId.trim(),
      status: "pending",
      commissionsGenerated: false,
    });

    // Notify user
    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "deposit_submitted",
      title: "Deposit Submitted",
      message: `Your deposit for ${plan.name} plan (PKR ${plan.price}) is under review.`,
      isRead: false,
      referenceId: depositId,
      referenceType: "deposit",
    });

    return depositId;
  },
});

export const requestWithdrawal = mutation({
  args: {
    amount: v.number(),
    method: v.union(v.literal("Easypaisa"), v.literal("JazzCash"), v.literal("Bank")),
    accountNumber: v.string(),
    accountName: v.optional(v.string()),
    bankName: v.optional(v.string()),
    additionalInfo: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"withdrawals">> => {
    const user = await requireUser(ctx);

    // Enforce Sunday in Asia/Karachi
    const nowUtc = new Date();
    const karachi = toKarachiDay(nowUtc);
    if (karachi !== 0) {
      // 0 = Sunday
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Withdrawals are only available on Sundays (Asia/Karachi time).",
      });
    }

    if (args.amount <= 0) throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid amount" });

    // Check available balance
    const allLedger = await ctx.db
      .query("ledger")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    let balance = 0;
    for (const entry of allLedger) {
      if (entry.status !== "completed") continue;
      if (entry.direction === "credit") balance += entry.amount;
      else balance -= entry.amount;
    }
    balance = Math.max(0, balance);

    if (args.amount > balance) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Insufficient balance" });
    }

    // Create withdrawal
    const withdrawalId = await ctx.db.insert("withdrawals", {
      userId: user._id,
      amount: args.amount,
      method: args.method,
      accountDetails: {
        accountNumber: args.accountNumber,
        accountName: args.accountName,
        bankName: args.bankName,
        additionalInfo: args.additionalInfo,
      },
      status: "pending",
      submittedOnSunday: true,
    });

    // Reserve the balance via pending ledger debit
    await ctx.db.insert("ledger", {
      userId: user._id,
      type: "withdrawal_debit",
      direction: "debit",
      amount: args.amount,
      status: "pending",
      referenceId: withdrawalId,
      referenceType: "withdrawal",
      description: `Withdrawal via ${args.method} - pending`,
    });

    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "withdrawal_submitted",
      title: "Withdrawal Requested",
      message: `Your withdrawal of PKR ${args.amount} via ${args.method} is pending review.`,
      isRead: false,
      referenceId: withdrawalId,
      referenceType: "withdrawal",
    });

    return withdrawalId;
  },
});

// ---- ADMIN MUTATIONS ----

export const adminApproveDeposit = mutation({
  args: { depositId: v.id("deposits"), note: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const admin = await requireAdmin(ctx);

    const deposit = await ctx.db.get(args.depositId);
    if (!deposit) throw new ConvexError({ code: "NOT_FOUND", message: "Deposit not found" });
    if (deposit.status !== "pending") {
      throw new ConvexError({ code: "CONFLICT", message: "Deposit already processed" });
    }

    // Idempotency guard
    if (deposit.commissionsGenerated) {
      throw new ConvexError({ code: "CONFLICT", message: "Commissions already generated" });
    }

    const now = new Date().toISOString();

    // Approve deposit
    await ctx.db.patch(args.depositId, {
      status: "approved",
      reviewedBy: admin._id,
      reviewedAt: now,
      adminNote: args.note,
      commissionsGenerated: true,
    });

    // Credit deposit amount to user's ledger
    await ctx.db.insert("ledger", {
      userId: deposit.userId,
      type: "deposit",
      direction: "credit",
      amount: deposit.amount,
      status: "completed",
      referenceId: args.depositId,
      referenceType: "deposit",
      description: `Deposit approved — ${deposit.planSnapshot.name} plan`,
    });

    // Notify user
    await ctx.db.insert("notifications", {
      userId: deposit.userId,
      type: "deposit_approved",
      title: "Deposit Approved",
      message: `Your ${deposit.planSnapshot.name} plan deposit of PKR ${deposit.amount} has been approved.`,
      isRead: false,
      referenceId: args.depositId,
      referenceType: "deposit",
    });
    await ctx.db.insert("notifications", {
      userId: deposit.userId,
      type: "plan_activated",
      title: "Plan Activated",
      message: `Your ${deposit.planSnapshot.name} plan is now active!`,
      isRead: false,
    });

    // Calculate commissions
    const depositor = await ctx.db.get(deposit.userId);
    if (!depositor) return;

    // Level 1 commission
    if (depositor.referredBy) {
      const l1Amount = (deposit.amount * deposit.planSnapshot.level1Commission) / 100;
      const commId = await ctx.db.insert("commissions", {
        recipientId: depositor.referredBy,
        sourceUserId: deposit.userId,
        depositId: args.depositId,
        level: 1,
        amount: l1Amount,
        percentage: deposit.planSnapshot.level1Commission,
        planName: deposit.planSnapshot.name,
        status: "credited",
      });

      await ctx.db.insert("ledger", {
        userId: depositor.referredBy,
        type: "commission",
        direction: "credit",
        amount: l1Amount,
        status: "completed",
        referenceId: commId,
        referenceType: "commission",
        description: `Level 1 commission from ${depositor.username} — ${deposit.planSnapshot.name}`,
      });

      await ctx.db.insert("notifications", {
        userId: depositor.referredBy,
        type: "commission_received",
        title: "Commission Earned",
        message: `You earned PKR ${l1Amount.toFixed(2)} Level 1 commission from ${depositor.username}.`,
        isRead: false,
        referenceId: commId,
        referenceType: "commission",
      });

      // Level 2 commission
      const l1User = await ctx.db.get(depositor.referredBy);
      if (l1User?.referredBy) {
        const l2Amount = (deposit.amount * deposit.planSnapshot.level2Commission) / 100;
        const comm2Id = await ctx.db.insert("commissions", {
          recipientId: l1User.referredBy,
          sourceUserId: deposit.userId,
          depositId: args.depositId,
          level: 2,
          amount: l2Amount,
          percentage: deposit.planSnapshot.level2Commission,
          planName: deposit.planSnapshot.name,
          status: "credited",
        });

        await ctx.db.insert("ledger", {
          userId: l1User.referredBy,
          type: "commission",
          direction: "credit",
          amount: l2Amount,
          status: "completed",
          referenceId: comm2Id,
          referenceType: "commission",
          description: `Level 2 commission from ${depositor.username} — ${deposit.planSnapshot.name}`,
        });

        await ctx.db.insert("notifications", {
          userId: l1User.referredBy,
          type: "commission_received",
          title: "Commission Earned",
          message: `You earned PKR ${l2Amount.toFixed(2)} Level 2 commission from ${depositor.username}.`,
          isRead: false,
          referenceId: comm2Id,
          referenceType: "commission",
        });
      }
    }

    // Audit log
    await ctx.db.insert("auditLogs", {
      adminId: admin._id,
      action: "approve_deposit",
      entityType: "deposit",
      entityId: args.depositId,
      metadata: JSON.stringify({ amount: deposit.amount, plan: deposit.planSnapshot.name }),
    });
  },
});

export const adminRejectDeposit = mutation({
  args: { depositId: v.id("deposits"), note: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const admin = await requireAdmin(ctx);

    const deposit = await ctx.db.get(args.depositId);
    if (!deposit) throw new ConvexError({ code: "NOT_FOUND", message: "Deposit not found" });
    if (deposit.status !== "pending") {
      throw new ConvexError({ code: "CONFLICT", message: "Deposit already processed" });
    }

    const now = new Date().toISOString();
    await ctx.db.patch(args.depositId, {
      status: "rejected",
      reviewedBy: admin._id,
      reviewedAt: now,
      adminNote: args.note,
    });

    await ctx.db.insert("notifications", {
      userId: deposit.userId,
      type: "deposit_rejected",
      title: "Deposit Rejected",
      message: `Your deposit for ${deposit.planSnapshot.name} plan was rejected.${args.note ? ` Reason: ${args.note}` : ""}`,
      isRead: false,
      referenceId: args.depositId,
      referenceType: "deposit",
    });

    await ctx.db.insert("auditLogs", {
      adminId: admin._id,
      action: "reject_deposit",
      entityType: "deposit",
      entityId: args.depositId,
      metadata: JSON.stringify({ note: args.note }),
    });
  },
});

export const adminProcessWithdrawal = mutation({
  args: {
    withdrawalId: v.id("withdrawals"),
    action: v.union(v.literal("approve"), v.literal("reject"), v.literal("complete")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const admin = await requireAdmin(ctx);

    const withdrawal = await ctx.db.get(args.withdrawalId);
    if (!withdrawal) throw new ConvexError({ code: "NOT_FOUND", message: "Withdrawal not found" });

    const now = new Date().toISOString();

    if (args.action === "approve") {
      if (withdrawal.status !== "pending") {
        throw new ConvexError({ code: "CONFLICT", message: "Already processed" });
      }
      await ctx.db.patch(args.withdrawalId, {
        status: "processing",
        reviewedBy: admin._id,
        reviewedAt: now,
        adminNote: args.note,
      });

      // Update ledger entry to processing
      const pendingLedger = await ctx.db
        .query("ledger")
        .withIndex("by_reference", (q) => q.eq("referenceId", args.withdrawalId))
        .unique();
      if (pendingLedger) {
        await ctx.db.patch(pendingLedger._id, { status: "completed" });
      }

      await ctx.db.insert("notifications", {
        userId: withdrawal.userId,
        type: "withdrawal_approved",
        title: "Withdrawal Approved",
        message: `Your withdrawal of PKR ${withdrawal.amount} is being processed. Expected: 6-8 hours.`,
        isRead: false,
        referenceId: args.withdrawalId,
        referenceType: "withdrawal",
      });
    } else if (args.action === "complete") {
      if (withdrawal.status !== "processing") {
        throw new ConvexError({ code: "CONFLICT", message: "Must be in processing state" });
      }
      await ctx.db.patch(args.withdrawalId, { status: "completed", reviewedAt: now });

      await ctx.db.insert("notifications", {
        userId: withdrawal.userId,
        type: "withdrawal_completed",
        title: "Withdrawal Completed",
        message: `Your withdrawal of PKR ${withdrawal.amount} via ${withdrawal.method} has been completed.`,
        isRead: false,
        referenceId: args.withdrawalId,
        referenceType: "withdrawal",
      });
    } else if (args.action === "reject") {
      if (!["pending", "processing"].includes(withdrawal.status)) {
        throw new ConvexError({ code: "CONFLICT", message: "Already finalized" });
      }
      await ctx.db.patch(args.withdrawalId, {
        status: "rejected",
        reviewedBy: admin._id,
        reviewedAt: now,
        adminNote: args.note,
      });

      // Refund the pending ledger debit
      const pendingLedger = await ctx.db
        .query("ledger")
        .withIndex("by_reference", (q) => q.eq("referenceId", args.withdrawalId))
        .unique();
      if (pendingLedger) {
        await ctx.db.patch(pendingLedger._id, { status: "reversed" });
      }

      await ctx.db.insert("notifications", {
        userId: withdrawal.userId,
        type: "withdrawal_rejected",
        title: "Withdrawal Rejected",
        message: `Your withdrawal of PKR ${withdrawal.amount} was rejected.${args.note ? ` Reason: ${args.note}` : ""}`,
        isRead: false,
        referenceId: args.withdrawalId,
        referenceType: "withdrawal",
      });
    }

    await ctx.db.insert("auditLogs", {
      adminId: admin._id,
      action: `${args.action}_withdrawal`,
      entityType: "withdrawal",
      entityId: args.withdrawalId,
      metadata: JSON.stringify({ amount: withdrawal.amount, method: withdrawal.method }),
    });
  },
});

export const adminGetDeposits = query({
  args: {
    paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });

    if (args.status) {
      return await ctx.db
        .query("deposits")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("deposits").order("desc").paginate(args.paginationOpts);
  },
});

export const adminGetWithdrawals = query({
  args: {
    paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("rejected"))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });

    if (args.status) {
      return await ctx.db
        .query("withdrawals")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("withdrawals").order("desc").paginate(args.paginationOpts);
  },
});

export const adminGetStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });

    const [allDeposits, allWithdrawals, allUsers, allCommissions] = await Promise.all([
      ctx.db.query("deposits").collect(),
      ctx.db.query("withdrawals").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("commissions").collect(),
    ]);

    return {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter((u) => u.isActive).length,
      pendingDeposits: allDeposits.filter((d) => d.status === "pending").length,
      approvedDeposits: allDeposits.filter((d) => d.status === "approved").length,
      rejectedDeposits: allDeposits.filter((d) => d.status === "rejected").length,
      totalDepositVolume: allDeposits
        .filter((d) => d.status === "approved")
        .reduce((s, d) => s + d.amount, 0),
      pendingWithdrawals: allWithdrawals.filter((w) => w.status === "pending").length,
      completedWithdrawals: allWithdrawals.filter((w) => w.status === "completed").length,
      totalWithdrawalVolume: allWithdrawals
        .filter((w) => w.status === "completed")
        .reduce((s, w) => s + w.amount, 0),
      totalCommissions: allCommissions.reduce((s, c) => s + c.amount, 0),
    };
  },
});

export const adminGetAuditLogs = query({
  args: {
    paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });

    return await ctx.db.query("auditLogs").order("desc").paginate(args.paginationOpts);
  },
});

// ---- NOTIFICATIONS ----

export const getMyNotifications = query({
  args: {
    paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: "" };
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return { page: [], isDone: true, continueCursor: "" };

    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("isRead", false))
      .collect();
    return unread.length;
  },
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

    const notif = await ctx.db.get(args.notificationId);
    if (!notif || notif.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your notification" });
    }
    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("isRead", false))
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { isRead: true });
    }
  },
});

// ---- TIMEZONE HELPER ----
function toKarachiDay(date: Date): number {
  // Pakistan Standard Time = UTC+5
  const utcMs = date.getTime();
  const karachiMs = utcMs + 5 * 60 * 60 * 1000;
  const karachiDate = new Date(karachiMs);
  return karachiDate.getUTCDay(); // 0=Sunday
}

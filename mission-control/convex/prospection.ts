import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const stageValue = v.union(
  v.literal("exploration"),
  v.literal("qualification"),
  v.literal("first_contact"),
  v.literal("follow_up"),
  v.literal("interest_detected"),
  v.literal("crm_logged"),
  v.literal("human_handoff"),
  v.literal("performance_review"),
  v.literal("strategy_adjustment")
);

const scoreValidationValue = v.union(
  v.literal("pending"),
  v.literal("x1"),
  v.literal("x2"),
  v.literal("x8")
);

export const listProjects = query({
  args: {
    stage: v.optional(stageValue),
    ownerAgentId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const db = ctx.db as any;
    let projects = await db.query("prospectionProjects").order("desc").collect();

    if (args.stage) {
      projects = projects.filter((project: any) => project.stage === args.stage);
    }
    if (args.ownerAgentId) {
      projects = projects.filter(
        (project: any) => project.ownerAgentId === args.ownerAgentId
      );
    }

    return projects.slice(0, args.limit ?? 100);
  },
});

export const createProject = mutation({
  args: {
    name: v.string(),
    source: v.string(),
    industry: v.string(),
    region: v.union(v.literal("Europe"), v.literal("United States")),
    identifiedNeed: v.string(),
    proposedService: v.string(),
    setupFee: v.number(),
    monthlyFee: v.number(),
    interestLevel: v.union(
      v.literal("none"),
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("explicit")
    ),
    exchangeHistory: v.array(v.string()),
    needsHumanAction: v.boolean(),
    stage: stageValue,
    ownerAgentId: v.string(),
    tokenConsumption: v.number(),
    scoreValidation: scoreValidationValue,
    draftMessage: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const db = ctx.db as any;

    const id = await db.insert("prospectionProjects", {
      ...args,
      updatedAt: Date.now(),
    });

    await db.insert("activities", {
      agentId: args.createdBy,
      type: "project_created",
      summary: `${args.createdBy} created project: ${args.name}`,
    });

    return id;
  },
});

export const updateProject = mutation({
  args: {
    projectId: v.id("prospectionProjects"),
    source: v.optional(v.string()),
    industry: v.optional(v.string()),
    identifiedNeed: v.optional(v.string()),
    proposedService: v.optional(v.string()),
    setupFee: v.optional(v.number()),
    monthlyFee: v.optional(v.number()),
    interestLevel: v.optional(
      v.union(
        v.literal("none"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("explicit")
      )
    ),
    exchangeHistory: v.optional(v.array(v.string())),
    needsHumanAction: v.optional(v.boolean()),
    stage: v.optional(stageValue),
    tokenConsumption: v.optional(v.number()),
    scoreValidation: v.optional(scoreValidationValue),
    draftMessage: v.optional(v.string()),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const db = ctx.db as any;
    const { projectId, updatedBy, ...patch } = args;

    await db.patch(projectId, {
      ...patch,
      updatedAt: Date.now(),
    });

    await db.insert("activities", {
      agentId: updatedBy,
      type: patch.stage === "human_handoff" ? "human_handoff_requested" : "project_updated",
      summary: `${updatedBy} updated project ${projectId}`,
    });

    return projectId;
  },
});

export const listTools = query({
  args: {},
  handler: async (ctx) => {
    const db = ctx.db as any;
    return await db.query("prospectionTools").order("asc").collect();
  },
});

export const upsertTool = mutation({
  args: {
    key: v.string(),
    label: v.string(),
    status: v.union(
      v.literal("available"),
      v.literal("restricted"),
      v.literal("missing"),
      v.literal("unknown")
    ),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const db = ctx.db as any;
    const existing = await db
      .query("prospectionTools")
      .withIndex("by_key", (q: any) => q.eq("key", args.key))
      .first();

    if (existing) {
      await db.patch(existing._id, {
        label: args.label,
        status: args.status,
        updatedBy: args.updatedBy,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await db.insert("prospectionTools", {
      ...args,
      updatedAt: Date.now(),
    });
  },
});

export const getLatestSettings = query({
  args: {},
  handler: async (ctx) => {
    const db = ctx.db as any;
    const settings = await db
      .query("prospectionSettings")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(1);

    return settings[0] ?? null;
  },
});

export const upsertSettings = mutation({
  args: {
    mode: v.union(v.literal("batch"), v.literal("continuous")),
    dailyLimitEmails: v.number(),
    dailyLimitResearches: v.number(),
    dailyLimitFollowUps: v.number(),
    initialStrategy: v.string(),
    adaptationWindow: v.number(),
    launchValidated: v.boolean(),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const db = ctx.db as any;
    const latest = await db
      .query("prospectionSettings")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(1);

    if (latest[0]) {
      await db.patch(latest[0]._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return latest[0]._id;
    }

    return await db.insert("prospectionSettings", {
      ...args,
      updatedAt: Date.now(),
    });
  },
});

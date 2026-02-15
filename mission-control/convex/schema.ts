import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  agents: defineTable({
    agentId: v.string(),
    name: v.string(),
    role: v.string(),
    status: v.union(
      v.literal("online"),
      v.literal("working"),
      v.literal("idle"),
      v.literal("offline")
    ),
    currentTask: v.optional(v.id("tasks")),
    lastHeartbeat: v.number(),
    heartbeatInterval: v.number(),
    description: v.string(),
    avatar: v.optional(v.string()),
  })
    .index("by_agentId", ["agentId"])
    .index("by_status", ["status"]),

  tasks: defineTable({
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    assignedTo: v.optional(v.string()),
    createdBy: v.string(),
    tags: v.optional(v.array(v.string())),
    completedAt: v.optional(v.number()),
    result: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_assignedTo", ["assignedTo"]),

  messages: defineTable({
    from: v.string(),
    to: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    content: v.string(),
    type: v.union(
      v.literal("comment"),
      v.literal("decision"),
      v.literal("question"),
      v.literal("update"),
      v.literal("mention"),
      v.literal("system")
    ),
    mentions: v.optional(v.array(v.string())),
    threadId: v.optional(v.string()),
  })
    .index("by_taskId", ["taskId"])
    .index("by_from", ["from"])
    .index("by_threadId", ["threadId"]),

  activities: defineTable({
    agentId: v.string(),
    type: v.union(
      v.literal("task_created"),
      v.literal("task_assigned"),
      v.literal("task_moved"),
      v.literal("task_completed"),
      v.literal("comment_added"),
      v.literal("decision_made"),
      v.literal("agent_online"),
      v.literal("agent_offline"),
      v.literal("heartbeat"),
      v.literal("project_created"),
      v.literal("project_updated"),
      v.literal("interest_detected"),
      v.literal("human_handoff_requested"),
      v.literal("strategy_updated"),
      v.literal("system")
    ),
    taskId: v.optional(v.id("tasks")),
    summary: v.string(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_type", ["type"]),

  notifications: defineTable({
    targetAgent: v.string(),
    sourceAgent: v.string(),
    type: v.union(
      v.literal("mention"),
      v.literal("task_assigned"),
      v.literal("task_update"),
      v.literal("comment"),
      v.literal("review_request"),
      v.literal("system")
    ),
    taskId: v.optional(v.id("tasks")),
    messageId: v.optional(v.id("messages")),
    content: v.string(),
    read: v.boolean(),
    delivered: v.boolean(),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_targetAgent", ["targetAgent"])
    .index("by_delivered", ["delivered"]),

  documents: defineTable({
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("note"),
      v.literal("spec"),
      v.literal("report"),
      v.literal("reference")
    ),
    createdBy: v.string(),
    lastEditedBy: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    taskId: v.optional(v.id("tasks")),
  })
    .index("by_type", ["type"])
    .index("by_taskId", ["taskId"]),

  // Flexible table: external agents can write heterogeneous opportunity payloads.
  // Convex requires top-level document validators to be object/union/v.any().
  opportunities: defineTable(v.any()),

  prospectionProjects: defineTable({
    name: v.string(),
    source: v.string(),
    industry: v.string(),
    region: v.union(v.literal("Europe"), v.literal("United States")),
    identifiedNeed: v.string(),
    proposedService: v.string(),
    setupFee: v.number(),
    monthlyFee: v.number(),
    actualValue: v.optional(v.number()),
    interestLevel: v.union(
      v.literal("none"),
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("explicit")
    ),
    exchangeHistory: v.array(v.string()),
    needsHumanAction: v.boolean(),
    stage: v.union(
      v.literal("exploration"),
      v.literal("qualification"),
      v.literal("first_contact"),
      v.literal("follow_up"),
      v.literal("interest_detected"),
      v.literal("crm_logged"),
      v.literal("human_handoff"),
      v.literal("performance_review"),
      v.literal("strategy_adjustment")
    ),
    ownerAgentId: v.string(),
    tokenConsumption: v.number(),
    scoreValidation: v.union(
      v.literal("pending"),
      v.literal("x1"),
      v.literal("x2"),
      v.literal("x8")
    ),
    draftMessage: v.string(),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    archived: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
    createdBy: v.string(),
    updatedAt: v.number(),
  })
    .index("by_stage", ["stage"])
    .index("by_industry", ["industry"])
    .index("by_ownerAgentId", ["ownerAgentId"])
    .index("by_needsHumanAction", ["needsHumanAction"]),

  prospectionSettings: defineTable({
    mode: v.union(v.literal("batch"), v.literal("continuous")),
    dailyLimitEmails: v.number(),
    dailyLimitResearches: v.number(),
    dailyLimitFollowUps: v.number(),
    initialStrategy: v.string(),
    adaptationWindow: v.number(),
    launchValidated: v.boolean(),
    updatedBy: v.string(),
    updatedAt: v.number(),
  }).index("by_updatedAt", ["updatedAt"]),

  prospectionTools: defineTable({
    key: v.string(),
    label: v.string(),
    status: v.union(
      v.literal("available"),
      v.literal("restricted"),
      v.literal("missing"),
      v.literal("unknown")
    ),
    updatedBy: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});

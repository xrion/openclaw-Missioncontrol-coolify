import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const projectStages = [
  "exploration",
  "qualification",
  "first_contact",
  "follow_up",
  "interest_detected",
  "crm_logged",
  "human_handoff",
  "performance_review",
  "strategy_adjustment",
] as const;

type ProjectStage = (typeof projectStages)[number];
type InterestLevel = "none" | "low" | "medium" | "high" | "explicit";
type ScoreValidation = "pending" | "x1" | "x2" | "x8";

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

const interestLevelValue = v.union(
  v.literal("none"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("explicit")
);

const scoreValidationValue = v.union(
  v.literal("pending"),
  v.literal("x1"),
  v.literal("x2"),
  v.literal("x8")
);

const PROJECT_STAGE_SET = new Set<ProjectStage>(projectStages);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolvePathValue(
  record: Record<string, unknown>,
  keyOrPath: string
): unknown {
  if (!keyOrPath.includes(".")) return record[keyOrPath];
  const path = keyOrPath.split(".");

  let current: unknown = record;
  for (const segment of path) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function pickFirstValue(
  record: Record<string, unknown>,
  keys: string[]
): unknown {
  for (const key of keys) {
    const value = resolvePathValue(record, key);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function pickValue(record: Record<string, unknown>, keys: string[]): unknown {
  const direct = pickFirstValue(record, keys);
  if (direct !== undefined) return direct;

  const payload = record.payload;
  if (isRecord(payload)) {
    return pickFirstValue(payload, keys);
  }

  return undefined;
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return fallback;

  const compact = value.trim().replace(/\s+/g, "");
  if (!compact) return fallback;

  const normalized = compact.includes(",") && compact.includes(".")
    ? compact.replace(/,/g, "")
    : compact.replace(",", ".");
  const clean = normalized.replace(/[^0-9.-]/g, "");
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBooleanValue(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "required"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return fallback;
}

function toHistoryEntry(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (isRecord(value)) {
    const text = toStringValue(
      pickFirstValue(value, ["message", "text", "content", "note", "summary", "title"])
    );
    if (text) return text;
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return "";
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(toHistoryEntry)
      .filter((entry) => entry.length > 0);
  }

  const single = toHistoryEntry(value);
  return single ? [single] : [];
}

function joinLabelList(value: unknown): string {
  const parts = toStringArray(value);
  return parts.join(", ");
}

function normalizeRegion(value: unknown): "Europe" | "United States" {
  const normalized = toStringValue(value).toLowerCase();
  if (
    normalized.includes("us") ||
    normalized.includes("usa") ||
    normalized.includes("united states") ||
    normalized.includes("north america")
  ) {
    return "United States";
  }
  return "Europe";
}

function normalizeInterestLevel(value: unknown): InterestLevel {
  const normalized = toStringValue(value).toLowerCase();
  if (!normalized) return "none";
  if (normalized.includes("explicit") || normalized.includes("confirmed")) return "explicit";
  if (normalized.includes("high") || normalized.includes("hot")) return "high";
  if (normalized.includes("medium") || normalized.includes("warm")) return "medium";
  if (normalized.includes("low") || normalized.includes("cold")) return "low";
  return "none";
}

function normalizeStage(value: unknown): ProjectStage {
  const normalized = toStringValue(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (PROJECT_STAGE_SET.has(normalized as ProjectStage)) {
    return normalized as ProjectStage;
  }

  if (normalized.includes("qualif") || normalized.includes("research")) return "qualification";
  if (normalized.includes("contact") || normalized.includes("outreach")) return "first_contact";
  if (normalized.includes("follow")) return "follow_up";
  if (normalized.includes("interest") || normalized.includes("positive")) return "interest_detected";
  if (normalized.includes("crm") || normalized.includes("record")) return "crm_logged";
  if (normalized.includes("handoff") || normalized.includes("human") || normalized.includes("review")) {
    return "human_handoff";
  }
  if (normalized.includes("performance")) return "performance_review";
  if (normalized.includes("strategy") || normalized.includes("adjust")) return "strategy_adjustment";
  return "exploration";
}

function normalizeScoreValidation(value: unknown): ScoreValidation {
  if (typeof value === "number") {
    if (value >= 8) return "x8";
    if (value >= 2) return "x2";
    if (value >= 1) return "x1";
    return "pending";
  }

  const normalized = toStringValue(value).toLowerCase();
  if (!normalized || normalized === "pending") return "pending";
  if (normalized.includes("x8") || normalized === "8") return "x8";
  if (normalized.includes("x2") || normalized === "2") return "x2";
  if (normalized.includes("x1") || normalized === "1") return "x1";
  return "pending";
}

function normalizeOpportunityAsProject(opportunity: any) {
  const record = isRecord(opportunity) ? opportunity : {};

  const ownerAgentId = toStringValue(
    pickValue(record, ["ownerAgentId", "agentId", "assignedTo", "owner", "createdBy"]),
    "jarvis"
  );
  const stage = normalizeStage(
    pickValue(record, ["stage", "pipelineStage", "status", "crmStage", "step"])
  );
  const needsHumanAction = toBooleanValue(
    pickValue(record, ["needsHumanAction", "humanActionRequired", "requiresHuman", "handoffRequested"]),
    stage === "human_handoff"
  );
  const estimatedValue = toNumberValue(
    pickValue(record, [
      "estimatedValue",
      "estimated_value",
      "estimatedDealValue",
      "valueEstimate",
      "value_estimate",
    ])
  );
  const setupFee = toNumberValue(
    pickValue(record, ["setupFee", "oneTimeFee", "setupCost", "budgetSetup"]),
    estimatedValue
  );
  const monthlyFee = toNumberValue(
    pickValue(record, ["monthlyFee", "recurringFee", "retainer", "budgetMonthly"])
  );
  const actualValue = toNumberValue(
    pickValue(record, ["actualValue", "realValue", "finalValue", "dealValue", "contractValue"])
  );
  const serviceFromText = toStringValue(
    pickValue(record, [
      "proposedService",
      "service",
      "offer",
      "proposal",
      "solution",
      "servicePropose",
      "service_propose",
      "serviceProposed",
      "service_proposed",
    ])
  );
  const serviceFromTags = joinLabelList(
    pickValue(record, [
      "serviceProposedTags",
      "service_proposed_tags",
      "serviceTags",
      "service_tags",
      "service propose des tags",
      "tags",
      "service.tags",
    ])
  );
  const contactName = toStringValue(
    pickValue(record, [
      "contactName",
      "contact_name",
      "prospectContactName",
      "leadContactName",
      "contact.name",
      "prospect.contact.name",
    ])
  );
  const contactEmail = toStringValue(
    pickValue(record, [
      "contactEmail",
      "contact_email",
      "email",
      "contact.email",
      "prospect.contact.email",
    ])
  );
  const contactPhone = toStringValue(
    pickValue(record, [
      "contactPhone",
      "contact_phone",
      "phone",
      "contact.phone",
      "prospect.contact.phone",
      "contact.mobile",
    ])
  );
  const archived = toBooleanValue(
    pickValue(record, ["archived", "isArchived", "is_archived", "deleted"]),
    false
  );
  const archivedAtRaw = toNumberValue(
    pickValue(record, ["archivedAt", "archived_at", "deletedAt", "deleted_at"])
  );
  const archivedAt = archived && archivedAtRaw > 0 ? archivedAtRaw : undefined;

  return {
    _id: opportunity._id,
    _creationTime: opportunity._creationTime ?? Date.now(),
    name:
      toStringValue(
        pickValue(record, [
          "name",
          "company",
          "title",
          "organization",
          "client",
          "businessName",
          "prospectName",
          "prospect_name",
          "prospect name",
          "prospect.name",
        ])
      ) || `Opportunity ${String(opportunity._id ?? "").slice(0, 6)}`,
    source: toStringValue(
      pickValue(record, ["source", "origin", "channel", "platform", "entryPoint"])
    ),
    industry: toStringValue(
      pickValue(record, [
        "industry",
        "sector",
        "vertical",
        "segment",
        "prospectIndustry",
        "prospect_industry",
        "prospect industry",
        "prospect.industry",
      ])
    ),
    region: normalizeRegion(
      pickValue(record, ["region", "geo", "location", "country", "market"])
    ),
    identifiedNeed: toStringValue(
      pickValue(record, [
        "identifiedNeed",
        "need",
        "problem",
        "pain",
        "opportunity",
        "summary",
        "painIdentified",
        "pain_identified",
        "pain identified",
        "pain identifie",
        "pain identifié",
      ])
    ),
    proposedService: serviceFromText || serviceFromTags,
    setupFee,
    monthlyFee,
    actualValue,
    interestLevel: normalizeInterestLevel(
      pickValue(record, [
        "interestLevel",
        "interest",
        "interest_level",
        "leadTemperature",
        "temperature",
        "qualification",
      ])
    ),
    exchangeHistory: toStringArray(
      pickValue(record, ["exchangeHistory", "history", "messages", "notes", "timeline"])
    ),
    needsHumanAction,
    stage,
    ownerAgentId,
    tokenConsumption: toNumberValue(
      pickValue(record, ["tokenConsumption", "tokens", "tokenCount", "usageTokens", "costTokens"])
    ),
    scoreValidation: normalizeScoreValidation(
      pickValue(record, ["scoreValidation", "score", "humanScore", "validation"])
    ),
    draftMessage: toStringValue(
      pickValue(record, ["draftMessage", "messageDraft", "nextMessage", "outreachDraft", "emailDraft"])
    ),
    contactName,
    contactEmail,
    contactPhone,
    archived,
    archivedAt,
    createdBy: toStringValue(pickValue(record, ["createdBy", "agentId"]), ownerAgentId),
    updatedAt: toNumberValue(
      pickValue(record, ["updatedAt", "updated_at", "lastUpdated", "lastSeen"]),
      toNumberValue(opportunity._creationTime, Date.now())
    ),
  };
}

function toCanonicalOpportunityDoc(project: any, updatedAt: number) {
  return {
    name: project.name,
    source: project.source,
    industry: project.industry,
    region: project.region,
    identifiedNeed: project.identifiedNeed,
    proposedService: project.proposedService,
    setupFee: project.setupFee,
    monthlyFee: project.monthlyFee,
    actualValue: project.actualValue,
    interestLevel: project.interestLevel,
    exchangeHistory: project.exchangeHistory,
    needsHumanAction: project.needsHumanAction,
    stage: project.stage,
    ownerAgentId: project.ownerAgentId,
    tokenConsumption: project.tokenConsumption,
    scoreValidation: project.scoreValidation,
    draftMessage: project.draftMessage,
    contactName: project.contactName,
    contactEmail: project.contactEmail,
    contactPhone: project.contactPhone,
    archived: Boolean(project.archived),
    archivedAt: project.archivedAt,
    createdBy: project.createdBy,
    updatedAt,
  };
}

export const listProjects = query({
  args: {
    stage: v.optional(stageValue),
    ownerAgentId: v.optional(v.string()),
    limit: v.optional(v.number()),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const db = ctx.db as any;
    const prospectionProjects = await db
      .query("prospectionProjects")
      .order("desc")
      .collect();
    const opportunities = await db.query("opportunities").order("desc").collect();

    let projects = [
      ...prospectionProjects,
      ...opportunities.map((opportunity: any) =>
        normalizeOpportunityAsProject(opportunity)
      ),
    ];

    if (args.stage) {
      projects = projects.filter((project: any) => project.stage === args.stage);
    }
    if (args.ownerAgentId) {
      projects = projects.filter(
        (project: any) => project.ownerAgentId === args.ownerAgentId
      );
    }
    if (!args.includeArchived) {
      projects = projects.filter((project: any) => !Boolean(project.archived));
    }

    projects.sort(
      (a: any, b: any) =>
        (b.updatedAt ?? b._creationTime ?? 0) - (a.updatedAt ?? a._creationTime ?? 0)
    );

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
    actualValue: v.optional(v.number()),
    interestLevel: interestLevelValue,
    exchangeHistory: v.array(v.string()),
    needsHumanAction: v.boolean(),
    stage: stageValue,
    ownerAgentId: v.string(),
    tokenConsumption: v.number(),
    scoreValidation: scoreValidationValue,
    draftMessage: v.string(),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const db = ctx.db as any;

    const id = await db.insert("prospectionProjects", {
      ...args,
      actualValue: args.actualValue ?? 0,
      contactName: args.contactName ?? "",
      contactEmail: args.contactEmail ?? "",
      contactPhone: args.contactPhone ?? "",
      archived: false,
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
    projectId: v.string(),
    source: v.optional(v.string()),
    industry: v.optional(v.string()),
    identifiedNeed: v.optional(v.string()),
    proposedService: v.optional(v.string()),
    setupFee: v.optional(v.number()),
    monthlyFee: v.optional(v.number()),
    actualValue: v.optional(v.number()),
    interestLevel: v.optional(interestLevelValue),
    exchangeHistory: v.optional(v.array(v.string())),
    needsHumanAction: v.optional(v.boolean()),
    stage: v.optional(stageValue),
    tokenConsumption: v.optional(v.number()),
    scoreValidation: v.optional(scoreValidationValue),
    draftMessage: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    archived: v.optional(v.boolean()),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const db = ctx.db as any;
    const { projectId, updatedBy, ...patch } = args;
    const now = Date.now();
    const nextPatch = { ...patch } as Record<string, unknown>;
    if (patch.archived === true) {
      nextPatch.archivedAt = now;
    }
    if (patch.archived === false) {
      nextPatch.archivedAt = undefined;
    }
    const prospectionProjectId = db.normalizeId("prospectionProjects", projectId);
    const opportunityId = db.normalizeId("opportunities", projectId);

    if (prospectionProjectId) {
      await db.patch(prospectionProjectId, {
        ...nextPatch,
        updatedAt: now,
      });
    } else if (opportunityId) {
      await db.patch(opportunityId, {
        ...nextPatch,
        updatedAt: now,
      });
    } else {
      throw new Error(`Unknown projectId: ${projectId}`);
    }

    await db.insert("activities", {
      agentId: updatedBy,
      type: patch.stage === "human_handoff" ? "human_handoff_requested" : "project_updated",
      summary: `${updatedBy} updated project ${projectId}`,
    });

    return projectId;
  },
});

export const archiveProject = mutation({
  args: {
    projectId: v.string(),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const db = ctx.db as any;
    const now = Date.now();
    const prospectionProjectId = db.normalizeId("prospectionProjects", args.projectId);
    const opportunityId = db.normalizeId("opportunities", args.projectId);

    if (prospectionProjectId) {
      await db.patch(prospectionProjectId, {
        archived: true,
        archivedAt: now,
        updatedAt: now,
      });
    } else if (opportunityId) {
      await db.patch(opportunityId, {
        archived: true,
        archivedAt: now,
        updatedAt: now,
      });
    } else {
      throw new Error(`Unknown projectId: ${args.projectId}`);
    }

    await db.insert("activities", {
      agentId: args.updatedBy,
      type: "project_updated",
      summary: `${args.updatedBy} archived project ${args.projectId}`,
    });

    return args.projectId;
  },
});

export const deleteProject = mutation({
  args: {
    projectId: v.string(),
    deletedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const db = ctx.db as any;
    const prospectionProjectId = db.normalizeId("prospectionProjects", args.projectId);
    const opportunityId = db.normalizeId("opportunities", args.projectId);

    if (prospectionProjectId) {
      await db.delete(prospectionProjectId);
    } else if (opportunityId) {
      await db.delete(opportunityId);
    } else {
      throw new Error(`Unknown projectId: ${args.projectId}`);
    }

    await db.insert("activities", {
      agentId: args.deletedBy,
      type: "project_updated",
      summary: `${args.deletedBy} deleted project ${args.projectId}`,
    });

    return args.projectId;
  },
});

export const compactOpportunities = mutation({
  args: {
    updatedBy: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const db = ctx.db as any;
    const opportunities = await db.query("opportunities").order("desc").collect();
    const selected = opportunities.slice(0, args.limit ?? opportunities.length);
    const now = Date.now();

    for (const opportunity of selected) {
      const normalized = normalizeOpportunityAsProject(opportunity);
      await db.replace(opportunity._id, toCanonicalOpportunityDoc(normalized, now));
    }

    if (selected.length > 0) {
      await db.insert("activities", {
        agentId: args.updatedBy,
        type: "project_updated",
        summary: `${args.updatedBy} compacted ${selected.length} opportunities`,
      });
    }

    return { compacted: selected.length };
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

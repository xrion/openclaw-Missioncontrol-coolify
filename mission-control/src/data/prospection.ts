import type {
  DailyLimits,
  NewProspectionProjectInput,
  ProspectionProject,
  ProspectionSettings,
  ToolRequirement,
  ScoreValidation,
} from "../types/prospection";

export const DEMO_PROSPECTION_PROJECTS: ProspectionProject[] = [
  {
    id: "pp_001",
    company: "Horizon Clinic",
    source: "Outdated website",
    industry: "Medical",
    region: "Europe",
    identifiedNeed: "Website redesign + patient pre-qualification",
    proposedService: "Website redesign + AI chatbot",
    setupFee: 2400,
    monthlyFee: 180,
    interestLevel: "explicit",
    exchangeHistory: [
      "Initial outreach email sent",
      "Positive reply: interested in discussing",
    ],
    needsHumanAction: true,
    stage: "human_handoff",
    ownerAgentId: "jarvis",
    tokenConsumption: 2100,
    scoreValidation: "x1",
    draftMessage:
      "Thanks for your interest. I can share three slots for a scoping call.",
  },
  {
    id: "pp_002",
    company: "Atelier Mekanica",
    source: "SMB with no visible automation",
    industry: "Industrial",
    region: "Europe",
    identifiedNeed: "Manual quote/invoice workflow",
    proposedService: "Automation + ERP/CRM integration",
    setupFee: 3200,
    monthlyFee: 250,
    interestLevel: "medium",
    exchangeHistory: ["Quick audit completed", "First personalized message sent"],
    needsHumanAction: false,
    stage: "follow_up",
    ownerAgentId: "developer",
    tokenConsumption: 1600,
    scoreValidation: "pending",
    draftMessage:
      "Quick follow-up: we can save you 6 to 8 hours per week on quote-to-invoice operations.",
  },
  {
    id: "pp_003",
    company: "North Valley Services",
    source: "Reddit / explicit technical need",
    industry: "Services",
    region: "United States",
    identifiedNeed: "",
    proposedService: "Custom development",
    setupFee: 1500,
    monthlyFee: 0,
    interestLevel: "low",
    exchangeHistory: ["Need detected on forum", "Qualification message sent"],
    needsHumanAction: false,
    stage: "qualification",
    ownerAgentId: "jarvis",
    tokenConsumption: 1250,
    scoreValidation: "pending",
    draftMessage:
      "To scope this correctly, can you share your technical constraints and expected timeline?",
  },
  {
    id: "pp_004",
    company: "SaaS LedgerFlow",
    source: "Freelance platform",
    industry: "SaaS",
    region: "Europe",
    identifiedNeed: "Reduce churn with intelligent onboarding",
    proposedService: "AI integration + automations",
    setupFee: 2800,
    monthlyFee: 350,
    interestLevel: "high",
    exchangeHistory: ["Opportunity spotted on platform", "First contact accepted"],
    needsHumanAction: false,
    stage: "interest_detected",
    ownerAgentId: "developer",
    tokenConsumption: 1800,
    scoreValidation: "x2",
    draftMessage:
      "We can deploy an AI-assisted onboarding flow in two weeks, with KPI tracking from month one.",
  },
];

export const DEMO_TOOL_REQUIREMENTS: ToolRequirement[] = [
  { key: "email", label: "Email sending", status: "available" },
  { key: "web", label: "Web browsing", status: "available" },
  { key: "html", label: "HTML analysis", status: "available" },
  { key: "scraping", label: "Light scraping", status: "restricted" },
  { key: "freelance", label: "Freelance platform access", status: "unknown" },
  { key: "crm", label: "Internal CRM create/edit", status: "available" },
  { key: "multi", label: "Multi-agent management", status: "available" },
  { key: "tokens", label: "Token usage tracking", status: "available" },
  { key: "memory", label: "Structured project memory", status: "available" },
];

export const DEFAULT_DAILY_LIMITS: DailyLimits = {
  emails: 35,
  researches: 45,
  followUps: 20,
};

export const DEFAULT_PROSPECTION_SETTINGS: ProspectionSettings = {
  mode: "batch",
  dailyLimits: DEFAULT_DAILY_LIMITS,
  initialStrategy:
    "Prioritize Europe (medical, industrial, services), then expand to the United States with a recurring-revenue focus.",
  adaptationWindow: 12,
  launchValidated: false,
};

export const DEFAULT_NEW_PROJECT: NewProspectionProjectInput = {
  company: "",
  source: "",
  industry: "",
  region: "Europe",
  identifiedNeed: "",
  proposedService: "",
  setupFee: 0,
  monthlyFee: 0,
  ownerAgentId: "jarvis",
  createdBy: "human",
};

export function computeContractValue(setupFee: number, monthlyFee: number): number {
  return setupFee + monthlyFee * 15;
}

export function scoreLabel(score: ScoreValidation): string {
  if (score === "pending") return "Pending human validation";
  return `Validated (${score})`;
}

export function missingProjectFields(project: ProspectionProject): string[] {
  const missing: string[] = [];
  if (!project.source.trim()) missing.push("Source");
  if (!project.industry.trim()) missing.push("Industry");
  if (!project.identifiedNeed.trim()) missing.push("Identified need");
  if (!project.proposedService.trim()) missing.push("Proposed service");
  if (project.exchangeHistory.length === 0) missing.push("Exchange history");
  return missing;
}

export function mergeToolRequirements(
  dbTools: ToolRequirement[]
): ToolRequirement[] {
  if (dbTools.length === 0) return DEMO_TOOL_REQUIREMENTS;

  const byKey = new Map(dbTools.map((tool) => [tool.key, tool]));
  return DEMO_TOOL_REQUIREMENTS.map((defaultTool) => {
    const fromDb = byKey.get(defaultTool.key);
    return fromDb ? { ...defaultTool, ...fromDb } : defaultTool;
  });
}

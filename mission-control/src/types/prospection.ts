export type ProjectStage =
  | "exploration"
  | "qualification"
  | "first_contact"
  | "follow_up"
  | "interest_detected"
  | "crm_logged"
  | "human_handoff"
  | "performance_review"
  | "strategy_adjustment";

export type InterestLevel = "none" | "low" | "medium" | "high" | "explicit";

export type ScoreValidation = "pending" | "x1" | "x2" | "x8";

export type OperationMode = "batch" | "continuous";

export type ToolStatus = "available" | "restricted" | "missing" | "unknown";

export interface ProspectionProject {
  id: string;
  company: string;
  source: string;
  industry: string;
  region: "Europe" | "United States";
  identifiedNeed: string;
  proposedService: string;
  setupFee: number;
  monthlyFee: number;
  interestLevel: InterestLevel;
  exchangeHistory: string[];
  needsHumanAction: boolean;
  stage: ProjectStage;
  ownerAgentId: string;
  tokenConsumption: number;
  scoreValidation: ScoreValidation;
  draftMessage: string;
}

export interface ToolRequirement {
  key: string;
  label: string;
  status: ToolStatus;
}

export interface DailyLimits {
  emails: number;
  researches: number;
  followUps: number;
}

export interface ProspectionSettings {
  mode: OperationMode;
  dailyLimits: DailyLimits;
  initialStrategy: string;
  adaptationWindow: number;
  launchValidated: boolean;
}

export interface NewProspectionProjectInput {
  company: string;
  source: string;
  industry: string;
  region: "Europe" | "United States";
  identifiedNeed: string;
  proposedService: string;
  setupFee: number;
  monthlyFee: number;
  ownerAgentId: string;
  createdBy: string;
}

export interface UpdateProspectionProjectInput {
  source?: string;
  industry?: string;
  identifiedNeed?: string;
  proposedService?: string;
  setupFee?: number;
  monthlyFee?: number;
  interestLevel?: InterestLevel;
  exchangeHistory?: string[];
  needsHumanAction?: boolean;
  stage?: ProjectStage;
  tokenConsumption?: number;
  scoreValidation?: ScoreValidation;
  draftMessage?: string;
}

export const PROJECT_STAGES: { key: ProjectStage; label: string }[] = [
  { key: "exploration", label: "1. Exploration" },
  { key: "qualification", label: "2. Qualification" },
  { key: "first_contact", label: "3. First message" },
  { key: "follow_up", label: "4. Follow-up" },
  { key: "interest_detected", label: "5. Interest detected" },
  { key: "crm_logged", label: "6. CRM record" },
  { key: "human_handoff", label: "7. Human handoff" },
  { key: "performance_review", label: "8. Performance review" },
  { key: "strategy_adjustment", label: "9. Strategy adjustment" },
];

export const SCORE_POINTS: Record<ScoreValidation, number> = {
  pending: 0,
  x1: 1,
  x2: 2,
  x8: 8,
};

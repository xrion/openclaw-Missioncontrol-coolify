import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { MCDataContext } from "./demo-provider";
import type { MCData } from "./demo-provider";
import type { TaskStatus, TaskPriority } from "./types";
import type { Id } from "../convex/_generated/dataModel";
import type {
  NewProspectionProjectInput,
  ProspectionProject,
  ProspectionSettings,
  ToolStatus,
  UpdateProspectionProjectInput,
} from "./types/prospection";
import {
  DEFAULT_PROSPECTION_SETTINGS,
  mergeToolRequirements,
} from "./data/prospection";

/**
 * ConvexDataProvider — wraps Convex hooks into the unified MCData context.
 * Used when VITE_CONVEX_URL is set.
 */
export function ConvexDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const convexApi = api as any;

  const agents = useQuery(api.agents.list) ?? [];
  const tasksByStatus = useQuery(api.tasks.listByStatus) ?? {
    inbox: [],
    assigned: [],
    in_progress: [],
    review: [],
    done: [],
  };
  const counts = useQuery(api.tasks.countByStatus) ?? {
    queue: 0,
    total: 0,
  };
  const activities = useQuery(api.activities.listRecent, { limit: 50 }) ?? [];

  const prospectionProjectsRaw =
    useQuery(convexApi.prospection.listProjects, { limit: 100 }) ?? [];
  const prospectionToolsRaw = useQuery(convexApi.prospection.listTools) ?? [];
  const prospectionSettingsRaw =
    useQuery(convexApi.prospection.getLatestSettings) ?? null;

  const prospectionProjects: ProspectionProject[] = prospectionProjectsRaw.map(
    (project: any) => ({
      id: project._id,
      company: project.name,
      source: project.source,
      industry: project.industry,
      region: project.region,
      identifiedNeed: project.identifiedNeed,
      proposedService: project.proposedService,
      setupFee: project.setupFee,
      monthlyFee: project.monthlyFee,
      interestLevel: project.interestLevel,
      exchangeHistory: project.exchangeHistory ?? [],
      needsHumanAction: project.needsHumanAction,
      stage: project.stage,
      ownerAgentId: project.ownerAgentId,
      tokenConsumption: project.tokenConsumption,
      scoreValidation: project.scoreValidation,
      draftMessage: project.draftMessage,
    })
  );

  const prospectionTools = mergeToolRequirements(
    prospectionToolsRaw.map((tool: any) => ({
      key: tool.key,
      label: tool.label,
      status: tool.status,
    }))
  );

  const prospectionSettings: ProspectionSettings = prospectionSettingsRaw
    ? {
        mode: prospectionSettingsRaw.mode,
        dailyLimits: {
          emails: prospectionSettingsRaw.dailyLimitEmails,
          researches: prospectionSettingsRaw.dailyLimitResearches,
          followUps: prospectionSettingsRaw.dailyLimitFollowUps,
        },
        initialStrategy: prospectionSettingsRaw.initialStrategy,
        adaptationWindow: prospectionSettingsRaw.adaptationWindow,
        launchValidated: prospectionSettingsRaw.launchValidated,
      }
    : DEFAULT_PROSPECTION_SETTINGS;

  const createTaskMut = useMutation(api.tasks.create);
  const updateStatusMut = useMutation(api.tasks.updateStatus);
  const assignTaskMut = useMutation(api.tasks.assign);

  const createProspectionProjectMut = useMutation(convexApi.prospection.createProject);
  const updateProspectionProjectMut = useMutation(convexApi.prospection.updateProject);
  const upsertProspectionToolMut = useMutation(convexApi.prospection.upsertTool);
  const upsertProspectionSettingsMut = useMutation(convexApi.prospection.upsertSettings);

  const createTask = (args: {
    title: string;
    description: string;
    priority: TaskPriority;
    createdBy: string;
    tags?: string[];
  }) => {
    return createTaskMut(args);
  };

  const moveTask = (taskId: Id<"tasks">, status: TaskStatus) => {
    return updateStatusMut({ taskId, status, agentId: "human" });
  };

  const assignTask = (taskId: Id<"tasks">, agentId: string) => {
    return assignTaskMut({ taskId, assignedTo: agentId, agentId: "human" });
  };

  const createProspectionProject = (args: NewProspectionProjectInput) => {
    return createProspectionProjectMut({
      name: args.company,
      source: args.source,
      industry: args.industry,
      region: args.region,
      identifiedNeed: args.identifiedNeed,
      proposedService: args.proposedService,
      setupFee: args.setupFee,
      monthlyFee: args.monthlyFee,
      interestLevel: "none",
      exchangeHistory: [],
      needsHumanAction: false,
      stage: "exploration",
      ownerAgentId: args.ownerAgentId,
      tokenConsumption: 0,
      scoreValidation: "pending",
      draftMessage: "",
      createdBy: args.createdBy,
    });
  };

  const updateProspectionProject = (
    projectId: string,
    patch: UpdateProspectionProjectInput
  ) => {
    return updateProspectionProjectMut({
      projectId,
      ...patch,
      updatedBy: "human",
    });
  };

  const upsertProspectionTool = (args: {
    key: string;
    label: string;
    status: ToolStatus;
    updatedBy: string;
  }) => {
    return upsertProspectionToolMut(args);
  };

  const updateProspectionSettings = (args: {
    settings: ProspectionSettings;
    updatedBy: string;
  }) => {
    return upsertProspectionSettingsMut({
      mode: args.settings.mode,
      dailyLimitEmails: args.settings.dailyLimits.emails,
      dailyLimitResearches: args.settings.dailyLimits.researches,
      dailyLimitFollowUps: args.settings.dailyLimits.followUps,
      initialStrategy: args.settings.initialStrategy,
      adaptationWindow: args.settings.adaptationWindow,
      launchValidated: args.settings.launchValidated,
      updatedBy: args.updatedBy,
    });
  };

  const value: MCData = {
    agents,
    tasksByStatus,
    counts,
    activities,
    prospectionProjects,
    prospectionTools,
    prospectionSettings,
    createTask,
    moveTask,
    assignTask,
    createProspectionProject,
    updateProspectionProject,
    upsertProspectionTool,
    updateProspectionSettings,
    isDemoMode: false,
  };

  return (
    <MCDataContext.Provider value={value}>{children}</MCDataContext.Provider>
  );
}

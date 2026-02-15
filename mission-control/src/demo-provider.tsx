import React, { createContext, useContext, useState, useCallback } from "react";
import type {
  Agent,
  Task,
  Activity,
  TaskStatus,
  TaskPriority,
  AgentStatus,
  ActivityType,
} from "./types";
import type {
  NewProspectionProjectInput,
  ProspectionProject,
  ProspectionSettings,
  ToolRequirement,
  UpdateProspectionProjectInput,
  ToolStatus,
} from "./types/prospection";
import {
  DEMO_PROSPECTION_PROJECTS,
  DEMO_TOOL_REQUIREMENTS,
  DEFAULT_PROSPECTION_SETTINGS,
} from "./data/prospection";

// --- Demo ID generator ---
let _idCounter = 100;
function demoId(table: string): string {
  return `demo_${table}_${++_idCounter}`;
}

// --- Demo Data ---
const DEMO_AGENTS: Agent[] = [
  {
    _id: demoId("agents") as any,
    _creationTime: Date.now() - 86400000,
    agentId: "jarvis",
    name: "Jarvis",
    role: "coordinator",
    status: "online" as AgentStatus,
    lastHeartbeat: Date.now() - 60000,
    heartbeatInterval: 900000,
    description:
      "Mission coordinator. Triages incoming tasks, delegates to specialists, and ensures delivery.",
    avatar: "🎯",
  },
  {
    _id: demoId("agents") as any,
    _creationTime: Date.now() - 86400000,
    agentId: "developer",
    name: "Developer",
    role: "developer",
    status: "working" as AgentStatus,
    lastHeartbeat: Date.now() - 120000,
    heartbeatInterval: 900000,
    description:
      "Code specialist. Implements features, fixes bugs, writes tests, and reviews pull requests.",
    avatar: "💻",
  },
];

const DEMO_TASKS: Task[] = [
  {
    _id: demoId("tasks") as any,
    _creationTime: Date.now() - 3600000,
    title: "Set up CI/CD pipeline",
    description:
      "Configure GitHub Actions for automated testing and deployment to staging.",
    status: "inbox" as TaskStatus,
    priority: "high" as TaskPriority,
    createdBy: "human",
    tags: ["devops", "infrastructure"],
  },
  {
    _id: demoId("tasks") as any,
    _creationTime: Date.now() - 7200000,
    title: "Add user authentication",
    description:
      "Implement JWT-based auth with login/register flows and session management.",
    status: "assigned" as TaskStatus,
    priority: "critical" as TaskPriority,
    assignedTo: "developer",
    createdBy: "jarvis",
    tags: ["auth", "backend"],
  },
  {
    _id: demoId("tasks") as any,
    _creationTime: Date.now() - 10800000,
    title: "Design landing page",
    description: "Create responsive landing page with hero section and CTA.",
    status: "in_progress" as TaskStatus,
    priority: "medium" as TaskPriority,
    assignedTo: "developer",
    createdBy: "human",
    tags: ["frontend", "design"],
  },
  {
    _id: demoId("tasks") as any,
    _creationTime: Date.now() - 14400000,
    title: "API rate limiting",
    description: "Add rate limiting middleware to prevent abuse.",
    status: "review" as TaskStatus,
    priority: "medium" as TaskPriority,
    assignedTo: "developer",
    createdBy: "jarvis",
    tags: ["backend", "security"],
  },
  {
    _id: demoId("tasks") as any,
    _creationTime: Date.now() - 86400000,
    title: "Database schema migration",
    description: "Migrate from v1 to v2 schema with zero downtime.",
    status: "done" as TaskStatus,
    priority: "high" as TaskPriority,
    assignedTo: "developer",
    createdBy: "jarvis",
    tags: ["database"],
    completedAt: Date.now() - 43200000,
    result: "Migration completed successfully. All tests passing.",
  },
];

const DEMO_ACTIVITIES: Activity[] = [
  {
    _id: demoId("activities") as any,
    _creationTime: Date.now() - 60000,
    agentId: "jarvis",
    type: "heartbeat" as ActivityType,
    summary: "Jarvis heartbeat — all systems nominal",
  },
  {
    _id: demoId("activities") as any,
    _creationTime: Date.now() - 300000,
    agentId: "developer",
    type: "task_moved" as ActivityType,
    summary: 'Developer moved "API rate limiting" to review',
  },
  {
    _id: demoId("activities") as any,
    _creationTime: Date.now() - 600000,
    agentId: "jarvis",
    type: "task_assigned" as ActivityType,
    summary: 'Jarvis assigned "Add user authentication" to Developer',
  },
  {
    _id: demoId("activities") as any,
    _creationTime: Date.now() - 900000,
    agentId: "developer",
    type: "comment_added" as ActivityType,
    summary: 'Developer commented on "Design landing page"',
  },
  {
    _id: demoId("activities") as any,
    _creationTime: Date.now() - 1800000,
    agentId: "jarvis",
    type: "decision_made" as ActivityType,
    summary: "Jarvis decided to prioritize auth before landing page",
  },
  {
    _id: demoId("activities") as any,
    _creationTime: Date.now() - 3600000,
    agentId: "developer",
    type: "task_completed" as ActivityType,
    summary: 'Developer completed "Database schema migration"',
  },
  {
    _id: demoId("activities") as any,
    _creationTime: Date.now() - 7200000,
    agentId: "jarvis",
    type: "task_created" as ActivityType,
    summary: 'Jarvis created task "Set up CI/CD pipeline"',
  },
];

// --- Unified Data Context ---
// Both Demo and Convex providers populate this same context shape

export interface MCData {
  agents: Agent[];
  tasksByStatus: Record<TaskStatus, Task[]>;
  counts: { queue: number; total: number };
  activities: Activity[];
  prospectionProjects: ProspectionProject[];
  prospectionTools: ToolRequirement[];
  prospectionSettings: ProspectionSettings;
  createTask: (args: {
    title: string;
    description: string;
    priority: TaskPriority;
    createdBy: string;
    tags?: string[];
  }) => unknown | Promise<unknown>;
  moveTask: (taskId: any, status: TaskStatus) => unknown | Promise<unknown>;
  assignTask: (taskId: any, agentId: string) => unknown | Promise<unknown>;
  createProspectionProject: (
    args: NewProspectionProjectInput
  ) => unknown | Promise<unknown>;
  updateProspectionProject: (
    projectId: string,
    patch: UpdateProspectionProjectInput
  ) => unknown | Promise<unknown>;
  upsertProspectionTool: (args: {
    key: string;
    label: string;
    status: ToolStatus;
    updatedBy: string;
  }) => unknown | Promise<unknown>;
  updateProspectionSettings: (args: {
    settings: ProspectionSettings;
    updatedBy: string;
  }) => unknown | Promise<unknown>;
  isDemoMode: boolean;
}

const MCDataContext = createContext<MCData | null>(null);

export function useMCData(): MCData {
  const ctx = useContext(MCDataContext);
  if (!ctx) {
    throw new Error("useMCData must be used within DemoProvider or ConvexDataProvider");
  }
  return ctx;
}

// --- Demo Provider ---

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({
    agents: DEMO_AGENTS,
    tasks: DEMO_TASKS,
    activities: DEMO_ACTIVITIES,
    prospectionProjects: DEMO_PROSPECTION_PROJECTS,
    prospectionTools: DEMO_TOOL_REQUIREMENTS,
    prospectionSettings: DEFAULT_PROSPECTION_SETTINGS,
  });

  const tasksByStatus = state.tasks.reduce(
    (acc, task) => {
      if (!acc[task.status]) acc[task.status] = [];
      acc[task.status].push(task);
      return acc;
    },
    {
      inbox: [],
      assigned: [],
      in_progress: [],
      review: [],
      done: [],
    } as Record<TaskStatus, Task[]>
  );

  const queueCount =
    (tasksByStatus.inbox?.length ?? 0) +
    (tasksByStatus.assigned?.length ?? 0);

  const createTask = useCallback(
    (args: {
      title: string;
      description: string;
      priority: TaskPriority;
      createdBy: string;
      tags?: string[];
    }) => {
      const newTask: Task = {
        _id: demoId("tasks") as any,
        _creationTime: Date.now(),
        title: args.title,
        description: args.description,
        status: "inbox",
        priority: args.priority,
        createdBy: args.createdBy,
        tags: args.tags,
      };
      setState((prev) => ({
        ...prev,
        tasks: [newTask, ...prev.tasks],
        activities: [
          {
            _id: demoId("activities") as any,
            _creationTime: Date.now(),
            agentId: "human",
            type: "task_created" as ActivityType,
            summary: `New task created: "${args.title}"`,
          },
          ...prev.activities,
        ],
      }));
    },
    []
  );

  const moveTask = useCallback((taskId: any, status: TaskStatus) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t._id === taskId
          ? { ...t, status, ...(status === "done" ? { completedAt: Date.now() } : {}) }
          : t
      ),
    }));
  }, []);

  const assignTask = useCallback((taskId: any, agentId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t._id === taskId
          ? { ...t, assignedTo: agentId, status: "assigned" as TaskStatus }
          : t
      ),
    }));
  }, []);

  const createProspectionProject = useCallback((args: NewProspectionProjectInput) => {
    const newProject: ProspectionProject = {
      id: demoId("prospectionProjects"),
      company: args.company,
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
    };

    setState((prev) => ({
      ...prev,
      prospectionProjects: [newProject, ...prev.prospectionProjects],
    }));
  }, []);

  const updateProspectionProject = useCallback(
    (projectId: string, patch: UpdateProspectionProjectInput) => {
      setState((prev) => ({
        ...prev,
        prospectionProjects: prev.prospectionProjects.map((project) =>
          project.id === projectId ? { ...project, ...patch } : project
        ),
      }));
    },
    []
  );

  const upsertProspectionTool = useCallback(
    (args: { key: string; label: string; status: ToolStatus; updatedBy: string }) => {
      void args.updatedBy;
      setState((prev) => {
        const existing = prev.prospectionTools.find((tool) => tool.key === args.key);
        if (existing) {
          return {
            ...prev,
            prospectionTools: prev.prospectionTools.map((tool) =>
              tool.key === args.key
                ? { ...tool, label: args.label, status: args.status }
                : tool
            ),
          };
        }

        return {
          ...prev,
          prospectionTools: [
            ...prev.prospectionTools,
            { key: args.key, label: args.label, status: args.status },
          ],
        };
      });
    },
    []
  );

  const updateProspectionSettings = useCallback(
    (args: { settings: ProspectionSettings; updatedBy: string }) => {
      void args.updatedBy;
      setState((prev) => ({
        ...prev,
        prospectionSettings: args.settings,
      }));
    },
    []
  );

  const value: MCData = {
    agents: state.agents,
    tasksByStatus,
    counts: { queue: queueCount, total: state.tasks.length },
    activities: state.activities,
    prospectionProjects: state.prospectionProjects,
    prospectionTools: state.prospectionTools,
    prospectionSettings: state.prospectionSettings,
    createTask,
    moveTask,
    assignTask,
    createProspectionProject,
    updateProspectionProject,
    upsertProspectionTool,
    updateProspectionSettings,
    isDemoMode: true,
  };

  return (
    <MCDataContext.Provider value={value}>{children}</MCDataContext.Provider>
  );
}

// Re-export context for ConvexDataProvider to use
export { MCDataContext };

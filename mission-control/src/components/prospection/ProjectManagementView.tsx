import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_NEW_PROJECT,
  computeContractValue,
  missingProjectFields,
  scoreLabel,
} from "../../data/prospection";
import type {
  ProjectStage,
  ProspectionProject,
  ScoreValidation,
  ToolStatus,
  ProspectionSettings,
} from "../../types/prospection";
import { PROJECT_STAGES, SCORE_POINTS } from "../../types/prospection";
import { useProspection } from "../../hooks/useProspection";
import { useAgents } from "../../hooks/useAgents";

interface ProjectManagementViewProps {
  agentFilter: string | null;
}

type ProjectTab = "mission" | "pipeline" | "crm" | "activation";

const TAB_LIST: { key: ProjectTab; label: string }[] = [
  { key: "mission", label: "Mission" },
  { key: "pipeline", label: "Pipeline" },
  { key: "crm", label: "CRM" },
  { key: "activation", label: "Activation" },
];

const SERVICE_CATALOG = [
  "Website creation / redesign",
  "Process automation",
  "Tool integration (CRM, ERP, email)",
  "Custom development",
  "Chatbot implementation",
  "Artificial intelligence integration",
  "Custom SaaS solutions",
  "Recurring-revenue systems (setup + maintenance)",
];

const INDUSTRY_PLAYBOOK: Record<string, { angle: string; focus: string }> = {
  Medical: {
    angle: "Improve patient journeys, modernize brand image, and speed up first-contact conversion.",
    focus: "Website redesign + pre-qualification chatbot + intake automation.",
  },
  Industrial: {
    angle: "Remove administrative bottlenecks and improve operational reliability.",
    focus: "Quote/invoice automation + ERP/CRM integration + reporting.",
  },
  Services: {
    angle: "Turn inbound requests into qualified opportunities faster.",
    focus: "CRM automation + email sequences + operations dashboard.",
  },
  SaaS: {
    angle: "Reduce churn and accelerate product activation.",
    focus: "AI onboarding workflows + behavioral triggers + assisted support.",
  },
};

const TOOL_STATUS_OPTIONS: ToolStatus[] = [
  "available",
  "restricted",
  "missing",
  "unknown",
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProjectManagementView({
  agentFilter,
}: ProjectManagementViewProps) {
  const {
    projects,
    tools,
    settings,
    createProject,
    updateProject,
    upsertTool,
    saveSettings,
  } = useProspection();
  const { agents } = useAgents();

  const [activeTab, setActiveTab] = useState<ProjectTab>("mission");
  const [settingsDraft, setSettingsDraft] =
    useState<ProspectionSettings>(settings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [industryFocus, setIndustryFocus] = useState("Medical");
  const [historyDrafts, setHistoryDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setSettingsDraft(settings);
  }, [settings]);

  const filteredProjects = useMemo(() => {
    if (!agentFilter) return projects;
    return projects.filter((project) => project.ownerAgentId === agentFilter);
  }, [projects, agentFilter]);

  const totalTokens = useMemo(
    () => filteredProjects.reduce((sum, project) => sum + project.tokenConsumption, 0),
    [filteredProjects]
  );

  const validatedScore = useMemo(
    () =>
      filteredProjects.reduce(
        (sum, project) => sum + SCORE_POINTS[project.scoreValidation],
        0
      ),
    [filteredProjects]
  );

  const scorePerToken = totalTokens === 0 ? 0 : validatedScore / totalTokens;

  const explicitInterests = filteredProjects.filter(
    (project) => project.interestLevel === "explicit"
  ).length;

  const humanHandoffs = filteredProjects.filter(
    (project) => project.needsHumanAction
  ).length;

  const allToolsAvailable = tools.every((tool) => tool.status === "available");
  const prerequisitesMet =
    allToolsAvailable &&
    settingsDraft.initialStrategy.trim().length > 20 &&
    settingsDraft.dailyLimits.emails > 0 &&
    settingsDraft.dailyLimits.researches > 0;

  const persistProjectPatch = (
    projectId: string,
    patch: Partial<ProspectionProject>
  ) => {
    void updateProject(projectId, patch);
  };

  const updateProjectStage = (projectId: string, stage: ProjectStage) => {
    persistProjectPatch(projectId, { stage });
  };

  const updateProjectScore = (projectId: string, score: ScoreValidation) => {
    persistProjectPatch(projectId, { scoreValidation: score });
  };

  const updateToolStatus = (toolKey: string, status: ToolStatus) => {
    const tool = tools.find((item) => item.key === toolKey);
    if (!tool) return;
    void upsertTool({
      key: tool.key,
      label: tool.label,
      status,
      updatedBy: "human",
    });
  };

  const addHistoryItem = (projectId: string) => {
    const draft = historyDrafts[projectId]?.trim();
    if (!draft) return;

    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    persistProjectPatch(projectId, {
      exchangeHistory: [...project.exchangeHistory, draft],
    });
    setHistoryDrafts((current) => ({ ...current, [projectId]: "" }));
  };

  const createProjectQuick = async () => {
    const ownerAgentId = agentFilter ?? agents[0]?.agentId ?? "jarvis";
    const suffix = `${filteredProjects.length + 1}`.padStart(2, "0");
    await createProject({
      ...DEFAULT_NEW_PROJECT,
      company: `New lead ${suffix}`,
      source: "To qualify",
      industry: "Services",
      ownerAgentId,
      createdBy: "human",
    });
  };

  const persistSettings = async (launchValidated?: boolean) => {
    setIsSavingSettings(true);
    const nextSettings: ProspectionSettings =
      launchValidated === undefined
        ? settingsDraft
        : { ...settingsDraft, launchValidated };
    setSettingsDraft(nextSettings);

    try {
      await saveSettings({
        settings: nextSettings,
        updatedBy: "human",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const stageCount = (stage: ProjectStage): number =>
    filteredProjects.filter((project) => project.stage === stage).length;

  const responseRate =
    filteredProjects.length === 0
      ? 0
      : (filteredProjects.filter((project) => project.exchangeHistory.length >= 2).length /
          filteredProjects.length) *
        100;

  const interestRate =
    filteredProjects.length === 0
      ? 0
      : (filteredProjects.filter((project) => project.interestLevel !== "none").length /
          filteredProjects.length) *
        100;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-4 space-y-4">
      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Autonomous sales project management
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Objective: identify opportunities, run outreach, pre-qualify leads, populate CRM, and hand off once explicit interest is detected.
            </p>
            <button
              onClick={() => void createProjectQuick()}
              className="mt-2 px-2.5 py-1.5 text-xs font-medium rounded-md bg-surface-100 text-gray-700 hover:bg-surface-200"
            >
              + New CRM project
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-[280px]">
            <div className="rounded-lg bg-blue-50 px-3 py-2 border border-blue-100">
              <p className="text-[10px] uppercase text-blue-700 font-semibold">Opportunities</p>
              <p className="text-sm font-semibold text-blue-900">{filteredProjects.length}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2 border border-emerald-100">
              <p className="text-[10px] uppercase text-emerald-700 font-semibold">Explicit interest</p>
              <p className="text-sm font-semibold text-emerald-900">{explicitInterests}</p>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-2 border border-amber-100">
              <p className="text-[10px] uppercase text-amber-700 font-semibold">Human handoff</p>
              <p className="text-sm font-semibold text-amber-900">{humanHandoffs}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 border border-slate-200">
              <p className="text-[10px] uppercase text-slate-700 font-semibold">Score/Tokens</p>
              <p className="text-sm font-semibold text-slate-900">{scorePerToken.toFixed(4)}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid md:grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
            The agent does not close deals and does not schedule meetings.
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
            Human validation is mandatory for scoring (x1, x2, x8).
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-2">
        <div className="flex flex-wrap gap-2">
          {TAB_LIST.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === tab.key
                  ? "bg-accent text-white"
                  : "bg-surface-100 text-gray-600 hover:bg-surface-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "mission" && (
        <section className="grid xl:grid-cols-2 gap-4">
          <article className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Core mission</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Identify profitable business opportunities.</li>
              <li>Run first contact (email, platforms, forums).</li>
              <li>Pre-qualify leads before human takeover.</li>
              <li>Populate and maintain the internal CRM.</li>
              <li>Optimize strategy based on outcomes.</li>
            </ul>
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
              Priority zones: Europe first, then United States. Sub-agent specialization is supported.
            </div>
          </article>

          <article className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Services to promote</h3>
            <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-600">
              {SERVICE_CATALOG.map((service) => (
                <span
                  key={service}
                  className="px-2.5 py-1.5 bg-surface-50 border border-gray-100 rounded-md"
                >
                  {service}
                </span>
              ))}
            </div>
            <div className="pt-2 border-t border-gray-100">
              <label className="text-xs font-medium text-gray-500">Industry-specific adaptation</label>
              <select
                value={industryFocus}
                onChange={(event) => setIndustryFocus(event.target.value)}
                className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1"
              >
                {Object.keys(INDUSTRY_PLAYBOOK).map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-2">
                <span className="font-medium">Angle:</span> {INDUSTRY_PLAYBOOK[industryFocus].angle}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                <span className="font-medium">Focus:</span> {INDUSTRY_PLAYBOOK[industryFocus].focus}
              </p>
            </div>
          </article>

          <article className="bg-white border border-gray-200 rounded-xl p-4 xl:col-span-2">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Global workflow</h3>
            <div className="grid md:grid-cols-3 gap-2 text-xs text-gray-600">
              {PROJECT_STAGES.map((stage) => (
                <div key={stage.key} className="rounded-md border border-gray-100 bg-surface-50 px-3 py-2">
                  <div className="font-medium text-gray-700">{stage.label}</div>
                  <div className="text-[11px] text-gray-500 mt-1">{stageCount(stage.key)} project(s)</div>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {activeTab === "pipeline" && (
        <section className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Prospecting pipeline</h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {PROJECT_STAGES.map((stage) => {
              const stageProjects = filteredProjects.filter(
                (project) => project.stage === stage.key
              );
              return (
                <div
                  key={stage.key}
                  className="min-w-[260px] max-w-[260px] rounded-lg bg-surface-50 border border-gray-200"
                >
                  <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-700">{stage.label}</p>
                    <span className="text-xs rounded-full bg-white border border-gray-200 px-2 py-0.5 text-gray-500">
                      {stageProjects.length}
                    </span>
                  </div>
                  <div className="p-2 space-y-2 max-h-[440px] overflow-y-auto scrollbar-thin">
                    {stageProjects.map((project) => {
                      const missing = missingProjectFields(project);
                      return (
                        <article
                          key={project.id}
                          className="bg-white border border-gray-200 rounded-md p-2.5 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium text-gray-800">{project.company}</h4>
                            <span className="text-[10px] text-gray-500 bg-surface-100 rounded px-1.5 py-0.5">
                              {project.ownerAgentId}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {project.industry} • {project.region}
                          </div>
                          <div className="text-xs text-gray-700">
                            Potential value: {formatCurrency(computeContractValue(project.setupFee, project.monthlyFee))}
                          </div>
                          <select
                            value={project.stage}
                            onChange={(event) =>
                              updateProjectStage(project.id, event.target.value as ProjectStage)
                            }
                            className="w-full text-xs border border-gray-200 rounded-md px-2 py-1"
                          >
                            {PROJECT_STAGES.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {missing.length > 0 && (
                            <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded px-2 py-1">
                              Missing data: {missing.join(", ")}
                            </div>
                          )}
                        </article>
                      );
                    })}
                    {stageProjects.length === 0 && (
                      <div className="text-xs text-gray-400 text-center py-6">No projects</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "crm" && (
        <section className="space-y-3">
          {filteredProjects.length === 0 && (
            <article className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-600">
                No CRM projects for the current filter.
              </p>
              <button
                onClick={() => void createProjectQuick()}
                className="mt-3 px-3 py-1.5 text-sm rounded-md bg-surface-100 text-gray-700 hover:bg-surface-200"
              >
                Create first project
              </button>
            </article>
          )}
          {filteredProjects.map((project) => {
            const missing = missingProjectFields(project);
            const contractValue = computeContractValue(project.setupFee, project.monthlyFee);

            return (
              <article key={project.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">{project.company}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Source: {project.source || "To fill"} • Industry: {project.industry || "To fill"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Potential value</p>
                    <p className="text-sm font-semibold text-gray-800">{formatCurrency(contractValue)}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Identified need</label>
                    <textarea
                      value={project.identifiedNeed}
                      onChange={(event) =>
                        persistProjectPatch(project.id, { identifiedNeed: event.target.value })
                      }
                      rows={2}
                      className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Proposed service</label>
                    <textarea
                      value={project.proposedService}
                      onChange={(event) =>
                        persistProjectPatch(project.id, { proposedService: event.target.value })
                      }
                      rows={2}
                      className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1 resize-none"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Setup</label>
                    <input
                      type="number"
                      min={0}
                      value={project.setupFee}
                      onChange={(event) =>
                        persistProjectPatch(project.id, { setupFee: Number(event.target.value) || 0 })
                      }
                      className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Monthly</label>
                    <input
                      type="number"
                      min={0}
                      value={project.monthlyFee}
                      onChange={(event) =>
                        persistProjectPatch(project.id, { monthlyFee: Number(event.target.value) || 0 })
                      }
                      className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Interest level</label>
                    <select
                      value={project.interestLevel}
                      onChange={(event) =>
                        persistProjectPatch(project.id, { interestLevel: event.target.value as ProspectionProject["interestLevel"] })
                      }
                      className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1"
                    >
                      <option value="none">none</option>
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                      <option value="explicit">explicit</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Score (human)</label>
                    <select
                      value={project.scoreValidation}
                      onChange={(event) =>
                        updateProjectScore(project.id, event.target.value as ScoreValidation)
                      }
                      className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1"
                    >
                      <option value="pending">pending</option>
                      <option value="x1">x1</option>
                      <option value="x2">x2</option>
                      <option value="x8">x8</option>
                    </select>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Exchange history</label>
                    <ul className="mt-1 space-y-1 text-xs text-gray-600">
                      {project.exchangeHistory.map((entry, idx) => (
                        <li key={`${project.id}_hist_${idx}`} className="bg-surface-50 border border-gray-100 rounded px-2 py-1">
                          {entry}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={historyDrafts[project.id] ?? ""}
                        onChange={(event) =>
                          setHistoryDrafts((current) => ({
                            ...current,
                            [project.id]: event.target.value,
                          }))
                        }
                        placeholder="New exchange..."
                        className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1"
                      />
                      <button
                        onClick={() => addHistoryItem(project.id)}
                        className="px-2 py-1 text-xs rounded-md bg-surface-100 hover:bg-surface-200 text-gray-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Prepared draft</label>
                    <textarea
                      value={project.draftMessage}
                      onChange={(event) =>
                        persistProjectPatch(project.id, { draftMessage: event.target.value })
                      }
                      rows={4}
                      className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1 resize-none"
                    />
                    <label className="inline-flex items-center gap-2 mt-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={project.needsHumanAction}
                        onChange={(event) =>
                          persistProjectPatch(project.id, {
                            needsHumanAction: event.target.checked,
                            stage: event.target.checked ? "human_handoff" : project.stage,
                          })
                        }
                      />
                      Human action required
                    </label>
                    <p className="text-[11px] text-gray-500 mt-2">{scoreLabel(project.scoreValidation)}</p>
                  </div>
                </div>

                {missing.length > 0 && (
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    Missing information detected. Please provide explicitly: {missing.join(", ")}.
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {activeTab === "activation" && (
        <section className="grid xl:grid-cols-2 gap-4">
          <article className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Required tools validation</h3>
            <div className="space-y-2">
              {tools.map((tool) => (
                <div key={tool.key} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-700">{tool.label}</span>
                  <select
                    value={tool.status}
                    onChange={(event) =>
                      updateToolStatus(tool.key, event.target.value as ToolStatus)
                    }
                    className="text-xs border border-gray-200 rounded-md px-2 py-1"
                  >
                    {TOOL_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </article>

          <article className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Initial phase</h3>
            <div>
              <label className="text-xs font-medium text-gray-500">Initial strategy</label>
              <textarea
                value={settingsDraft.initialStrategy}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    initialStrategy: event.target.value,
                  }))
                }
                rows={4}
                className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1 resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Emails/day</label>
                <input
                  type="number"
                  min={0}
                  value={settingsDraft.dailyLimits.emails}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      dailyLimits: {
                        ...current.dailyLimits,
                        emails: Number(event.target.value) || 0,
                      },
                    }))
                  }
                  className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Researches/day</label>
                <input
                  type="number"
                  min={0}
                  value={settingsDraft.dailyLimits.researches}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      dailyLimits: {
                        ...current.dailyLimits,
                        researches: Number(event.target.value) || 0,
                      },
                    }))
                  }
                  className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Follow-ups/day</label>
                <input
                  type="number"
                  min={0}
                  value={settingsDraft.dailyLimits.followUps}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      dailyLimits: {
                        ...current.dailyLimits,
                        followUps: Number(event.target.value) || 0,
                      },
                    }))
                  }
                  className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Execution mode</label>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() =>
                    setSettingsDraft((current) => ({ ...current, mode: "batch" }))
                  }
                  className={`px-3 py-1.5 rounded-md text-xs ${
                    settingsDraft.mode === "batch"
                      ? "bg-accent text-white"
                      : "bg-surface-100 text-gray-700"
                  }`}
                >
                  Batch
                </button>
                <button
                  onClick={() =>
                    setSettingsDraft((current) => ({
                      ...current,
                      mode: "continuous",
                    }))
                  }
                  className={`px-3 py-1.5 rounded-md text-xs ${
                    settingsDraft.mode === "continuous"
                      ? "bg-accent text-white"
                      : "bg-surface-100 text-gray-700"
                  }`}
                >
                  Continuous
                </button>
              </div>
            </div>
          </article>

          <article className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Scoring & profitability</h3>
            <p className="text-xs text-gray-600">Only humans validate score: meeting booked x1, contract &lt;= 1000 EUR x2, around 3000 EUR x8.</p>
            <p className="text-xs text-gray-600">
              Contract value formula: <span className="font-medium">fixed setup + (monthly x 15)</span>.
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="border border-gray-200 rounded-md px-2 py-1">
                <div className="text-gray-500">Validated score</div>
                <div className="font-semibold text-gray-800">{validatedScore}</div>
              </div>
              <div className="border border-gray-200 rounded-md px-2 py-1">
                <div className="text-gray-500">Tokens</div>
                <div className="font-semibold text-gray-800">{totalTokens}</div>
              </div>
              <div className="border border-gray-200 rounded-md px-2 py-1">
                <div className="text-gray-500">Score/Tokens</div>
                <div className="font-semibold text-gray-800">{scorePerToken.toFixed(4)}</div>
              </div>
            </div>
            {scorePerToken < 0.001 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1">
                Low ratio: prioritize recurring contracts and reduce expensive research paths.
              </p>
            )}
          </article>

          <article className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Auto-improvement</h3>
            <p className="text-xs text-gray-600">
              Continuous analysis of response/interest rates + wording, targeting, and timing optimization.
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="border border-gray-200 rounded-md px-2 py-1">
                <div className="text-gray-500">Response rate</div>
                <div className="font-semibold text-gray-800">{responseRate.toFixed(1)}%</div>
              </div>
              <div className="border border-gray-200 rounded-md px-2 py-1">
                <div className="text-gray-500">Interest rate</div>
                <div className="font-semibold text-gray-800">{interestRate.toFixed(1)}%</div>
              </div>
              <div className="border border-gray-200 rounded-md px-2 py-1">
                <div className="text-gray-500">Adaptation window</div>
                <input
                  type="number"
                  min={1}
                  value={settingsDraft.adaptationWindow}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      adaptationWindow: Number(event.target.value) || 1,
                    }))
                  }
                  className="w-full text-xs border border-gray-200 rounded px-1 py-0.5 mt-1"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => prerequisitesMet && void persistSettings(true)}
                disabled={!prerequisitesMet || isSavingSettings}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-accent text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSavingSettings ? "Saving..." : "Validate launch"}
              </button>
              <button
                onClick={() => void persistSettings()}
                disabled={isSavingSettings}
                className="ml-2 px-3 py-1.5 rounded-md text-sm font-medium bg-surface-100 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save configuration
              </button>
              <p className="text-[11px] text-gray-500 mt-2">
                Preconditions: tools available, strategy defined, daily limits set, mode selected.
              </p>
              {settingsDraft.launchValidated && (
                <p className="text-xs text-emerald-700 mt-2 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1">
                  Launch validated. The agent can start with safety guardrails enabled.
                </p>
              )}
            </div>
          </article>
        </section>
      )}
    </div>
  );
}

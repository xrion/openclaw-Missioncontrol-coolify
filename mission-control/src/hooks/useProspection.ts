import { useMCData } from "../demo-provider";
import type {
  NewProspectionProjectInput,
  ProspectionSettings,
  ToolStatus,
  UpdateProspectionProjectInput,
} from "../types/prospection";

export function useProspection() {
  const {
    prospectionProjects,
    prospectionTools,
    prospectionSettings,
    createProspectionProject,
    updateProspectionProject,
    upsertProspectionTool,
    updateProspectionSettings,
  } = useMCData();

  return {
    projects: prospectionProjects,
    tools: prospectionTools,
    settings: prospectionSettings,
    createProject: (args: NewProspectionProjectInput) =>
      createProspectionProject(args),
    updateProject: (projectId: string, patch: UpdateProspectionProjectInput) =>
      updateProspectionProject(projectId, patch),
    upsertTool: (args: {
      key: string;
      label: string;
      status: ToolStatus;
      updatedBy: string;
    }) => upsertProspectionTool(args),
    saveSettings: (args: { settings: ProspectionSettings; updatedBy: string }) =>
      updateProspectionSettings(args),
  };
}

import { useState } from "react";
import MainLayout from "./components/layout/MainLayout";
import TopBar from "./components/layout/TopBar";
import LeftSidebar from "./components/layout/LeftSidebar";
import RightSidebar from "./components/layout/RightSidebar";
import KanbanBoard from "./components/kanban/KanbanBoard";
import ProjectManagementView from "./components/prospection/ProjectManagementView";
import ServerFilesView from "./components/files/ServerFilesView";

export type DashboardView =
  | "operations"
  | "project_management"
  | "files";

export default function App() {
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<DashboardView>("operations");

  return (
    <MainLayout
      topBar={
        <TopBar
          activeView={activeView}
          onViewChange={setActiveView}
        />
      }
      leftSidebar={<LeftSidebar />}
      center={
        activeView === "operations" ? (
          <KanbanBoard agentFilter={agentFilter} />
        ) : activeView === "project_management" ? (
          <ProjectManagementView agentFilter={agentFilter} />
        ) : (
          <ServerFilesView />
        )
      }
      rightSidebar={
        <RightSidebar
          agentFilter={agentFilter}
          onAgentFilterChange={setAgentFilter}
        />
      }
    />
  );
}

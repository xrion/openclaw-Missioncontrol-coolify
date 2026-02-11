import { useState } from "react";
import MainLayout from "./components/layout/MainLayout";
import TopBar from "./components/layout/TopBar";
import LeftSidebar from "./components/layout/LeftSidebar";
import RightSidebar from "./components/layout/RightSidebar";
import KanbanBoard from "./components/kanban/KanbanBoard";
import AgentChat from "./components/chat/AgentChat";
import FileBrowser from "./components/files/FileBrowser";

export type AppView = "kanban" | "chat" | "files";

export default function App() {
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppView>("kanban");

  const showSidebars = currentView === "kanban";

  return (
    <MainLayout
      topBar={<TopBar currentView={currentView} onViewChange={setCurrentView} />}
      leftSidebar={showSidebars ? <LeftSidebar /> : null}
      center={
        currentView === "kanban" ? (
          <KanbanBoard agentFilter={agentFilter} />
        ) : currentView === "chat" ? (
          <AgentChat />
        ) : (
          <FileBrowser />
        )
      }
      rightSidebar={
        showSidebars ? (
          <RightSidebar
            agentFilter={agentFilter}
            onAgentFilterChange={setAgentFilter}
          />
        ) : null
      }
    />
  );
}

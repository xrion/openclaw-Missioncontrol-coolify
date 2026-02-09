import { useState } from "react";
import MainLayout from "./components/layout/MainLayout";
import TopBar from "./components/layout/TopBar";
import LeftSidebar from "./components/layout/LeftSidebar";
import RightSidebar from "./components/layout/RightSidebar";
import KanbanBoard from "./components/kanban/KanbanBoard";
import TelegramChat from "./components/telegram/TelegramChat";

export type AppView = "kanban" | "telegram";

export default function App() {
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppView>("kanban");

  return (
    <MainLayout
      topBar={<TopBar currentView={currentView} onViewChange={setCurrentView} />}
      leftSidebar={currentView === "kanban" ? <LeftSidebar /> : null}
      center={
        currentView === "kanban" ? (
          <KanbanBoard agentFilter={agentFilter} />
        ) : (
          <TelegramChat />
        )
      }
      rightSidebar={
        currentView === "kanban" ? (
          <RightSidebar
            agentFilter={agentFilter}
            onAgentFilterChange={setAgentFilter}
          />
        ) : null
      }
    />
  );
}

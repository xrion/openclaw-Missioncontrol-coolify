import { useAgents } from "../../hooks/useAgents";
import { useTasks } from "../../hooks/useTasks";
import { useConfig } from "../../hooks/useConfig";
import type { AppView } from "../../App";

interface TopBarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

const NAV_ITEMS: { key: AppView; label: string; mobileLabel: string; icon: JSX.Element }[] = [
  {
    key: "kanban",
    label: "Board",
    mobileLabel: "Board",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    key: "chat",
    label: "Chat",
    mobileLabel: "Chat",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    key: "files",
    label: "Files",
    mobileLabel: "Files",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
];

export default function TopBar({ currentView, onViewChange }: TopBarProps) {
  const { activeCount } = useAgents();
  const { counts } = useTasks();
  const { config, gatewayLink } = useConfig();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6">
      {/* Left: Status badges */}
      <div className="hidden sm:flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
          <span className="w-2 h-2 rounded-full bg-status-online" />
          <span className="hidden lg:inline">Active Agents:</span> {activeCount}
        </span>
      </div>

      {/* Center: Title + Nav */}
      <div className="flex items-center gap-2 sm:gap-4">
        <h1 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight">
          <span className="hidden sm:inline">Mission Control</span>
          <span className="sm:hidden">MC</span>
        </h1>
        {config && (
          <span className="hidden lg:inline text-xs text-gray-400 font-mono">
            {config.model}
          </span>
        )}

        {/* Nav tabs */}
        <nav className="flex items-center bg-gray-100 rounded-lg p-0.5 ml-1 sm:ml-3">
          {NAV_ITEMS.map(({ key, label, mobileLabel, icon }) => (
            <button
              key={key}
              onClick={() => onViewChange(key)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                currentView === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{mobileLabel}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Right: Queue + Gateway */}
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <span className="hidden lg:inline">Tasks in Queue:</span>
          <span className="lg:hidden">Q:</span>
          {counts?.queue ?? 0}
        </span>

        {gatewayLink && (
          <a
            href={gatewayLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="hidden lg:inline">Open Gateway</span>
            <span className="lg:hidden">Gateway</span>
          </a>
        )}
      </div>
    </header>
  );
}

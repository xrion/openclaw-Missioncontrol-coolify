import { useAgents } from "../../hooks/useAgents";
import AgentCard from "../agents/AgentCard";
import AgentDetail from "../agents/AgentDetail";
import type { Agent } from "../../types";
import { useState } from "react";

export default function LeftSidebar() {
  const { agents } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  return (
    <aside className="w-full h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Agents
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
        {agents.map((agent) => (
          <AgentCard
            key={agent._id}
            agent={agent}
            selected={selectedAgent?._id === agent._id}
            onClick={() =>
              setSelectedAgent(
                selectedAgent?._id === agent._id ? null : agent
              )
            }
          />
        ))}
        {agents.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No agents registered
          </p>
        )}
      </div>

      {selectedAgent && (
        <div className="border-t border-gray-200">
          <AgentDetail
            agent={selectedAgent}
            onClose={() => setSelectedAgent(null)}
          />
        </div>
      )}
    </aside>
  );
}

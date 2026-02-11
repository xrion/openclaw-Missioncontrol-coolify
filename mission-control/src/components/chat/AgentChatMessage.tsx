import type { ChatMessage } from "../../hooks/useAgentChat";

interface AgentChatMessageProps {
  message: ChatMessage;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DateSeparator({ timestamp }: { timestamp: number }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400 font-medium">
        {formatDate(timestamp)}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

export default function AgentChatMessage({ message }: AgentChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-1 group`}
    >
      <div
        className={`max-w-[75%] sm:max-w-[65%] ${
          isUser
            ? "bg-blue-500 text-white rounded-2xl rounded-br-md"
            : "bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-bl-md"
        } px-3 py-2 shadow-sm`}
      >
        <p
          className={`text-sm whitespace-pre-wrap break-words ${
            isUser ? "text-white" : "text-gray-800"
          }`}
        >
          {message.content}
          {message.streaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-current opacity-60 animate-pulse rounded-sm" />
          )}
        </p>
        <p
          className={`text-[10px] mt-0.5 text-right ${
            isUser ? "text-blue-200" : "text-gray-400"
          }`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

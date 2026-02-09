import type { ChatThread } from "../../hooks/useTelegramBot";

interface ChatListProps {
  threads: ChatThread[];
  activeChatId: number | null;
  onSelectChat: (chatId: number) => void;
}

function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return "";
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function ChatList({ threads, activeChatId, onSelectChat }: ChatListProps) {
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">No conversations yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Messages from Telegram will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {threads.map((thread) => (
        <button
          key={thread.chatId}
          onClick={() => onSelectChat(thread.chatId)}
          className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-b border-gray-50 ${
            activeChatId === thread.chatId
              ? "bg-blue-50"
              : "hover:bg-gray-50"
          }`}
        >
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold ${
            activeChatId === thread.chatId ? "bg-blue-500" : "bg-gray-400"
          }`}>
            {thread.title.charAt(0).toUpperCase()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 truncate">
                {thread.title}
              </span>
              <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                {formatRelativeTime(thread.lastMessageDate)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-xs text-gray-500 truncate">
                {thread.lastMessage}
              </p>
              {thread.unreadCount > 0 && (
                <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-medium flex items-center justify-center">
                  {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

import type { TelegramMessage, BotInfo } from "../../hooks/useTelegramBot";

interface ChatMessageProps {
  message: TelegramMessage;
  botInfo: BotInfo;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

export function DateSeparator({ timestamp }: { timestamp: number }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400 font-medium">{formatDate(timestamp)}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

export default function ChatMessage({ message, botInfo }: ChatMessageProps) {
  const isBot = message.from?.id === botInfo.id;
  const senderName = message.from
    ? [message.from.first_name, message.from.last_name].filter(Boolean).join(" ")
    : "Unknown";

  const content = message.text
    ?? (message.sticker?.emoji ? `Sticker: ${message.sticker.emoji}` : null)
    ?? (message.photo ? "[Photo]" : null)
    ?? (message.document ? `[File: ${message.document.file_name ?? "document"}]` : null)
    ?? "[Unsupported message]";

  return (
    <div className={`flex ${isBot ? "justify-end" : "justify-start"} mb-1 group`}>
      <div
        className={`max-w-[75%] sm:max-w-[65%] ${
          isBot
            ? "bg-blue-500 text-white rounded-2xl rounded-br-md"
            : "bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-bl-md"
        } px-3 py-2 shadow-sm`}
      >
        {!isBot && (
          <p className={`text-xs font-medium mb-0.5 ${isBot ? "text-blue-100" : "text-blue-500"}`}>
            {senderName}
            {message.from?.username && (
              <span className={`ml-1 font-normal ${isBot ? "text-blue-200" : "text-gray-400"}`}>
                @{message.from.username}
              </span>
            )}
          </p>
        )}
        <p className={`text-sm whitespace-pre-wrap break-words ${isBot ? "text-white" : "text-gray-800"}`}>
          {content}
        </p>
        <p className={`text-[10px] mt-0.5 text-right ${isBot ? "text-blue-200" : "text-gray-400"}`}>
          {formatTime(message.date)}
        </p>
      </div>
    </div>
  );
}

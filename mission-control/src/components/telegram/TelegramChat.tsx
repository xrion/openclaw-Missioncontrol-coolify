import { useState, useRef, useEffect } from "react";
import { useTelegramBot } from "../../hooks/useTelegramBot";
import TelegramSetup from "./TelegramSetup";
import ChatList from "./ChatList";
import ChatMessage, { DateSeparator } from "./ChatMessage";

export default function TelegramChat() {
  const bot = useTelegramBot();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bot.activeMessages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !bot.activeChatId) return;

    setSending(true);
    setInput("");
    try {
      await bot.sendMessage(bot.activeChatId, text);
    } catch (err: any) {
      console.error("[TelegramChat] Send failed:", err.message);
      setInput(text); // Restore input on failure
    } finally {
      setSending(false);
    }
  }

  // Not connected: show setup
  if (!bot.connected) {
    return (
      <div className="h-full bg-surface-50">
        <TelegramSetup
          token={bot.token}
          onTokenChange={bot.setToken}
          onConnect={bot.connect}
          onDisconnect={bot.disconnect}
          connecting={bot.connecting}
          connected={bot.connected}
          botInfo={bot.botInfo}
          error={bot.error}
        />
      </div>
    );
  }

  // Connected but no chat selected on mobile, or show chat list on desktop
  const activeThread = bot.chatThreads.find((t) => t.chatId === bot.activeChatId);

  // Group messages by date
  const groupedMessages: Array<{ type: "date"; timestamp: number } | { type: "message"; message: typeof bot.activeMessages[0] }> = [];
  let lastDate = "";
  for (const msg of bot.activeMessages) {
    const d = new Date(msg.date * 1000).toDateString();
    if (d !== lastDate) {
      groupedMessages.push({ type: "date", timestamp: msg.date });
      lastDate = d;
    }
    groupedMessages.push({ type: "message", message: msg });
  }

  return (
    <div className="h-full flex bg-surface-50">
      {/* Chat List Panel */}
      <div
        className={`${
          showChatList ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-[300px] lg:w-[340px] bg-white border-r border-gray-200 flex-shrink-0`}
      >
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-900">
              Telegram
            </h2>
            {bot.botInfo && (
              <span className="text-xs text-gray-400">
                @{bot.botInfo.username}
              </span>
            )}
          </div>
          <button
            onClick={bot.disconnect}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-100 transition-colors"
            title="Disconnect bot"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        <ChatList
          threads={bot.chatThreads}
          activeChatId={bot.activeChatId}
          onSelectChat={(id) => {
            bot.selectChat(id);
            setShowChatList(false);
          }}
        />
      </div>

      {/* Chat Panel */}
      <div
        className={`${
          !showChatList ? "flex" : "hidden"
        } md:flex flex-col flex-1 min-w-0`}
      >
        {bot.activeChatId && activeThread ? (
          <>
            {/* Chat Header */}
            <div className="h-14 px-4 flex items-center gap-3 bg-white border-b border-gray-200">
              <button
                onClick={() => setShowChatList(true)}
                className="md:hidden p-1.5 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                {activeThread.title.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activeThread.title}
                </p>
                {activeThread.username && (
                  <p className="text-xs text-gray-400">@{activeThread.username}</p>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 bg-surface-50">
              {groupedMessages.map((item, i) =>
                item.type === "date" ? (
                  <DateSeparator key={`date-${i}`} timestamp={item.timestamp} />
                ) : (
                  <ChatMessage
                    key={item.message.message_id}
                    message={item.message}
                    botInfo={bot.botInfo!}
                  />
                )
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleSend}
              className="px-4 py-3 bg-white border-t border-gray-200 flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32"
                style={{
                  height: "auto",
                  minHeight: "40px",
                  maxHeight: "128px",
                }}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="p-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </>
        ) : (
          /* No chat selected */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-1">
              Telegram Chat
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {bot.chatThreads.length > 0
                ? "Select a conversation from the list to start chatting."
                : "Waiting for incoming messages. Send a message to your bot on Telegram to begin."}
            </p>
            {bot.botInfo && (
              <p className="text-xs text-gray-400 mt-3">
                Bot: @{bot.botInfo.username}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

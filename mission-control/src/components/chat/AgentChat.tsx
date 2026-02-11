import { useState, useRef, useEffect } from "react";
import { useAgentChat } from "../../hooks/useAgentChat";
import AgentChatMessage, { DateSeparator } from "./AgentChatMessage";

export default function AgentChat() {
  const chat = useAgentChat();
  const [input, setInput] = useState("");
  const [showAgentList, setShowAgentList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || chat.sending) return;

    setInput("");
    await chat.sendMessage(text);
  }

  // Group messages by date
  const groupedMessages: Array<
    | { type: "date"; timestamp: number }
    | { type: "message"; message: (typeof chat.messages)[0] }
  > = [];
  let lastDate = "";
  for (const msg of chat.messages) {
    const d = new Date(msg.timestamp).toDateString();
    if (d !== lastDate) {
      groupedMessages.push({ type: "date", timestamp: msg.timestamp });
      lastDate = d;
    }
    groupedMessages.push({ type: "message", message: msg });
  }

  return (
    <div className="h-full flex bg-surface-50">
      {/* Agent List Panel */}
      <div
        className={`${
          showAgentList ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-[240px] lg:w-[280px] bg-white border-r border-gray-200 flex-shrink-0`}
      >
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h2 className="text-sm font-semibold text-gray-900">Agents</h2>
          </div>
        </div>

        {/* Agent list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {chat.agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <p className="text-sm text-gray-500">No agents available</p>
              <p className="text-xs text-gray-400 mt-1">
                Agents will appear once the gateway is configured.
              </p>
            </div>
          ) : (
            chat.agents.map((agentId) => (
              <button
                key={agentId}
                onClick={() => {
                  chat.selectAgent(agentId);
                  setShowAgentList(false);
                }}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-gray-50 ${
                  chat.activeAgent === agentId
                    ? "bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold ${
                    chat.activeAgent === agentId ? "bg-blue-500" : "bg-gray-400"
                  }`}
                >
                  {agentId.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {agentId}
                  </span>
                  <p className="text-xs text-gray-400">
                    {(chat.messages ?? []).length > 0 &&
                    chat.activeAgent === agentId
                      ? `${chat.messages.length} messages`
                      : "Start a conversation"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div
        className={`${
          !showAgentList ? "flex" : "hidden"
        } md:flex flex-col flex-1 min-w-0`}
      >
        {chat.activeAgent ? (
          <>
            {/* Chat Header */}
            <div className="h-14 px-4 flex items-center gap-3 bg-white border-b border-gray-200">
              <button
                onClick={() => setShowAgentList(true)}
                className="md:hidden p-1.5 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                {chat.activeAgent.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {chat.activeAgent}
                </p>
                <p className="text-xs text-gray-400">
                  {chat.sending ? "Thinking..." : "Online"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {chat.sending && (
                  <button
                    onClick={chat.stopStreaming}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-100 transition-colors"
                    title="Stop response"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                      />
                    </svg>
                  </button>
                )}
                <button
                  onClick={chat.clearHistory}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                  title="Clear history"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Error banner */}
            {chat.error && (
              <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                <p className="text-sm text-red-600">{chat.error}</p>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 bg-surface-50">
              {chat.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-1 capitalize">
                    Chat with {chat.activeAgent}
                  </h3>
                  <p className="text-sm text-gray-500 max-w-xs">
                    Send a message to start a conversation with this agent.
                  </p>
                </div>
              ) : (
                <>
                  {groupedMessages.map((item, i) =>
                    item.type === "date" ? (
                      <DateSeparator key={`date-${i}`} timestamp={item.timestamp} />
                    ) : (
                      <AgentChatMessage
                        key={item.message.id}
                        message={item.message}
                      />
                    )
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
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
                placeholder={`Message ${chat.activeAgent}...`}
                rows={1}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32"
                style={{
                  height: "auto",
                  minHeight: "40px",
                  maxHeight: "128px",
                }}
                disabled={chat.sending}
              />
              <button
                type="submit"
                disabled={chat.sending || !input.trim()}
                className="p-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </form>
          </>
        ) : (
          /* No agent selected */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-1">
              Agent Chat
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Select an agent from the list to start chatting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

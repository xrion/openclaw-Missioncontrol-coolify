import { useState } from "react";
import type { BotInfo } from "../../hooks/useTelegramBot";

interface TelegramSetupProps {
  token: string;
  onTokenChange: (token: string) => void;
  onConnect: (token?: string) => Promise<boolean>;
  onDisconnect: () => void;
  connecting: boolean;
  connected: boolean;
  botInfo: BotInfo | null;
  error: string | null;
}

export default function TelegramSetup({
  token,
  onTokenChange,
  onConnect,
  onDisconnect,
  connecting,
  connected,
  botInfo,
  error,
}: TelegramSetupProps) {
  const [inputToken, setInputToken] = useState(token);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputToken.trim();
    if (!trimmed) return;
    onTokenChange(trimmed);
    await onConnect(trimmed);
  }

  if (connected && botInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Connected
          </h3>
          <p className="text-sm text-gray-500 mb-1">
            @{botInfo.username}
          </p>
          <p className="text-xs text-gray-400 mb-6">
            {botInfo.first_name} (ID: {botInfo.id})
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Send a message to your bot on Telegram to start a conversation.
          </p>
          <button
            onClick={onDisconnect}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Telegram Bot
          </h3>
          <p className="text-sm text-gray-500">
            Connect your Telegram bot to chat with users directly from Mission Control.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="bot-token"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Bot Token
            </label>
            <input
              id="bot-token"
              type="password"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-gray-400">
              Get your token from @BotFather on Telegram
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={connecting || !inputToken.trim()}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {connecting ? "Connecting..." : "Connect Bot"}
          </button>
        </form>
      </div>
    </div>
  );
}

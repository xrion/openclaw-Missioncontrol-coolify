import { useState, useEffect, useCallback, useRef } from "react";

// --- Telegram Bot API types ---

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  sticker?: { emoji?: string };
  photo?: Array<{ file_id: string }>;
  document?: { file_name?: string };
  reply_to_message?: TelegramMessage;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

export interface ChatThread {
  chatId: number;
  title: string;
  type: TelegramChat["type"];
  username?: string;
  lastMessage?: string;
  lastMessageDate?: number;
  unreadCount: number;
}

export interface BotInfo {
  id: number;
  first_name: string;
  username: string;
}

// --- Token storage ---

const TOKEN_KEY = "mc_telegram_bot_token";

export function getSavedToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function saveToken(token: string) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// --- API helper ---

async function tgApi<T>(token: string, method: string, body?: Record<string, unknown>): Promise<T> {
  const url = `/api/telegram/bot${token}/${method}`;
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram API: ${data.description ?? "Unknown error"}`);
  }
  return data.result as T;
}

// --- Main hook ---

export function useTelegramBot() {
  const [token, setTokenState] = useState(getSavedToken);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Messages indexed by chatId
  const [messagesByChat, setMessagesByChat] = useState<Record<number, TelegramMessage[]>>({});
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);

  const offsetRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef(token);
  const connectedRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  // Connect: validate token + get bot info
  const connect = useCallback(async (newToken?: string) => {
    const t = newToken ?? token;
    if (!t) {
      setError("Token is required");
      return false;
    }

    setConnecting(true);
    setError(null);

    try {
      const info = await tgApi<BotInfo>(t, "getMe");
      setBotInfo(info);
      setConnected(true);
      setTokenState(t);
      saveToken(t);
      tokenRef.current = t;
      connectedRef.current = true;
      return true;
    } catch (err: any) {
      setError(err.message);
      setConnected(false);
      connectedRef.current = false;
      return false;
    } finally {
      setConnecting(false);
    }
  }, [token]);

  // Disconnect
  const disconnect = useCallback(() => {
    setConnected(false);
    connectedRef.current = false;
    setBotInfo(null);
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Process incoming updates
  const processUpdates = useCallback((updates: TelegramUpdate[]) => {
    if (updates.length === 0) return;

    // Track the highest offset
    const maxOffset = Math.max(...updates.map((u) => u.update_id));
    offsetRef.current = maxOffset + 1;

    const newMessages: TelegramMessage[] = [];
    for (const update of updates) {
      const msg = update.message ?? update.edited_message;
      if (msg) {
        newMessages.push(msg);
      }
    }

    if (newMessages.length === 0) return;

    setMessagesByChat((prev) => {
      const next = { ...prev };
      for (const msg of newMessages) {
        const chatId = msg.chat.id;
        const existing = next[chatId] ?? [];
        // Avoid duplicates
        if (!existing.some((m) => m.message_id === msg.message_id)) {
          next[chatId] = [...existing, msg].sort((a, b) => a.date - b.date);
        }
      }
      return next;
    });

    // Update chat threads
    setChatThreads((prev) => {
      const threadMap = new Map(prev.map((t) => [t.chatId, t]));

      for (const msg of newMessages) {
        const chat = msg.chat;
        const existing = threadMap.get(chat.id);
        const title =
          chat.title ??
          [chat.first_name, chat.last_name].filter(Boolean).join(" ") ??
          `Chat ${chat.id}`;

        threadMap.set(chat.id, {
          chatId: chat.id,
          title,
          type: chat.type,
          username: chat.username,
          lastMessage: msg.text ?? (msg.sticker ? msg.sticker.emoji : "[media]"),
          lastMessageDate: msg.date,
          unreadCount: (existing?.unreadCount ?? 0) + 1,
        });
      }

      return Array.from(threadMap.values()).sort(
        (a, b) => (b.lastMessageDate ?? 0) - (a.lastMessageDate ?? 0)
      );
    });
  }, []);

  // Poll for updates
  const poll = useCallback(async () => {
    if (!connectedRef.current || !tokenRef.current) return;

    try {
      const updates = await tgApi<TelegramUpdate[]>(tokenRef.current, "getUpdates", {
        offset: offsetRef.current,
        timeout: 10,
        allowed_updates: ["message", "edited_message"],
      });
      processUpdates(updates);
    } catch (err: any) {
      // Don't disconnect on transient errors, but log
      console.warn("[TelegramBot] Poll error:", err.message);
    }

    // Schedule next poll
    if (connectedRef.current) {
      pollingRef.current = setTimeout(poll, 1000);
    }
  }, [processUpdates]);

  // Start/stop polling when connected
  useEffect(() => {
    if (connected) {
      poll();
    }
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [connected, poll]);

  // Send a message
  const sendMessage = useCallback(
    async (chatId: number, text: string, replyToMessageId?: number) => {
      if (!token) throw new Error("Not connected");

      const result = await tgApi<TelegramMessage>(token, "sendMessage", {
        chat_id: chatId,
        text,
        ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
      });

      // Add sent message to local state
      setMessagesByChat((prev) => {
        const existing = prev[chatId] ?? [];
        if (!existing.some((m) => m.message_id === result.message_id)) {
          return {
            ...prev,
            [chatId]: [...existing, result].sort((a, b) => a.date - b.date),
          };
        }
        return prev;
      });

      return result;
    },
    [token]
  );

  // Mark chat as read
  const markRead = useCallback((chatId: number) => {
    setChatThreads((prev) =>
      prev.map((t) => (t.chatId === chatId ? { ...t, unreadCount: 0 } : t))
    );
  }, []);

  // Select a chat
  const selectChat = useCallback(
    (chatId: number | null) => {
      setActiveChatId(chatId);
      if (chatId !== null) {
        markRead(chatId);
      }
    },
    [markRead]
  );

  // Auto-connect on mount if token exists
  useEffect(() => {
    if (token && !connected && !connecting) {
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeMessages = activeChatId ? messagesByChat[activeChatId] ?? [] : [];
  const totalUnread = chatThreads.reduce((sum, t) => sum + t.unreadCount, 0);

  return {
    // State
    token,
    botInfo,
    connected,
    connecting,
    error,
    chatThreads,
    activeChatId,
    activeMessages,
    totalUnread,

    // Actions
    connect,
    disconnect,
    setToken: (t: string) => {
      setTokenState(t);
      saveToken(t);
    },
    sendMessage,
    selectChat,
    markRead,
  };
}

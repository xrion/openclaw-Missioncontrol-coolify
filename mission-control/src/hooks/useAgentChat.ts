import { useState, useEffect, useCallback, useRef } from "react";
import { useConfig } from "./useConfig";

// --- Types ---

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  agentId: string;
  streaming?: boolean;
}

// --- Main hook ---

export function useAgentChat() {
  const { config } = useConfig();

  const agents = config?.agents ?? [];
  const token = config?.gatewayToken ?? "";
  const gatewayUrl = config?.gatewayUrl ?? "";

  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [messagesByAgent, setMessagesByAgent] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-select first agent (prefer "jarvis")
  useEffect(() => {
    if (!activeAgent && agents.length > 0) {
      const jarvis = agents.find((a) => a === "jarvis");
      setActiveAgent(jarvis ?? agents[0]);
    }
  }, [agents, activeAgent]);

  const messages = activeAgent ? messagesByAgent[activeAgent] ?? [] : [];

  // Build conversation history for context (last N messages)
  function buildApiMessages(agentId: string, newUserMessage: string) {
    const history = messagesByAgent[agentId] ?? [];
    const contextMessages = history.slice(-20).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    contextMessages.push({ role: "user", content: newUserMessage });
    return contextMessages;
  }

  const sendMessage = useCallback(
    async (text: string) => {
      if (!activeAgent || !token || !gatewayUrl || sending) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
        agentId: activeAgent,
      };

      // Add user message immediately
      setMessagesByAgent((prev) => ({
        ...prev,
        [activeAgent]: [...(prev[activeAgent] ?? []), userMsg],
      }));

      setSending(true);
      setError(null);

      // Create placeholder for assistant response
      const assistantId = `assistant-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        agentId: activeAgent,
        streaming: true,
      };

      setMessagesByAgent((prev) => ({
        ...prev,
        [activeAgent]: [...(prev[activeAgent] ?? []), assistantMsg],
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const apiMessages = buildApiMessages(activeAgent, text);

        // Use token in query param to avoid custom headers that trigger CORS preflight
        const url = new URL(`${gatewayUrl}/v1/chat/completions`);
        url.searchParams.set("token", token);

        const res = await fetch(url.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: `openclaw:${activeAgent}`,
            stream: true,
            messages: apiMessages,
            user: `mc-chat-${activeAgent}`,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(
            `Gateway error ${res.status}: ${errText.slice(0, 200)}`
          );
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;
            if (trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;

            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                // Update streaming message
                setMessagesByAgent((prev) => {
                  const agentMsgs = prev[activeAgent] ?? [];
                  return {
                    ...prev,
                    [activeAgent]: agentMsgs.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: fullContent }
                        : m
                    ),
                  };
                });
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }

        // Mark streaming as complete
        setMessagesByAgent((prev) => {
          const agentMsgs = prev[activeAgent] ?? [];
          return {
            ...prev,
            [activeAgent]: agentMsgs.map((m) =>
              m.id === assistantId
                ? { ...m, content: fullContent || "(empty response)", streaming: false }
                : m
            ),
          };
        });
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setError(err.message);
        // Remove failed assistant message
        setMessagesByAgent((prev) => {
          const agentMsgs = prev[activeAgent] ?? [];
          return {
            ...prev,
            [activeAgent]: agentMsgs.filter((m) => m.id !== assistantId),
          };
        });
      } finally {
        setSending(false);
        abortRef.current = null;
      }
    },
    [activeAgent, token, gatewayUrl, sending, messagesByAgent]
  );

  const clearHistory = useCallback(() => {
    if (activeAgent) {
      setMessagesByAgent((prev) => ({ ...prev, [activeAgent]: [] }));
    }
  }, [activeAgent]);

  const selectAgent = useCallback((agentId: string) => {
    setActiveAgent(agentId);
    setError(null);
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    agents,
    activeAgent,
    messages,
    sending,
    error,
    sendMessage,
    selectAgent,
    clearHistory,
    stopStreaming,
  };
}

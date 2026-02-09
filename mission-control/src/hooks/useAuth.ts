import { useState, useEffect, useCallback } from "react";

const AUTH_KEY = "mc_auth_session";

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [passwordHash, setPasswordHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load config and check existing session
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const config = await res.json();
          const hash = config.dashboardPasswordHash;
          if (hash) {
            setPasswordHash(hash);
            // Check existing session
            const saved = sessionStorage.getItem(AUTH_KEY);
            if (saved === hash) {
              setAuthenticated(true);
            }
          } else {
            // No password configured — allow access
            setAuthenticated(true);
          }
        } else {
          // Config not available (demo mode) — allow access
          setAuthenticated(true);
        }
      } catch {
        // Offline / demo mode — allow access
        setAuthenticated(true);
      } finally {
        setChecking(false);
      }
    }
    init();
  }, []);

  const login = useCallback(
    async (password: string): Promise<boolean> => {
      setError(null);
      if (!passwordHash) {
        setAuthenticated(true);
        return true;
      }

      const hash = await sha256(password);
      if (hash === passwordHash) {
        sessionStorage.setItem(AUTH_KEY, hash);
        setAuthenticated(true);
        return true;
      }

      setError("Invalid password");
      return false;
    },
    [passwordHash]
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthenticated(false);
  }, []);

  return { authenticated, checking, error, login, logout };
}

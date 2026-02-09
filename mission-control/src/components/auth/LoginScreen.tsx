import { useState } from "react";

interface LoginScreenProps {
  onLogin: (password: string) => Promise<boolean>;
  error: string | null;
}

export default function LoginScreen({ onLogin, error }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onLogin(password);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Mission Control
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter your password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="mc-password" className="sr-only">
              Password
            </label>
            <input
              id="mc-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              autoComplete="current-password"
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !password.trim()}
            className="w-full px-4 py-3 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Verifying..." : "Sign In"}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Password is shown in container logs at startup
        </p>
      </div>
    </div>
  );
}

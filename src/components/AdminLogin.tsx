import React, { useState } from "react";
import { getSupabase } from "../supabase";

export interface AdminLoginProps {
  /**
   * Callback executed upon successful authentication with the authenticated user object.
   */
  onLoginSuccess?: (user: any) => void;
  /**
   * Target URL to navigate to if onLoginSuccess is not provided. Defaults to '/admin/dashboard'.
   */
  redirectTo?: string;
  /**
   * Optional custom class for outer wrapper.
   */
  className?: string;
  /**
   * Optional flag to render card without the min-h-screen bg-slate-50 wrapper (e.g. inside a modal).
   */
  isEmbedded?: boolean;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  redirectTo = "/admin/dashboard",
  className = "",
  isEmbedded = false
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      // Authenticate directly against Supabase Auth via window.dbClient.auth.signInWithPassword({ email, password })
      const client = (typeof window !== "undefined" && window.dbClient)
        ? window.dbClient
        : getSupabase();

      if (!client?.auth) {
        throw new Error("Supabase Auth client is not initialized.");
      }

      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {
        // Handle invalid credentials gracefully with a clean inline error alert container
        if (error.message?.toLowerCase().includes("invalid login credentials")) {
          setErrorMessage("Invalid login credentials. Please check your email and password.");
        } else if (error.message?.toLowerCase().includes("email not confirmed")) {
          setErrorMessage("Email address has not been confirmed yet.");
        } else {
          setErrorMessage(error.message || "Authentication failed. Please try again.");
        }
        return;
      }

      // Upon successful session creation, execute onLoginSuccess(data.user) or redirect directly to /admin/dashboard
      if (data && data.user) {
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        } else if (typeof window !== "undefined") {
          window.location.href = redirectTo;
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  const cardContent = (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 sm:p-10 transition-all">
      {/* Header: Only the brand title "Shurefire" in bold #ae2424. No secondary headers, titles, or subtitles */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#ae2424] select-none">
          Shurefire
        </h1>
      </div>

      {/* Inline Error Alert Container */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-red-700 text-xs sm:text-sm font-medium flex items-start gap-2.5 transition-all"
        >
          <svg
            className="w-4 h-4 text-[#ae2424] shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="flex-1 leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* Form Controls: Exactly two inputs (Email & Password) styled with requested classes */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="admin-email" className="sr-only">
            Email
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isLoading}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="Email"
            className="w-full px-4 py-3 text-sm text-slate-900 bg-white placeholder-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:border-[#ae2424] focus:ring-4 focus:ring-[#ae2424]/10 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="sr-only">
            Password
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isLoading}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="Password"
            className="w-full px-4 py-3 text-sm text-slate-900 bg-white placeholder-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:border-[#ae2424] focus:ring-4 focus:ring-[#ae2424]/10 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        {/* Submit CTA: Full-width button with #ae2424 background and loading spinner state */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#ae2424] hover:bg-[#961f1f] active:bg-[#7e1919] text-white font-semibold text-sm transition-all flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Authenticating...</span>
              </div>
            ) : (
              "Sign In"
            )}
          </button>
        </div>
      </form>
    </div>
  );

  if (isEmbedded) {
    return <div className={`w-full flex items-center justify-center ${className}`}>{cardContent}</div>;
  }

  return (
    <div className={`min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6 ${className}`}>
      {cardContent}
    </div>
  );
};

export default AdminLogin;

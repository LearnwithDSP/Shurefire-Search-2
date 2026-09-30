import React, { useState } from "react";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

export interface AdminLoginProps {
  /**
   * Callback executed upon successful authentication with the authenticated user object.
   */
  onLoginSuccess?: (user: { id: string; email: string; fullName: string; role: string }) => void;
  /**
   * Target URL to navigate to if onLoginSuccess is not provided. Defaults to '/admin/dashboard'.
   */
  redirectTo?: string;
  /**
   * Optional custom class for outer wrapper.
   */
  className?: string;
  /**
   * Optional flag to render card without the min-h-screen background wrapper (e.g. inside a modal).
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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage("Please enter both email address and password.");
      return;
    }

    setIsLoading(true);

    try {
      // Authoritative Admin Authentication: Calls backend proxy route exclusively
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data?.user) {
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        } else if (typeof window !== "undefined") {
          window.location.href = redirectTo;
        }
        return;
      }

      // Display controlled error message from backend
      if (data?.error) {
        setErrorMessage(data.error);
      } else if (res.status === 401) {
        setErrorMessage("Invalid email or password.");
      } else if (res.status === 403) {
        setErrorMessage("Your account is not authorized as an administrator.");
      } else {
        setErrorMessage("Authentication failed. Please verify your credentials.");
      }
    } catch (err: any) {
      console.error("[Shurefire Admin Login] Network error:", err);
      setErrorMessage("Unable to connect to the authentication server. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const cardContent = (
    <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-xl p-8 sm:p-10 relative overflow-hidden transition-all">
      {/* Top Brand Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ae2424]" />

      {/* Header Section */}
      <div className="text-center mb-8 pt-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 text-[#ae2424] mb-3.5 border border-red-100/80 shadow-xs">
          <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 select-none">
          Shure<span className="text-[#ae2424]">fire</span>
        </h1>
        <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase mt-1">
          Sovereign Admin & Intelligence Desk
        </p>
      </div>

      {/* Inline Error Alert Container */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-800 text-xs sm:text-sm font-medium flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <AlertCircle className="w-4 h-4 text-[#ae2424] shrink-0 mt-0.5" />
          <span className="flex-1 leading-snug">{errorMessage}</span>
        </div>
      )}

      {/* Form Controls */}
      <form onSubmit={handleSubmit} className="space-y-4.5" noValidate>
        {/* Email Field */}
        <div>
          <label htmlFor="admin-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Admin Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
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
              placeholder="admin@shurefire.africa"
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm text-slate-900 bg-white placeholder-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:border-[#ae2424] focus:ring-4 focus:ring-[#ae2424]/10 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Secret Access Key / Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="admin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              disabled={isLoading}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-11 py-2.5 sm:py-3 text-sm text-slate-900 bg-white placeholder-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:border-[#ae2424] focus:ring-4 focus:ring-[#ae2424]/10 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              title={showPassword ? "Hide password" : "Show password"}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit CTA Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#ae2424] hover:bg-[#961f1f] active:bg-[#7e1919] text-white font-semibold text-sm transition-all flex items-center justify-center cursor-pointer shadow-sm hover:shadow disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin h-4 w-4 text-white" />
                <span>Verifying Credentials...</span>
              </div>
            ) : (
              <span>Sign In to Admin Portal</span>
            )}
          </button>
        </div>
      </form>

      {/* Security Footer Notice */}
      <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
        <Lock className="w-3 h-3 text-slate-400 shrink-0" />
        <span>Role-Based Access Control · TLS 1.3 Encrypted</span>
      </div>
    </div>
  );

  if (isEmbedded) {
    return <div className={`w-full flex items-center justify-center ${className}`}>{cardContent}</div>;
  }

  return (
    <div className={`min-h-screen w-full bg-slate-900/5 sm:bg-slate-100 flex items-center justify-center p-4 sm:p-6 ${className}`}>
      {cardContent}
    </div>
  );
};

export default AdminLogin;

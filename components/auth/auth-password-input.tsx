"use client";

import React, { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

interface AuthPasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
}

export const AuthPasswordInput = React.forwardRef<HTMLInputElement, AuthPasswordInputProps>(
  ({ label, error, helperText, rightElement, id, className = "", required, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || `auth-password-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {rightElement}
        </div>
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
            <Lock className="h-4 w-4" />
          </div>
          <input
            id={inputId}
            ref={ref}
            type={showPassword ? "text" : "password"}
            required={required}
            className={`w-full h-11 rounded-xl border bg-white pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
              error
                ? "border-rose-300 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/10 text-rose-900"
                : "border-slate-300 focus:border-blue-600 focus:ring-3 focus:ring-blue-500/10"
            } ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 flex items-center justify-center p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

AuthPasswordInput.displayName = "AuthPasswordInput";

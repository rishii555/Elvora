import React from "react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
}

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon, error, helperText, rightElement, id, className = "", required, ...props }, ref) => {
    const inputId = id || `auth-input-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {rightElement}
        </div>
        <div className="relative flex items-center">
          {icon && (
            <div className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            required={required}
            className={`w-full h-11 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
              icon ? "pl-10" : "px-3.5"
            } pr-3.5 ${
              error
                ? "border-rose-300 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/10 text-rose-900"
                : "border-slate-300 focus:border-blue-600 focus:ring-3 focus:ring-blue-500/10"
            } ${className}`}
            {...props}
          />
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

AuthInput.displayName = "AuthInput";

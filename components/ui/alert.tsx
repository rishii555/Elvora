import React from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils/format";

interface AlertProps {
  type?: "info" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ type = "info", title, children, className }: AlertProps) {
  const configs = {
    info: { bg: "bg-blue-50 border-blue-200 text-blue-900", icon: Info, iconColor: "text-blue-600" },
    success: { bg: "bg-emerald-50 border-emerald-200 text-emerald-900", icon: CheckCircle2, iconColor: "text-emerald-600" },
    warning: { bg: "bg-amber-50 border-amber-200 text-amber-900", icon: AlertTriangle, iconColor: "text-amber-600" },
    error: { bg: "bg-rose-50 border-rose-200 text-rose-900", icon: AlertCircle, iconColor: "text-rose-600" },
  }[type];

  const Icon = configs.icon;

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-4 text-xs sm:text-sm", configs.bg, className)}>
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", configs.iconColor)} />
      <div>
        {title && <h5 className="font-bold mb-1">{title}</h5>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

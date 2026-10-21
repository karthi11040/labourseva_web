import React from "react";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

export interface StatusAlertProps {
  variant: "success" | "error" | "warning";
  title: string;
  message: string;
}

export function StatusAlert({ variant, title, message }: StatusAlertProps) {
  const cfg = {
    success: {
      icon: CheckCircle2,
      bg: "bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-600",
      titleColor: "text-emerald-800",
      msgColor: "text-emerald-700",
    },
    error: {
      icon: AlertCircle,
      bg: "bg-rose-50 border-rose-200",
      iconColor: "text-rose-600",
      titleColor: "text-rose-800",
      msgColor: "text-rose-700",
    },
    warning: {
      icon: Clock,
      bg: "bg-amber-50 border-amber-200",
      iconColor: "text-amber-600",
      titleColor: "text-amber-800",
      msgColor: "text-amber-700",
    },
  }[variant];

  const Icon = cfg.icon;
  return (
    <div className={`p-3.5 rounded-xl border ${cfg.bg} flex items-start gap-2.5`}>
      <Icon size={16} className={`flex-shrink-0 mt-0.5 ${cfg.iconColor}`} />
      <div>
        <p className={`text-sm font-bold ${cfg.titleColor}`}>{title}</p>
        <p className={`text-xs mt-0.5 ${cfg.msgColor}`}>{message}</p>
      </div>
    </div>
  );
}

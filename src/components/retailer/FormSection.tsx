import React from "react";

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

export interface FieldProps {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
}

export function Field({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  disabled,
  hint,
}: FieldProps) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
        <span className="inline-flex items-center gap-1.5">
          <Icon size={12} className="text-slate-400" />
          {label}
          {required && <span className="text-rose-500">*</span>}
        </span>
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      />
      {hint && <p className="text-[10px] text-slate-400 mt-1 pl-1">{hint}</p>}
    </div>
  );
}

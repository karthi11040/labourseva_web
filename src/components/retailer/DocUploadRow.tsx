import React, { useRef } from "react";
import { CheckCircle2, FileCheck, Upload, X, Loader2 } from "lucide-react";

export interface DocUploadRowProps {
  label: string;
  icon: React.ReactNode;
  idLabel: string;
  idPlaceholder: string;
  idValue: string;
  onIdChange: (v: string) => void;
  fileLabel: string;
  fileName: string;
  fileUrl: string;
  uploading: boolean;
  onFileChange: (f: File | null) => void;
  onClear: () => void;
  required: boolean;
  fullWidthId?: boolean;
  disabledId?: boolean;
}

export function DocUploadRow({
  label,
  icon,
  idLabel,
  idPlaceholder,
  idValue,
  onIdChange,
  fileLabel,
  fileName,
  fileUrl,
  uploading,
  onFileChange,
  onClear,
  required,
  fullWidthId,
  disabledId,
}: DocUploadRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-bold text-slate-900">{label}</span>
        {required && <span className="text-rose-500 text-xs">*</span>}
        {fileUrl && (
          <CheckCircle2 size={14} className="text-emerald-600 ml-auto" />
        )}
      </div>

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${
          fullWidthId ? "sm:grid-cols-1" : ""
        }`}
      >
        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            {idLabel}
          </label>
          <input
            type="text"
            value={idValue}
            onChange={(e) => onIdChange(e.target.value)}
            placeholder={idPlaceholder}
            disabled={disabledId}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            {fileLabel} (PDF/JPG, max 5MB)
          </label>
          <div className="relative">
            {fileUrl ? (
              <div className="h-10 px-3 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center gap-2 text-xs">
                <FileCheck
                  size={14}
                  className="text-emerald-600 flex-shrink-0"
                />
                <span className="text-emerald-800 font-semibold truncate flex-1">
                  {fileName || "Uploaded"}
                </span>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 hover:text-emerald-900 underline text-[10px] font-semibold"
                >
                  View
                </a>
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className="text-emerald-600 hover:text-emerald-800"
                  aria-label="Remove uploaded document"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="h-10 px-3 rounded-lg border border-dashed border-slate-300 hover:border-slate-900 bg-white flex items-center gap-2 text-xs cursor-pointer transition-colors">
                {uploading ? (
                  <Loader2 size={14} className="animate-spin text-slate-700" />
                ) : (
                  <Upload size={14} className="text-slate-400" />
                )}
                <span className="text-slate-600 font-medium">
                  {uploading ? "Uploading..." : "Choose file"}
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

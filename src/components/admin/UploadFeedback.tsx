import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { UploadBatchResult } from '@/services/mediaService';

interface UploadResultSummaryProps {
  result: UploadBatchResult | null;
  onDismiss: () => void;
}

export function UploadResultSummary({ result, onDismiss }: UploadResultSummaryProps) {
  if (!result || (result.uploaded.length === 0 && result.failed.length === 0)) return null;
  return (
    <div
      className={`relative p-3 pr-9 rounded-xl border text-xs ${
        result.failed.length > 0
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
      }`}
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2 right-2 p-0.5 rounded text-slate-500 hover:text-slate-900"
        title="Đóng thông báo"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      {result.uploaded.length > 0 && <p className="font-semibold">Đã tải lên {result.uploaded.length} ảnh.</p>}
      {result.failed.length > 0 && (
        <div className="mt-1">
          <p className="font-semibold">{result.failed.length} ảnh không tải được:</p>
          <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
            {result.failed.map((f, i) => (
              <li key={`${f.name}-${i}`}>
                <span className="font-mono">{f.name}</span> — {f.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface ImageDropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
}

export function ImageDropZone({
  onFiles,
  disabled = false,
  className = '',
  activeClassName = 'border-gold-500 bg-gold-50/40',
  children,
}: ImageDropZoneProps) {
  const [isOver, setIsOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
      className={`${className} ${isOver ? activeClassName : ''}`}
    >
      {children}
    </div>
  );
}

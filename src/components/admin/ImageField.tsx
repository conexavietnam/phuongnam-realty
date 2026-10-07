import React, { useState, useRef } from 'react';
import {
  Upload,
  FolderOpen,
  Trash2,
  Image as ImageIcon,
  Edit2,
} from 'lucide-react';
import { ImagePickerModal } from './ImagePickerModal';
import type { MediaItem } from '@/services/mediaService';
import { Button } from '@/components/common/Button';
import { useBatchUpload, progressLabel } from './useBatchUpload';
import { UploadResultSummary } from './UploadFeedback';

interface ImageFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  category?: MediaItem['category'];
  helperText?: string;
  aspectRatio?: 'video' | 'square' | 'wide' | 'auto';
}

export function ImageField({
  label,
  value,
  onChange,
  required = false,
  category = 'general',
  helperText,
  aspectRatio = 'video',
}: ImageFieldProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [singleNotice, setSingleNotice] = useState<string | null>(null);
  const { progress, isUploading, result, upload, clearResult } = useBatchUpload();
  const [showUrlEdit, setShowUrlEdit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    setSingleNotice(
      files.length > 1 ? 'Ô này chỉ nhận 1 ảnh nên hệ thống dùng ảnh đầu tiên. Cần nhiều ảnh hãy dùng Bộ sưu tập.' : null,
    );
    const batch = await upload([files[0]], category);
    if (batch.uploaded[0]) onChange(batch.uploaded[0].url);
  };

  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square max-w-[160px]';
      case 'wide':
        return 'aspect-[21/9] max-w-full';
      case 'video':
      default:
        return 'aspect-[16/9] max-w-[280px]';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">(*)</span>}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlEdit(!showUrlEdit)}
          className="text-[11px] text-slate-400 hover:text-navy-900 flex items-center gap-1 transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          {showUrlEdit ? 'Ẩn link text' : 'Sửa link text'}
        </button>
      </div>

      {/* Main Image Control Box */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {/* Preview Thumbnail Card */}
        <div
          onClick={() => setIsPickerOpen(true)}
          className={`relative group rounded-xl overflow-hidden border border-slate-300 bg-white flex items-center justify-center shrink-0 cursor-pointer shadow-sm ${getAspectClass()}`}
        >
          {value ? (
            <>
              <img
                src={value}
                alt={label}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity">
                <span>Đổi ảnh</span>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-slate-400 flex flex-col items-center">
              <ImageIcon className="w-8 h-8 mb-1 opacity-50 text-slate-400" />
              <span className="text-[11px]">Chưa có ảnh</span>
            </div>
          )}
        </div>

        {/* Action Buttons Column */}
        <div className="flex-1 w-full space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Pick from Library Button */}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsPickerOpen(true)}
              className="text-xs py-2 px-3 shadow-sm font-semibold"
            >
              <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
              Chọn từ Kho Ảnh Server / VPS
            </Button>

            {/* Direct Upload Button */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={handleDirectUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-xs py-2 px-3 border-slate-300 hover:bg-slate-100"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {progressLabel(progress, 'Tải ảnh từ máy')}
            </Button>

            {/* Remove Button */}
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                title="Xóa ảnh"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Current URL hint or edit input */}
          {showUrlEdit ? (
            <div className="pt-1">
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Nhập đường dẫn ảnh từ VPS..."
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono bg-white"
              />
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 truncate max-w-sm font-mono">
              {value ? value : 'Chưa thiết lập ảnh'}
            </div>
          )}

          {singleNotice && <p className="text-[11px] text-amber-700">{singleNotice}</p>}
          <UploadResultSummary result={result} onDismiss={clearResult} />

          {helperText && (
            <p className="text-[11px] text-slate-400">{helperText}</p>
          )}
        </div>
      </div>

      {/* Media Picker Modal */}
      <ImagePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(url) => onChange(url)}
        currentValue={value}
        title={`Chọn ảnh cho: ${label}`}
        defaultCategory={category}
      />
    </div>
  );
}

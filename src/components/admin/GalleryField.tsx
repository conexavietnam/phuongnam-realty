import React, { useState, useRef } from 'react';
import {
  Upload,
  FolderOpen,
  Trash2,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';
import { ImagePickerModal } from './ImagePickerModal';
import { mediaService } from '@/services/mediaService';
import type { MediaItem } from '@/services/mediaService';
import { Button } from '@/components/common/Button';

interface GalleryFieldProps {
  label: string;
  images: string[];
  onChange: (images: string[]) => void;
  category?: MediaItem['category'];
  helperText?: string;
}

export function GalleryField({
  label,
  images = [],
  onChange,
  category = 'project',
  helperText,
}: GalleryFieldProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddImage = (url: string) => {
    if (!images.includes(url)) {
      onChange([...images, url]);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const file = files[0];
      const uploaded = await mediaService.uploadFile(file, category);
      handleAddImage(uploaded.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Tải ảnh lên thất bại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          {label} ({images.length} ảnh)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleDirectUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs py-1.5 px-2.5 border-slate-300"
          >
            <Upload className="w-3 h-3 mr-1" />
            {isUploading ? 'Đang tải...' : 'Tải ảnh từ máy'}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsPickerOpen(true)}
            className="text-xs py-1.5 px-2.5 font-semibold shadow-sm"
          >
            <FolderOpen className="w-3 h-3 mr-1" />
            Chọn từ Kho Ảnh Server
          </Button>
        </div>
      </div>

      {/* Grid of gallery images */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
        {images.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
            <p className="text-xs">Chưa có ảnh nào trong bộ sưu tập.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPickerOpen(true)}
              className="mt-2 text-xs"
            >
              Thêm ảnh ngay
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {images.map((imgUrl, idx) => (
              <div
                key={idx}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-300 bg-white shadow-sm"
              >
                <img
                  src={imgUrl}
                  alt={`Gallery ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600 transition-all"
                  title="Xóa ảnh này khỏi bộ sưu tập"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono text-white">
                  #{idx + 1}
                </div>
              </div>
            ))}

            {/* Add More Box */}
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="aspect-[4/3] rounded-xl border-2 border-dashed border-slate-300 hover:border-gold-500 hover:bg-gold-50/20 text-slate-400 hover:text-gold-600 flex flex-col items-center justify-center transition-colors"
            >
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-[11px] font-medium">Thêm ảnh</span>
            </button>
          </div>
        )}
      </div>

      {helperText && <p className="text-[11px] text-slate-400">{helperText}</p>}

      {/* Image Picker Modal */}
      <ImagePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(url) => handleAddImage(url)}
        title={`Thêm ảnh vào bộ sưu tập ${label}`}
        defaultCategory={category}
      />
    </div>
  );
}

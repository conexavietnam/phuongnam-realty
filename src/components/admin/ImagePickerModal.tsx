import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  Search,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  FolderOpen,
  Image as ImageIcon,
} from 'lucide-react';
import { mediaService } from '@/services/mediaService';
import type { MediaItem } from '@/services/mediaService';
import { Button } from '@/components/common/Button';

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, item?: MediaItem) => void;
  currentValue?: string;
  title?: string;
  defaultCategory?: MediaItem['category'];
}

export function ImagePickerModal({
  isOpen,
  onClose,
  onSelect,
  currentValue,
  title = 'Chọn Ảnh Từ Kho Lưu Trữ VPS / Server',
  defaultCategory = 'general',
}: ImagePickerModalProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [mediaList, setMediaList] = useState<MediaItem[]>(mediaService.getAll());
  const [selectedUrl, setSelectedUrl] = useState<string>(currentValue || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MediaItem['category'] | 'all'>('all');

  // Direct VPS Link input
  const [vpsUrl, setVpsUrl] = useState('');
  const [vpsName, setVpsName] = useState('');
  const [vpsCategory, setVpsCategory] = useState<MediaItem['category']>(defaultCategory);

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshMedia = () => {
    setMediaList(mediaService.getAll());
  };

  useEffect(() => {
    refreshMedia();
    const handleMediaChange = () => refreshMedia();
    window.addEventListener('pn_media_changed', handleMediaChange);
    return () => window.removeEventListener('pn_media_changed', handleMediaChange);
  }, []);

  useEffect(() => {
    if (currentValue) {
      setSelectedUrl(currentValue);
    }
  }, [currentValue]);

  if (!isOpen) return null;

  // Handle file upload from disk/device
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const file = files[0];
      const uploadedItem = await mediaService.uploadFile(file, vpsCategory);
      setSelectedUrl(uploadedItem.url);
      refreshMedia();
      setActiveTab('library');
    } catch (err: any) {
      setUploadError(err.message || 'Lỗi khi tải ảnh lên');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle direct VPS URL submission
  const handleAddVpsUrl = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!vpsUrl.trim()) return;

    try {
      const item = await mediaService.addServerUrl(vpsUrl, vpsName, vpsCategory);
      setSelectedUrl(item.url);
      setVpsUrl('');
      setVpsName('');
      refreshMedia();
      setActiveTab('library');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Không thể liên kết ảnh');
    }
  };

  // Delete media item
  const handleDeleteMedia = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa ảnh này khỏi kho ảnh?')) {
      try {
        await mediaService.deleteMedia(id);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Không thể xóa ảnh');
      }
      refreshMedia();
    }
  };

  const handleConfirmSelect = () => {
    if (!selectedUrl) return;
    const selectedItem = mediaList.find((m) => m.url === selectedUrl);
    onSelect(selectedUrl, selectedItem);
    onClose();
  };

  // Filter media items
  const filteredList = mediaList.filter((item) => {
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-navy-900 text-white flex items-center justify-between border-b border-navy-800">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-gold-400" />
            <h3 className="font-bold text-base">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'library'
                ? 'border-gold-500 text-navy-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Kho Ảnh Server / VPS ({mediaList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-gold-500 text-navy-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            Tải Ảnh Mới Lên / Nhập Link VPS
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'library' ? (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'project', label: 'Dự án' },
                    { id: 'property', label: 'BĐS' },
                    { id: 'news', label: 'Tin tức' },
                    { id: 'banner', label: 'Banner & Logo' },
                  ].map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id as any)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        categoryFilter === cat.id
                          ? 'bg-navy-900 text-gold-400 font-semibold shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên file ảnh..."
                    className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                </div>
              </div>

              {/* Grid of Images */}
              {filteredList.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Không tìm thấy ảnh nào phù hợp.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('upload')}
                    className="mt-3 text-xs"
                  >
                    Tải ảnh mới ngay
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredList.map((item) => {
                    const isSelected = selectedUrl === item.url;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedUrl(item.url)}
                        className={`group relative rounded-xl border-2 overflow-hidden cursor-pointer bg-slate-50 transition-all ${
                          isSelected
                            ? 'border-gold-500 ring-2 ring-gold-500/30 shadow-md scale-[1.02]'
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        {/* Aspect Ratio Box */}
                        <div className="aspect-[4/3] w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                          <img
                            src={item.url}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />

                          {/* Selected Checkmark Badge */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gold-500 text-navy-950 flex items-center justify-center shadow-md">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          )}

                          {/* Delete Button on Hover */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteMedia(e, item.id)}
                            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600 transition-all"
                            title="Xóa ảnh khỏi kho"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Title Bar */}
                        <div className="p-2.5 bg-white">
                          <p className="text-xs font-semibold text-navy-900 truncate" title={item.name}>
                            {item.name}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                            <span className="capitalize">{item.category}</span>
                            <span>{item.size || 'Auto'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Upload new or Add VPS Link */
            <div className="space-y-6 max-w-xl mx-auto py-4">
              {/* Option A: Upload from Computer/Phone */}
              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-gold-500 text-center bg-slate-50/50 transition-colors">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pickerModalFileUpload"
                />
                <label
                  htmlFor="pickerModalFileUpload"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gold-500/10 text-gold-600 flex items-center justify-center mb-3">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-sm text-navy-900 mb-1">
                    Tải ảnh từ máy tính hoặc điện thoại
                  </h4>
                  <p className="text-xs text-slate-500 mb-4 max-w-xs">
                    Hỗ trợ định dạng PNG, JPG, WEBP, SVG. Hệ thống tự động nén tối ưu hiển thị.
                  </p>
                  <div className="px-5 py-2.5 rounded-xl bg-navy-900 text-white font-semibold text-xs shadow-md hover:bg-navy-800 transition-colors">
                    {isUploading ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Đang tải ảnh lên...
                      </span>
                    ) : (
                      'Chọn file ảnh từ thiết bị'
                    )}
                  </div>
                </label>
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {uploadError}
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-xs font-semibold text-slate-400 uppercase">Hoặc</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              {/* Option B: Enter VPS URL */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-xs text-navy-900 uppercase tracking-wider">
                  Thêm Đường Dẫn Trực Tiếp Từ VPS / Server / CDN
                </h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Đường dẫn ảnh trên VPS (*)
                  </label>
                  <input
                    type="url"
                    required
                    value={vpsUrl}
                    onChange={(e) => setVpsUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddVpsUrl(e);
                      }
                    }}
                    placeholder="https://vps.domain.com/uploads/can-ho-palm-river.jpg"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Tên gợi nhớ ảnh
                    </label>
                    <input
                      type="text"
                      value={vpsName}
                      onChange={(e) => setVpsName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddVpsUrl(e);
                        }
                      }}
                      placeholder="Ảnh flycam dự án"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Phân loại
                    </label>
                    <select
                      value={vpsCategory}
                      onChange={(e) => setVpsCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    >
                      <option value="project">Dự án</option>
                      <option value="property">Bất động sản</option>
                      <option value="news">Tin tức</option>
                      <option value="banner">Banner & Logo</option>
                      <option value="general">Chung</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleAddVpsUrl}
                    variant="primary"
                    size="sm"
                    className="w-full text-xs font-semibold py-2.5"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Thêm Ảnh Này Vào Kho Lưu Trữ VPS
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 truncate max-w-md">
            {selectedUrl ? (
              <span>
                Ảnh đã chọn: <strong className="font-mono text-navy-900">{selectedUrl.slice(0, 50)}...</strong>
              </span>
            ) : (
              <span>Chưa chọn ảnh nào</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmSelect}
              disabled={!selectedUrl}
              className="text-xs px-5 shadow-sm"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Sử Dụng Ảnh Này
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Media library: metadata lives in the PHP backend (collection "media"), files in /uploads/.
import { api } from '@/services/apiClient';

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  size?: string;
  category: 'project' | 'property' | 'news' | 'banner' | 'logo' | 'general';
  uploadedAt: string;
  isCustomUpload?: boolean;
}

export const MEDIA_CHANGED_EVENT = 'pn_media_changed';

let items: MediaItem[] = [];

function emitChange(): void {
  window.dispatchEvent(new CustomEvent(MEDIA_CHANGED_EVENT));
}

async function persist(next: MediaItem[]): Promise<void> {
  const previous = items;
  items = next;
  emitChange();
  try {
    await api.putData('media', next);
  } catch (err) {
    items = previous;
    emitChange();
    throw err;
  }
}

export const mediaService = {
  // Admin only: requires a valid session.
  async load(): Promise<void> {
    const list = await api.getData<unknown>('media');
    if (Array.isArray(list)) {
      items = list as MediaItem[];
      emitChange();
    }
  },

  getAll(): MediaItem[] {
    return items;
  },

  getByCategory(category: MediaItem['category']): MediaItem[] {
    if (category === 'general') return items;
    return items.filter((item) => item.category === category);
  },

  // Uploads to the server (validated there) and registers the file in the library.
  async uploadFile(file: File, category: MediaItem['category'] = 'general'): Promise<MediaItem> {
    const res = await api.upload(file, category);
    const item = res.item as MediaItem;
    items = [item, ...items];
    emitChange();
    return item;
  },

  // Link an externally hosted image (http/https or site-relative path only).
  addServerUrl(url: string, name: string, category: MediaItem['category'] = 'general'): Promise<MediaItem> {
    const cleanUrl = url.trim();
    if (!/^(https?:\/\/|\/)[^\s"'<>]*$/i.test(cleanUrl)) {
      return Promise.reject(new Error('Đường dẫn ảnh phải bắt đầu bằng http://, https:// hoặc /'));
    }
    const item: MediaItem = {
      id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name || 'Ảnh VPS Server',
      url: cleanUrl,
      size: 'VPS Link',
      category,
      uploadedAt: new Date().toISOString(),
      isCustomUpload: true,
    };
    return persist([item, ...items]).then(() => item);
  },

  deleteMedia(id: string): Promise<void> {
    return persist(items.filter((item) => item.id !== id));
  },
};

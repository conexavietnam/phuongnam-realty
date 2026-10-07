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

export interface UploadFailure {
  name: string;
  reason: string;
}

export interface UploadBatchResult {
  uploaded: MediaItem[];
  failed: UploadFailure[];
}

export const MEDIA_CHANGED_EVENT = 'pn_media_changed';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
// The server pool has only 4 PHP workers: keep one free for other requests.
const UPLOAD_CONCURRENCY = 3;

let items: MediaItem[] = [];

function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF.';
  if (file.size > MAX_FILE_BYTES) return 'Ảnh vượt quá dung lượng tối đa 5MB.';
  return null;
}

function emitChange(): void {
  window.dispatchEvent(new CustomEvent(MEDIA_CHANGED_EVENT));
}

// Writes that replace the whole list run one at a time, each on a freshly read server list,
// so they never drop entries added meanwhile (other tab, concurrent uploads).
let writeQueue: Promise<unknown> = Promise.resolve();

function mutateServerList(change: (list: MediaItem[]) => MediaItem[]): Promise<void> {
  // The local cache changes only after the server accepted the write, so a failure needs no rollback.
  const run = async () => {
    const fresh = await api.getData<unknown>('media');
    const next = change(Array.isArray(fresh) ? (fresh as MediaItem[]) : items);
    await api.putData('media', next);
    items = next;
    emitChange();
  };
  const result = writeQueue.then(run, run);
  writeQueue = result.catch(() => undefined);
  return result;
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

  // Uploads many images (max 3 in flight). A failing file never aborts the others.
  async uploadFiles(
    files: File[],
    category: MediaItem['category'] = 'general',
    onProgress?: (done: number, total: number) => void,
  ): Promise<UploadBatchResult> {
    // Results keep the selection order, whatever order the uploads finish in.
    const slots: (MediaItem | undefined)[] = [];
    const failed: UploadFailure[] = [];
    const queue: { file: File; index: number }[] = [];
    files.forEach((file, index) => {
      const problem = validateImage(file);
      if (problem) failed.push({ name: file.name, reason: problem });
      else queue.push({ file, index });
    });

    const total = files.length;
    let done = failed.length;
    onProgress?.(done, total);

    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        try {
          slots[job.index] = await this.uploadFile(job.file, category);
        } catch (err) {
          failed.push({ name: job.file.name, reason: err instanceof Error ? err.message : 'Tải lên thất bại.' });
        }
        done += 1;
        onProgress?.(done, total);
      }
    };
    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, worker));
    return { uploaded: slots.filter((item): item is MediaItem => !!item), failed };
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
    return mutateServerList((list) => [item, ...list]).then(() => item);
  },

  deleteMedia(id: string): Promise<void> {
    return mutateServerList((list) => list.filter((item) => item.id !== id));
  },
};

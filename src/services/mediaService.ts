// Media Library & VPS Image Storage Service

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  size?: string;
  category: 'project' | 'property' | 'news' | 'banner' | 'logo' | 'general';
  uploadedAt: string;
  isCustomUpload?: boolean;
}

const STORAGE_KEY = 'pn_media_library';

const DEFAULT_MEDIA_ITEMS: MediaItem[] = [
  // Banner & Logo
  {
    id: 'media-banner-hero',
    name: 'Hero Banner Hoàng Hôn Ven Sông',
    url: '/images/hero-banner.svg',
    category: 'banner',
    size: '18 KB',
    uploadedAt: '2025-01-10T08:00:00Z',
  },
  {
    id: 'media-logo-pn',
    name: 'Logo Hoàng Gia Phương Nam Realty',
    url: '/logo.svg',
    category: 'logo',
    size: '3 KB',
    uploadedAt: '2025-01-10T08:00:00Z',
  },

  // Projects
  {
    id: 'media-proj-palm-river',
    name: 'Palm River - Tổng Thể Tòa Tháp',
    url: '/images/projects/palm-river.svg',
    category: 'project',
    size: '8 KB',
    uploadedAt: '2025-01-15T09:30:00Z',
  },
  {
    id: 'media-proj-palm-river-interior',
    name: 'Palm River - Nội Thất Phòng Khách',
    url: '/images/projects/palm-river-interior.svg',
    category: 'project',
    size: '6 KB',
    uploadedAt: '2025-01-15T09:35:00Z',
  },
  {
    id: 'media-proj-palm-river-pool',
    name: 'Palm River - Hồ Bơi Vô Cực Ven Sông',
    url: '/images/projects/palm-river-pool.svg',
    category: 'project',
    size: '4 KB',
    uploadedAt: '2025-01-15T09:40:00Z',
  },
  {
    id: 'media-proj-sensa-park',
    name: 'Sensa Park - Đô Thị Sinh Thái',
    url: '/images/projects/sensa-park.svg',
    category: 'project',
    size: '7 KB',
    uploadedAt: '2025-01-18T10:00:00Z',
  },
  {
    id: 'media-proj-genera',
    name: 'Genera Thu Duc - Tháp Công Nghệ',
    url: '/images/projects/genera.svg',
    category: 'project',
    size: '7 KB',
    uploadedAt: '2025-01-20T11:20:00Z',
  },
  {
    id: 'media-proj-global-city',
    name: 'The Global City - Quảng Trường Nhạc Nước',
    url: '/images/projects/the-global-city.svg',
    category: 'project',
    size: '6 KB',
    uploadedAt: '2025-01-22T14:15:00Z',
  },
  {
    id: 'media-proj-vinhomes-riverside',
    name: 'Vinhomes Riverside - Biệt Thự Kênh Đào',
    url: '/images/projects/vinhomes-riverside.svg',
    category: 'project',
    size: '8 KB',
    uploadedAt: '2025-01-25T15:00:00Z',
  },
  {
    id: 'media-proj-aqua-city',
    name: 'Aqua City - Đô Thị Đảo Phượng Hoàng',
    url: '/images/projects/aqua-city.svg',
    category: 'project',
    size: '7 KB',
    uploadedAt: '2025-01-28T16:00:00Z',
  },
  {
    id: 'media-proj-palm-city',
    name: 'Palm City - Khu Phức Hợp Ven Sông Giồng',
    url: '/images/projects/palm-city.svg',
    category: 'project',
    size: '7 KB',
    uploadedAt: '2025-02-01T08:30:00Z',
  },
  {
    id: 'media-proj-waterpoint',
    name: 'Waterpoint - Thành Phố Bên Sông Vàm Cỏ',
    url: '/images/projects/waterpoint.svg',
    category: 'project',
    size: '7 KB',
    uploadedAt: '2025-02-05T09:00:00Z',
  },
  {
    id: 'media-proj-king-bay',
    name: 'King Bay - Đô Thị Sinh Thái Nhơn Trạch',
    url: '/images/projects/king-bay.svg',
    category: 'project',
    size: '7 KB',
    uploadedAt: '2025-02-08T10:30:00Z',
  },

  // Properties
  {
    id: 'media-prop-penthouse',
    name: 'Penthouse Đỉnh Tháp Landmark',
    url: '/images/properties/luxury-penthouse.svg',
    category: 'property',
    size: '6 KB',
    uploadedAt: '2025-02-10T11:00:00Z',
  },
  {
    id: 'media-prop-villa',
    name: 'Biệt Thự Đơn Lập View Sông Hồ Bơi Riêng',
    url: '/images/properties/luxury-villa.svg',
    category: 'property',
    size: '6 KB',
    uploadedAt: '2025-02-12T14:00:00Z',
  },
  {
    id: 'media-prop-shophouse',
    name: 'Shophouse Thương Mại Đại Lộ Ánh Sáng',
    url: '/images/properties/luxury-shophouse.svg',
    category: 'property',
    size: '6 KB',
    uploadedAt: '2025-02-14T15:30:00Z',
  },
];

function getFromStorage(): MediaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading media library from storage:', e);
  }
  return DEFAULT_MEDIA_ITEMS;
}

function saveToStorage(items: MediaItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('pn_media_changed'));
  } catch (e) {
    console.warn('Error saving media library to storage:', e);
  }
}

export const mediaService = {
  getAll(): MediaItem[] {
    return getFromStorage();
  },

  getByCategory(category: MediaItem['category']): MediaItem[] {
    const items = this.getAll();
    if (category === 'general') return items;
    return items.filter((item) => item.category === category);
  },

  addMedia(item: Omit<MediaItem, 'id' | 'uploadedAt'>): MediaItem {
    const items = this.getAll();
    const newItem: MediaItem = {
      ...item,
      id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      uploadedAt: new Date().toISOString(),
      isCustomUpload: true,
    };
    items.unshift(newItem);
    saveToStorage(items);
    return newItem;
  },

  // Upload an image file from browser and compress to WebP/Data URL
  async uploadFile(file: File, category: MediaItem['category'] = 'general'): Promise<MediaItem> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) {
          reject(new Error('Không thể đọc file ảnh'));
          return;
        }

        // Calculate size in KB/MB
        const sizeInKB = Math.round(file.size / 1024);
        const sizeStr = sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} MB` : `${sizeInKB} KB`;

        const newMedia = this.addMedia({
          name: file.name.replace(/\.[^/.]+$/, ''),
          url: result,
          size: sizeStr,
          category,
          isCustomUpload: true,
        });

        resolve(newMedia);
      };

      reader.onerror = () => {
        reject(new Error('Lỗi trong quá trình đọc file ảnh'));
      };

      reader.readAsDataURL(file);
    });
  },

  // Add external VPS / Server URL
  addServerUrl(url: string, name: string, category: MediaItem['category'] = 'general'): MediaItem {
    return this.addMedia({
      name: name || 'Ảnh VPS Server',
      url: url.trim(),
      category,
      size: 'VPS Link',
      isCustomUpload: true,
    });
  },

  deleteMedia(id: string): void {
    const items = this.getAll().filter((item) => item.id !== id);
    saveToStorage(items);
  },

  resetDefault(): void {
    saveToStorage(DEFAULT_MEDIA_ITEMS);
  },
};

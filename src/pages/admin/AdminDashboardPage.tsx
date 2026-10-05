import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Building2,
  Home,
  FileText,
  Inbox,
  Settings,
  Database,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  Eye,
  Star,
  Download,
  Upload,
  RotateCcw,
  FolderOpen,
  Image as ImageIcon,
  Copy,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { ImageField } from '@/components/admin/ImageField';
import { GalleryField } from '@/components/admin/GalleryField';
import { ImagePickerModal } from '@/components/admin/ImagePickerModal';
import { TelegramSettingsCard } from '@/components/admin/TelegramSettingsCard';
import { dataStorage } from '@/services/dataStorage';
import type { CustomerLead } from '@/services/dataStorage';
import { mediaService } from '@/services/mediaService';
import type { MediaItem } from '@/services/mediaService';
import type { Project, ProjectCategory } from '@/types/project';
import type { Property, PropertyType } from '@/types/property';
import type { NewsArticle, NewsCategory } from '@/types/news';

interface AdminDashboardPageProps {
  onLogout: () => void;
}

type TabType =
  | 'overview'
  | 'projects'
  | 'properties'
  | 'leads'
  | 'news'
  | 'media'
  | 'settings'
  | 'backup';

export function AdminDashboardPage({ onLogout }: AdminDashboardPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Data Collections State
  const [projects, setProjects] = useState<Project[]>(dataStorage.getProjects());
  const [properties, setProperties] = useState<Property[]>(dataStorage.getProperties());
  const [news, setNews] = useState<NewsArticle[]>(dataStorage.getNews());
  const [leads, setLeads] = useState<CustomerLead[]>(dataStorage.getCustomerLeads());
  const [company, setCompany] = useState(dataStorage.getCompany());
  const [mediaList, setMediaList] = useState<MediaItem[]>(mediaService.getAll());

  // Search & Filters
  const [projectSearch, setProjectSearch] = useState('');
  const [propertySearch, setPropertySearch] = useState('');
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaCategoryFilter, setMediaCategoryFilter] = useState<MediaItem['category'] | 'all'>('all');
  const [leadStatusFilter, setLeadStatusFilter] = useState<'all' | CustomerLead['status']>('all');

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<(NewsArticle & { featured?: boolean }) | null>(null);
  const [isNewsImagePickerOpen, setIsNewsImagePickerOpen] = useState(false);

  // Media Tab direct VPS modal
  const [isMediaUploadModalOpen, setIsMediaUploadModalOpen] = useState(false);
  const [directVpsUrl, setDirectVpsUrl] = useState('');
  const [directVpsName, setDirectVpsName] = useState('');
  const [directVpsCat, setDirectVpsCat] = useState<MediaItem['category']>('general');
  const mediaTabFileInputRef = useRef<HTMLInputElement>(null);

  // Notification feedback
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const showError = (err: unknown) => {
    alert(err instanceof Error ? err.message : 'Thao tác thất bại. Vui lòng thử lại.');
  };

  const attempt = async (action: () => Promise<unknown>): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch (err) {
      showError(err);
      return false;
    }
  };

  const refreshAllData = () => {
    setProjects(dataStorage.getProjects());
    setProperties(dataStorage.getProperties());
    setNews(dataStorage.getNews());
    setLeads(dataStorage.getCustomerLeads());
    setCompany(dataStorage.getCompany());
    setMediaList(mediaService.getAll());
  };

  useEffect(() => {
    const handleDataChange = () => {
      refreshAllData();
    };
    window.addEventListener('pn_data_changed', handleDataChange);
    window.addEventListener('pn_media_changed', handleDataChange);
    return () => {
      window.removeEventListener('pn_data_changed', handleDataChange);
      window.removeEventListener('pn_media_changed', handleDataChange);
    };
  }, []);

  useEffect(() => {
    Promise.all([dataStorage.loadAdmin(), mediaService.load()]).catch(showError);
  }, []);

  // === PROJECT CRUD ACTIONS ===
  const handleOpenAddProject = () => {
    setEditingProject({
      id: `proj-${Date.now()}`,
      name: '',
      slug: '',
      category: 'cao-cap',
      categoryLabel: 'Căn hộ cao cấp',
      status: 'Đang mở bán',
      priceFrom: '3.5 Tỷ',
      location: 'Quận 2, TP. Thủ Đức',
      area: '5.2 ha • 1.200 căn',
      bedrooms: '1 - 3 PN',
      investor: 'Phương Nam Group',
      thumbnail: '/images/projects/palm-river.svg',
      images: [
        '/images/projects/palm-river.svg',
        '/images/projects/palm-river-interior.svg',
        '/images/projects/palm-river-pool.svg',
      ],
      shortDescription: 'Dự án căn hộ cao cấp ven sông với không gian sống sinh thái và tiện ích chuẩn nghỉ dưỡng 5 sao.',
      fullDescription: 'Dự án sở hữu vị trí vàng đắc địa mặt tiền sông, kết nối giao thông đồng bộ và chuỗi tiện ích đẳng cấp quốc tế.',
      highlights: ['Vị trí đắc địa ven sông Sài Gòn', 'Sổ hồng lâu dài, pháp lý hoàn chỉnh', 'Hồ bơi vô cực điện phân muối'],
      featured: true,
    });
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (p: Project) => {
    setEditingProject({ ...p });
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editingProject.name.trim()) return;

    const projectToSave: Project = {
      ...editingProject,
      slug:
        editingProject.slug.trim() ||
        editingProject.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/[^a-z0-9]/g, '-'),
    };

    if (!(await attempt(() => dataStorage.saveProject(projectToSave)))) return;
    refreshAllData();
    setIsProjectModalOpen(false);
    showNotification(`Đã lưu dự án "${projectToSave.name}" thành công!`);
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa dự án "${name}" không?`)) {
      if (!(await attempt(() => dataStorage.deleteProject(id)))) return;
      refreshAllData();
      showNotification(`Đã xóa dự án "${name}".`);
    }
  };

  // === PROPERTY CRUD ACTIONS ===
  const handleOpenAddProperty = () => {
    setEditingProperty({
      id: `prop-${Date.now()}`,
      title: '',
      slug: '',
      projectId: 'palm-river',
      type: 'can-ho',
      category: 'Căn hộ',
      price: 4500000000,
      priceDisplay: '4.5 Tỷ',
      area: 75,
      floor: 'Tầng 18',
      view: 'View sông Sài Gòn',
      direction: 'Đông Nam',
      legal: 'Sổ hồng riêng',
      location: 'Phường An Phú, TP. Thủ Đức, TP.HCM',
      district: 'Thành phố Thủ Đức',
      bedrooms: 2,
      bathrooms: 2,
      thumbnail: '/images/properties/waterpoint.svg',
      images: ['/images/properties/waterpoint.svg'],
      shortDescription: 'Căn hộ view trực diện sông, ban công rộng, đầy đủ nội thất cao cấp nhập khẩu, pháp lý hoàn chỉnh.',
      fullDescription: 'Căn hộ thiết kế hiện đại, thông thoáng, đầy đủ tiện ích hồ bơi, phòng gym, siêu thị, bảo vệ 24/7.',
      featured: true,
      agentId: 'agent-1',
      createdAt: new Date().toISOString(),
    });
    setIsPropertyModalOpen(true);
  };

  const handleOpenEditProperty = (prop: Property) => {
    setEditingProperty({ ...prop });
    setIsPropertyModalOpen(true);
  };

  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty || !editingProperty.title.trim()) return;

    const propToSave: Property = {
      ...editingProperty,
      slug:
        editingProperty.slug.trim() ||
        editingProperty.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/[^a-z0-9]/g, '-'),
    };

    if (!(await attempt(() => dataStorage.saveProperty(propToSave)))) return;
    refreshAllData();
    setIsPropertyModalOpen(false);
    showNotification(`Đã lưu BĐS "${propToSave.title}" thành công!`);
  };

  const handleDeleteProperty = async (id: string, title: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa bất động sản "${title}" không?`)) {
      if (!(await attempt(() => dataStorage.deleteProperty(id)))) return;
      refreshAllData();
      showNotification(`Đã xóa bất động sản "${title}".`);
    }
  };

  // === NEWS CRUD ACTIONS ===
  const handleOpenAddNews = () => {
    setEditingNews({
      id: `news-${Date.now()}`,
      title: '',
      slug: '',
      category: 'thi-truong',
      categoryLabel: 'Thị trường',
      excerpt: '',
      content: '',
      author: 'Phương Nam Realty',
      publishedAt: new Date().toISOString().split('T')[0],
      readTime: '4 phút',
      thumbnail: '/images/projects/the-global-city.svg',
      featured: false,
    });
    setIsNewsModalOpen(true);
  };

  const handleOpenEditNews = (item: NewsArticle) => {
    setEditingNews({ ...item, featured: (item as any).featured ?? false });
    setIsNewsModalOpen(true);
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews || !editingNews.title.trim()) return;

    const newsToSave: NewsArticle = {
      ...editingNews,
      slug:
        editingNews.slug.trim() ||
        editingNews.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/[^a-z0-9]/g, '-'),
    };

    if (!(await attempt(() => dataStorage.saveNews(newsToSave)))) return;
    refreshAllData();
    setIsNewsModalOpen(false);
    showNotification(`Đã lưu bài viết "${newsToSave.title}" thành công!`);
  };

  const handleDeleteNews = async (id: string, title: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa bài viết "${title}" không?`)) {
      if (!(await attempt(() => dataStorage.deleteNews(id)))) return;
      refreshAllData();
      showNotification(`Đã xóa bài viết "${title}".`);
    }
  };

  // Insert image into news content
  const handleInsertImageIntoNews = (url: string) => {
    if (!editingNews) return;
    const imageTag = `\n\n![Ảnh minh họa](${url})\n\n`;
    setEditingNews({
      ...editingNews,
      content: (editingNews.content || '') + imageTag,
    });
    showNotification('Đã chèn ảnh vào nội dung bài viết!');
  };

  // === LEADS MANAGEMENT ===
  const handleUpdateLeadStatus = async (id: string, status: CustomerLead['status']) => {
    if (!(await attempt(() => dataStorage.updateLeadStatus(id, status)))) return;
    refreshAllData();
    showNotification(`Đã cập nhật trạng thái đơn.`);
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa đơn ký gửi/yêu cầu này?')) {
      if (!(await attempt(() => dataStorage.deleteLead(id)))) return;
      refreshAllData();
      showNotification(`Đã xóa đơn.`);
    }
  };

  // === MEDIA TAB ACTIONS ===
  const handleMediaTabFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const file = files[0];
      await mediaService.uploadFile(file, directVpsCat);
      refreshAllData();
      showNotification(`Đã tải ảnh "${file.name}" lên kho thành công!`);
    } catch (err) {
      showError(err);
    } finally {
      if (mediaTabFileInputRef.current) {
        mediaTabFileInputRef.current.value = '';
      }
    }
  };

  const handleAddVpsUrlFromTab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directVpsUrl.trim()) return;

    if (!(await attempt(() => mediaService.addServerUrl(directVpsUrl, directVpsName, directVpsCat)))) return;
    setDirectVpsUrl('');
    setDirectVpsName('');
    setIsMediaUploadModalOpen(false);
    refreshAllData();
    showNotification('Đã liên kết ảnh từ VPS thành công!');
  };

  const handleCopyMediaUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    showNotification('Đã sao chép đường dẫn ảnh vào bộ nhớ tạm!');
  };

  // === COMPANY INFO SAVE ===
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(await attempt(() => dataStorage.saveCompany(company)))) return;
    refreshAllData();
    showNotification('Đã cập nhật thông tin công ty thành công!');
  };

  // === BACKUP / RESTORE ===
  const handleExportData = () => {
    const jsonStr = dataStorage.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `phuongnam_realty_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Đã tải xuống bản sao lưu dữ liệu toàn bộ website!');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        if (await dataStorage.importAllData(content)) {
          refreshAllData();
          showNotification('Phục hồi dữ liệu thành công!');
        } else {
          alert('File JSON không hợp lệ hoặc dữ liệu bị hỏng.');
        }
      } catch (err) {
        showError(err);
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefault = async () => {
    if (confirm('CẢNH BÁO: Thao tác này sẽ xóa toàn bộ các tùy chỉnh và khôi phục dữ liệu ban đầu từ file gốc. Bạn có chắc không?')) {
      if (!(await attempt(() => dataStorage.resetToDefault()))) return;
      refreshAllData();
      showNotification('Đã khôi phục dữ liệu gốc thành công!');
    }
  };

  // Filtered Lists
  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.location.toLowerCase().includes(projectSearch.toLowerCase()),
  );

  const filteredProperties = properties.filter(
    (p) =>
      p.title.toLowerCase().includes(propertySearch.toLowerCase()) ||
      p.location.toLowerCase().includes(propertySearch.toLowerCase()),
  );

  const filteredLeads = leads.filter((l) => {
    if (leadStatusFilter === 'all') return true;
    return l.status === leadStatusFilter;
  });

  const filteredMedia = mediaList.filter((m) => {
    const matchCat = mediaCategoryFilter === 'all' || m.category === mediaCategoryFilter;
    const matchSearch =
      m.name.toLowerCase().includes(mediaSearch.toLowerCase()) ||
      m.url.toLowerCase().includes(mediaSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-navy-900 border-b border-navy-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo variant="light" size="sm" showTagline={false} />
            <div className="hidden sm:block h-6 w-px bg-white/20" />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold-500/20 text-gold-400 font-bold text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              ADMIN CMS
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Telegram Notification Indicator */}
            <div className="hidden md:flex items-center gap-2 bg-navy-950/80 px-3 py-1.5 rounded-lg border border-gold-500/30 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">Telegram: cấu hình tại máy chủ</span>
            </div>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xem Website</span>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="border-white/20 text-slate-200 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 text-xs py-1.5 px-3"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Đăng xuất
            </Button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto scrollbar-hide border-t border-navy-800/80">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-gold-500 text-gold-400 bg-navy-800/50'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Tổng quan
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'projects'
                ? 'border-gold-500 text-gold-400 bg-navy-800/50'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Dự án ({projects.length})
          </button>

          <button
            onClick={() => setActiveTab('properties')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'properties'
                ? 'border-gold-500 text-gold-400 bg-navy-800/50'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Home className="w-4 h-4" />
            Bất động sản ({properties.length})
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'leads'
                ? 'border-gold-500 text-gold-400 bg-navy-800/50'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Đơn ký gửi ({leads.length})
            {leads.some((l) => l.status === 'new') && (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'news'
                ? 'border-gold-500 text-gold-400 bg-navy-800/50'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            Tin tức ({news.length})
          </button>

          {/* New Media / VPS Library Tab */}
          <button
            onClick={() => setActiveTab('media')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'media'
                ? 'border-gold-500 text-gold-400 bg-navy-800/50'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Kho Ảnh Server ({mediaList.length})
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-gold-500 text-gold-400 bg-navy-800/50'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            Cài đặt
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-gold-500 text-gold-400 bg-navy-800/50'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            Sao lưu dữ liệu
          </button>
        </div>
      </header>

      {/* Action Notification Toast */}
      {actionSuccess && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">{actionSuccess}</span>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ===================== TAB 1: OVERVIEW ===================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Dự Án</p>
                  <p className="text-2xl font-bold text-navy-900 mt-1">{projects.length}</p>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-emerald-600" />
                    {projects.filter((p) => p.featured).length} dự án nổi bật
                  </p>
                </div>
                <div className="p-3 bg-navy-50 text-navy-700 rounded-xl">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">BĐS Chuyển Nhượng</p>
                  <p className="text-2xl font-bold text-navy-900 mt-1">{properties.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Căn hộ & Nhà phố cao cấp</p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Home className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đơn Ký Gửi & Khách</p>
                  <p className="text-2xl font-bold text-navy-900 mt-1">{leads.length}</p>
                  <p className="text-xs text-rose-500 mt-1 font-medium">
                    {leads.filter((l) => l.status === 'new').length} đơn mới cần xử lý
                  </p>
                </div>
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                  <Inbox className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kho Ảnh Server</p>
                  <p className="text-2xl font-bold text-navy-900 mt-1">{mediaList.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Tài nguyên ảnh VPS</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <FolderOpen className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Telegram Real-time Push Status Card */}
            <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 rounded-2xl p-6 text-white shadow-lg border border-gold-500/30">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold-500/20 text-gold-400 font-semibold text-xs mb-2">
                <MessageSquare className="w-3.5 h-3.5" />
                THÔNG BÁO TELEGRAM TỪ MÁY CHỦ
              </div>
              <h3 className="text-lg font-bold text-white">
                Thông Báo Ký Gửi BĐS & Mã OTP Được Gửi Bởi Máy Chủ
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Khi khách hàng gửi form Ký gửi hoặc Liên hệ, máy chủ sẽ lưu yêu cầu và đẩy thông báo về Telegram quản trị. Cấu hình bot nằm trong file cấu hình trên máy chủ.
              </p>
            </div>

            {/* Recent Leads Preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-gold-500" />
                  Đơn Ký Gửi & Khách Hàng Gần Đây
                </h3>
                <button
                  onClick={() => setActiveTab('leads')}
                  className="text-xs text-gold-600 hover:text-gold-700 font-semibold"
                >
                  Xem tất cả ({leads.length}) &rarr;
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Khách hàng</th>
                      <th className="py-3 px-4">Số điện thoại</th>
                      <th className="py-3 px-4">Nhu cầu</th>
                      <th className="py-3 px-4">Khu vực / Dự án</th>
                      <th className="py-3 px-4">Mức giá</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leads.slice(0, 5).map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-navy-900">{lead.fullName}</td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          <a href={`tel:${lead.phone}`} className="hover:text-gold-600">
                            {lead.phone}
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            lead.purpose === 'ban'
                              ? 'bg-rose-100 text-rose-700'
                              : lead.purpose === 'cho-thue'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {lead.purpose === 'ban' ? 'Cần bán' : lead.purpose === 'cho-thue' ? 'Cho thuê' : 'Tư vấn'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{lead.region || 'Không có'}</td>
                        <td className="py-3 px-4 text-slate-600">{lead.priceRange || 'Thương lượng'}</td>
                        <td className="py-3 px-4">
                          <select
                            value={lead.status}
                            onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as CustomerLead['status'])}
                            className="text-xs rounded-lg border border-slate-200 px-2 py-1 bg-white font-medium focus:ring-1 focus:ring-gold-500"
                          >
                            <option value="new">Mới nhận</option>
                            <option value="contacted">Đang liên hệ</option>
                            <option value="completed">Đã hoàn thành</option>
                            <option value="cancelled">Đã hủy</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={`https://zalo.me/${lead.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium mr-3"
                          >
                            Zalo
                          </a>
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: PROJECTS MANAGEMENT ===================== */}
        {activeTab === 'projects' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
              <div>
                <h2 className="text-xl font-bold text-navy-900">Quản Lý Dự Án Phân Phối</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thêm mới, chọn ảnh đại diện & bộ sưu tập gallery từ kho ảnh VPS, chỉnh sửa giá bán và thông tin dự án.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Tìm tên hoặc vị trí..."
                    className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 w-52 sm:w-64 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                </div>

                <Button variant="primary" size="sm" onClick={handleOpenAddProject} className="text-xs shadow-sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Thêm Dự Án
                </Button>
              </div>
            </div>

            {/* Projects Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Dự án</th>
                      <th className="py-3 px-4">Phân loại</th>
                      <th className="py-3 px-4">Giá từ</th>
                      <th className="py-3 px-4">Vị trí</th>
                      <th className="py-3 px-4">Chủ đầu tư</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4 text-center">Nổi bật</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProjects.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.thumbnail}
                              alt={p.name}
                              className="w-12 h-10 object-cover rounded-lg bg-slate-100 shrink-0 border border-slate-200"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div>
                              <div className="font-bold text-navy-900 text-sm">{p.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">/{p.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{p.categoryLabel || p.category}</td>
                        <td className="py-3 px-4 font-bold text-gold-600">{p.priceFrom}</td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{p.location}</td>
                        <td className="py-3 px-4 text-slate-600">{p.investor}</td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.featured ? (
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400 inline" />
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/du-an/${p.slug}`}
                              target="_blank"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-100"
                              title="Xem ngoài web"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleOpenEditProject(p)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                              title="Chỉnh sửa"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProject(p.id, p.name)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: PROPERTIES MANAGEMENT ===================== */}
        {activeTab === 'properties' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
              <div>
                <h2 className="text-xl font-bold text-navy-900">Quản Lý BĐS Chuyển Nhượng & Cho Thuê</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thêm, sửa, xóa giỏ hàng bất động sản chuyển nhượng kèm chọn ảnh đại diện & gallery từ VPS.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={propertySearch}
                    onChange={(e) => setPropertySearch(e.target.value)}
                    placeholder="Tìm tên hoặc địa chỉ..."
                    className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 w-52 sm:w-64 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                </div>

                <Button variant="primary" size="sm" onClick={handleOpenAddProperty} className="text-xs shadow-sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Thêm BĐS
                </Button>
              </div>
            </div>

            {/* Properties Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Bất động sản</th>
                      <th className="py-3 px-4">Loại hình</th>
                      <th className="py-3 px-4">Giá bán</th>
                      <th className="py-3 px-4">Diện tích</th>
                      <th className="py-3 px-4">Kết cấu</th>
                      <th className="py-3 px-4">Pháp lý</th>
                      <th className="py-3 px-4">Vị trí</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProperties.map((prop) => (
                      <tr key={prop.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={prop.thumbnail}
                              alt={prop.title}
                              className="w-12 h-10 object-cover rounded-lg bg-slate-100 shrink-0 border border-slate-200"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div>
                              <div className="font-bold text-navy-900 text-sm max-w-xs truncate">{prop.title}</div>
                              <div className="text-[11px] text-slate-400 font-mono">/{prop.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 capitalize">
                            {prop.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-gold-600">{prop.priceDisplay}</td>
                        <td className="py-3 px-4 text-slate-700">{prop.area} m²</td>
                        <td className="py-3 px-4 text-slate-600">{prop.bedrooms} PN • {prop.bathrooms} WC</td>
                        <td className="py-3 px-4 text-slate-600">{prop.legal}</td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{prop.location}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/chuyen-nhuong/${prop.slug}`}
                              target="_blank"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-100"
                              title="Xem ngoài web"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleOpenEditProperty(prop)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                              title="Chỉnh sửa"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProperty(prop.id, prop.title)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: LEADS & CONSIGNMENTS ===================== */}
        {activeTab === 'leads' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
              <div>
                <h2 className="text-xl font-bold text-navy-900">Quản Lý Đơn Ký Gửi & Khách Hàng</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tất cả yêu cầu gửi từ Form Ký gửi BĐS và Form Liên hệ sẽ được tổng hợp và bắn tin nhắn Telegram tại đây.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Lọc theo:</span>
                <select
                  value={leadStatusFilter}
                  onChange={(e) => setLeadStatusFilter(e.target.value as any)}
                  className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-gold-500/50"
                >
                  <option value="all">Tất cả ({leads.length})</option>
                  <option value="new">Mới nhận ({leads.filter((l) => l.status === 'new').length})</option>
                  <option value="contacted">Đang liên hệ ({leads.filter((l) => l.status === 'contacted').length})</option>
                  <option value="completed">Đã hoàn thành ({leads.filter((l) => l.status === 'completed').length})</option>
                  <option value="cancelled">Đã hủy ({leads.filter((l) => l.status === 'cancelled').length})</option>
                </select>
              </div>
            </div>

            {/* Leads Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Khách hàng</th>
                      <th className="py-3 px-4">Số điện thoại</th>
                      <th className="py-3 px-4">Nguồn</th>
                      <th className="py-3 px-4">Nhu cầu</th>
                      <th className="py-3 px-4">Khu vực / Dự án</th>
                      <th className="py-3 px-4">Mức giá</th>
                      <th className="py-3 px-4">Ghi chú</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(lead.createdAt).toLocaleDateString('vi-VN')} {new Date(lead.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 font-bold text-navy-900">{lead.fullName}</td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          <a href={`tel:${lead.phone}`} className="hover:text-gold-600">
                            {lead.phone}
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            lead.source === 'consignment' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {lead.source === 'consignment' ? 'Ký gửi' : 'Liên hệ'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-semibold capitalize">{lead.purpose}</span>
                          {lead.propertyType && <span className="text-slate-500"> ({lead.propertyType})</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{lead.region || '-'}</td>
                        <td className="py-3 px-4 text-slate-600">{lead.priceRange || '-'}</td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={lead.note}>
                          {lead.note || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={lead.status}
                            onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as any)}
                            className="text-xs rounded-lg border border-slate-200 px-2 py-1 bg-white font-medium focus:ring-1 focus:ring-gold-500"
                          >
                            <option value="new">Mới nhận</option>
                            <option value="contacted">Đang liên hệ</option>
                            <option value="completed">Đã hoàn thành</option>
                            <option value="cancelled">Đã hủy</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <a
                            href={`https://zalo.me/${lead.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold mr-3"
                          >
                            Zalo
                          </a>
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 5: NEWS MANAGEMENT ===================== */}
        {activeTab === 'news' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
              <div>
                <h2 className="text-xl font-bold text-navy-900">Quản Lý Tin Tức & Thị Trường</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thêm mới bài viết phân tích thị trường, chọn ảnh đại diện bài viết và chèn ảnh minh họa vào nội dung bài viết.
                </p>
              </div>

              <Button variant="primary" size="sm" onClick={handleOpenAddNews} className="text-xs shadow-sm">
                <Plus className="w-4 h-4 mr-1" />
                Thêm Bài Viết
              </Button>
            </div>

            {/* News Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Bài viết</th>
                      <th className="py-3 px-4">Chuyên mục</th>
                      <th className="py-3 px-4">Tác giả</th>
                      <th className="py-3 px-4">Ngày đăng</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {news.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-12 h-10 object-cover rounded-lg bg-slate-100 shrink-0 border border-slate-200"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div>
                              <div className="font-bold text-navy-900 text-sm max-w-md truncate">{item.title}</div>
                              <div className="text-[11px] text-slate-400 font-mono">/{item.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 capitalize">{item.categoryLabel || item.category}</td>
                        <td className="py-3 px-4 text-slate-600">{item.author}</td>
                        <td className="py-3 px-4 text-slate-500">{item.publishedAt}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/tin-tuc/${item.slug}`}
                              target="_blank"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-100"
                              title="Xem ngoài web"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleOpenEditNews(item)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                              title="Chỉnh sửa"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteNews(item.id, item.title)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 6: MEDIA / VPS LIBRARY ===================== */}
        {activeTab === 'media' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
              <div>
                <h2 className="text-xl font-bold text-navy-900">Kho Lưu Trữ Hình Ảnh Server / VPS</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tải ảnh từ máy tính hoặc kết nối đường dẫn ảnh trực tiếp từ máy chủ VPS / CDN để sử dụng trên toàn hệ thống.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={mediaSearch}
                    onChange={(e) => setMediaSearch(e.target.value)}
                    placeholder="Tìm theo tên file ảnh..."
                    className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 w-48 sm:w-56 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                </div>

                {/* Direct Upload input */}
                <input
                  type="file"
                  ref={mediaTabFileInputRef}
                  accept="image/*"
                  onChange={handleMediaTabFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mediaTabFileInputRef.current?.click()}
                  className="text-xs"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Tải Ảnh Lên
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsMediaUploadModalOpen(true)}
                  className="text-xs shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Thêm Link Ảnh VPS
                </Button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
              {[
                { id: 'all', label: `Tất cả (${mediaList.length})` },
                { id: 'project', label: `Dự án (${mediaList.filter((m) => m.category === 'project').length})` },
                { id: 'property', label: `BĐS (${mediaList.filter((m) => m.category === 'property').length})` },
                { id: 'news', label: `Tin tức (${mediaList.filter((m) => m.category === 'news').length})` },
                { id: 'banner', label: `Banner (${mediaList.filter((m) => m.category === 'banner').length})` },
                { id: 'logo', label: `Logo (${mediaList.filter((m) => m.category === 'logo').length})` },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setMediaCategoryFilter(cat.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    mediaCategoryFilter === cat.id
                      ? 'bg-navy-900 text-gold-400 font-semibold shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Media Grid */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
              {filteredMedia.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Không tìm thấy ảnh nào trong kho.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredMedia.map((item) => (
                    <div
                      key={item.id}
                      className="group relative rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden hover:border-gold-500 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="aspect-[4/3] w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />

                        {/* Hover Overlay Actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity p-2">
                          <button
                            type="button"
                            onClick={() => handleCopyMediaUrl(item.url)}
                            className="p-2 rounded-lg bg-white/90 text-navy-900 hover:bg-white transition-colors"
                            title="Sao chép link ảnh"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg bg-white/90 text-navy-900 hover:bg-white transition-colors"
                            title="Xem kích thước gốc"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm('Bạn có chắc muốn xóa ảnh này khỏi kho?')) {
                                if (!(await attempt(() => mediaService.deleteMedia(item.id)))) return;
                                refreshAllData();
                                showNotification('Đã xóa ảnh khỏi kho.');
                              }
                            }}
                            className="p-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                            title="Xóa ảnh"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-white border-t border-slate-100">
                        <p className="text-xs font-semibold text-navy-900 truncate" title={item.name}>
                          {item.name}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span className="capitalize">{item.category}</span>
                          <span>{item.size || 'Auto'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 7: SETTINGS ===================== */}
        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <TelegramSettingsCard />

            {/* Company Info & Visual Assets Configuration Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
              <h3 className="text-base font-bold text-navy-900 mb-1">
                Cập Nhật Thông Tin Doanh Nghiệp & Hình Ảnh Giao Diện
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Các thông tin dưới đây sẽ hiển thị trực tiếp tại Header, Footer, Hero Banner và trang Liên hệ. Bạn có thể chọn ảnh banner và logo từ kho VPS hoặc tải ảnh mới.
              </p>

              <form onSubmit={handleSaveCompany} className="space-y-6">
                {/* Visual Assets (Banner & Logo) */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-5">
                  <h4 className="font-bold text-xs text-navy-900 uppercase tracking-wider">
                    Hình Ảnh Thương Hiệu & Banner
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <ImageField
                      label="Ảnh Nền Hero Banner Trang Chủ"
                      value={(company as any).heroBannerImage || '/images/hero-banner.svg'}
                      onChange={(url) => setCompany({ ...company, heroBannerImage: url })}
                      category="banner"
                      aspectRatio="wide"
                      helperText="Ảnh hiển thị toàn màn hình tại đầu trang chủ (Desktop & Mobile)."
                    />

                    <ImageField
                      label="Logo Thương Hiệu Phương Nam Realty"
                      value={(company as any).logoImage || '/logo.svg'}
                      onChange={(url) => setCompany({ ...company, logoImage: url })}
                      category="logo"
                      aspectRatio="square"
                      helperText="Logo hiển thị trên Header, Footer, thanh điều hướng và màn hình đăng nhập."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tên thương hiệu (*)</label>
                    <input
                      type="text"
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Khẩu hiệu / Slogan</label>
                    <input
                      type="text"
                      value={company.slogan}
                      onChange={(e) => setCompany({ ...company, slogan: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hotline tư vấn (*)</label>
                    <input
                      type="text"
                      value={company.hotline}
                      onChange={(e) => setCompany({ ...company, hotline: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email hỗ trợ</label>
                    <input
                      type="email"
                      value={company.email}
                      onChange={(e) => setCompany({ ...company, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ trụ sở chính</label>
                    <input
                      type="text"
                      value={company.address}
                      onChange={(e) => setCompany({ ...company, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề Hero Banner</label>
                    <input
                      type="text"
                      value={company.heroTitle}
                      onChange={(e) => setCompany({ ...company, heroTitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả phụ Hero Banner</label>
                    <input
                      type="text"
                      value={company.heroSubtitle}
                      onChange={(e) => setCompany({ ...company, heroSubtitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Google Maps Embed URL</label>
                    <input
                      type="text"
                      value={company.googleMapsEmbed}
                      onChange={(e) => setCompany({ ...company, googleMapsEmbed: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <Button type="submit" variant="primary" size="sm" className="font-semibold text-xs py-2.5 px-6 shadow-sm">
                    LƯU THAY ĐỔI THÔNG TIN CÔNG TY & HÌNH ẢNH
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================== TAB 8: BACKUP & RESTORE ===================== */}
        {activeTab === 'backup' && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
              <h3 className="text-base font-bold text-navy-900 mb-1 flex items-center gap-2">
                <Database className="w-5 h-5 text-gold-500" />
                Sao Lưu & Phục Hồi Dữ Liệu
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Toàn bộ dữ liệu Dự án, BĐS chuyển nhượng, Đơn ký gửi và Tin tức có thể được sao lưu định kỳ dạng file JSON hoặc phục hồi khi cần.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Export */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                      <Download className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-navy-900 text-sm mb-1">Xuất Bản Sao Lưu (JSON)</h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Tải về máy toàn bộ dữ liệu hiện tại của website để lưu trữ dự phòng.
                    </p>
                  </div>
                  <Button variant="primary" size="sm" onClick={handleExportData} className="w-full text-xs">
                    Tải File Sao Lưu
                  </Button>
                </div>

                {/* Import */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                      <Upload className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-navy-900 text-sm mb-1">Phục Hồi Dữ Liệu</h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Nhập file JSON đã sao lưu trước đó để khôi phục trạng thái website.
                    </p>
                  </div>
                  <label className="w-full">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="hidden"
                    />
                    <div className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-navy-900 font-semibold text-xs text-center cursor-pointer shadow-sm transition-colors">
                      Chọn File Phục Hồi
                    </div>
                  </label>
                </div>

                {/* Reset Default */}
                <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-rose-900 text-sm mb-1">Khôi Phục Gốc</h4>
                    <p className="text-xs text-rose-700/80 mb-4">
                      Xóa toàn bộ các tùy chỉnh và đặt lại dữ liệu mặc định từ file ban đầu.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetDefault}
                    className="w-full text-xs border-rose-300 text-rose-700 hover:bg-rose-100"
                  >
                    Reset Về Mặc Định
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===================== MODAL: PROJECT EDIT/ADD ===================== */}
      {isProjectModalOpen && editingProject && (
        <Modal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          title={editingProject.id.startsWith('proj-') ? 'Thêm Dự Án Mới' : `Chỉnh Sửa Dự Án: ${editingProject.name}`}
          size="3xl"
        >
          <form onSubmit={handleSaveProject} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên dự án (*)</label>
                <input
                  type="text"
                  required
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  placeholder="VD: Palm River Luxury"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Đường dẫn tĩnh (Slug)</label>
                <input
                  type="text"
                  value={editingProject.slug}
                  onChange={(e) => setEditingProject({ ...editingProject, slug: e.target.value })}
                  placeholder="Tự sinh nếu để trống"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phân loại (*)</label>
                <select
                  value={editingProject.category}
                  onChange={(e) => {
                    const cat = e.target.value as ProjectCategory;
                    const labels: Record<ProjectCategory, string> = {
                      'cao-cap': 'Căn hộ cao cấp',
                      shophouse: 'Shophouse thương mại',
                      'biet-thu': 'Biệt thự nghỉ dưỡng',
                      'nha-pho': 'Nhà phố liền kề',
                      'dat-nen': 'Đất nền dự án',
                    };
                    setEditingProject({
                      ...editingProject,
                      category: cat,
                      categoryLabel: labels[cat] || 'Căn hộ cao cấp',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="cao-cap">Căn hộ cao cấp</option>
                  <option value="biet-thu">Biệt thự</option>
                  <option value="nha-pho">Nhà phố</option>
                  <option value="shophouse">Shophouse</option>
                  <option value="dat-nen">Đất nền</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trạng thái dự án (*)</label>
                <select
                  value={editingProject.status}
                  onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="Đang mở bán">Đang mở bán</option>
                  <option value="Sắp mở bán">Sắp mở bán</option>
                  <option value="Đã bàn giao">Đã bàn giao</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mức giá từ (*)</label>
                <input
                  type="text"
                  required
                  value={editingProject.priceFrom}
                  onChange={(e) => setEditingProject({ ...editingProject, priceFrom: e.target.value })}
                  placeholder="VD: 3.5 Tỷ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vị trí tổng quan (*)</label>
                <input
                  type="text"
                  required
                  value={editingProject.location}
                  onChange={(e) => setEditingProject({ ...editingProject, location: e.target.value })}
                  placeholder="VD: Quận 2, TP. Thủ Đức"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chủ đầu tư</label>
                <input
                  type="text"
                  value={editingProject.investor}
                  onChange={(e) => setEditingProject({ ...editingProject, investor: e.target.value })}
                  placeholder="VD: Phương Nam Group"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quy mô & Số căn (Area)</label>
                <input
                  type="text"
                  value={editingProject.area}
                  onChange={(e) => setEditingProject({ ...editingProject, area: e.target.value })}
                  placeholder="VD: 5.2 ha • 1.200 căn"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {/* Visual Thumbnail Picker Component */}
              <div className="md:col-span-2">
                <ImageField
                  label="Ảnh đại diện dự án (Thumbnail)"
                  value={editingProject.thumbnail}
                  onChange={(url) => setEditingProject({ ...editingProject, thumbnail: url })}
                  category="project"
                  required
                  helperText="Ảnh hiển thị trên thẻ card dự án tại trang chủ và danh mục dự án. Có thể chọn từ Kho ảnh VPS hoặc tải ảnh mới."
                />
              </div>

              {/* Visual Multi-Image Gallery Field */}
              <div className="md:col-span-2">
                <GalleryField
                  label="Bộ sưu tập ảnh chi tiết dự án (Gallery)"
                  images={editingProject.images || []}
                  onChange={(imgs) => setEditingProject({ ...editingProject, images: imgs })}
                  category="project"
                  helperText="Danh sách ảnh trình chiếu trong trang chi tiết dự án. Bạn có thể chọn từ Kho ảnh VPS hoặc tải ảnh mới từ máy tính."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Mô tả ngắn (*)</label>
                <textarea
                  rows={2}
                  required
                  value={editingProject.shortDescription}
                  onChange={(e) => setEditingProject({ ...editingProject, shortDescription: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Mô tả chi tiết</label>
                <textarea
                  rows={4}
                  value={editingProject.fullDescription}
                  onChange={(e) => setEditingProject({ ...editingProject, fullDescription: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="projFeatured"
                  checked={editingProject.featured}
                  onChange={(e) => setEditingProject({ ...editingProject, featured: e.target.checked })}
                  className="w-4 h-4 text-gold-500 rounded"
                />
                <label htmlFor="projFeatured" className="font-semibold text-slate-700">
                  Ghim làm dự án nổi bật hiển thị trên Trang chủ
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsProjectModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Lưu Dự Án
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================== MODAL: PROPERTY EDIT/ADD ===================== */}
      {isPropertyModalOpen && editingProperty && (
        <Modal
          isOpen={isPropertyModalOpen}
          onClose={() => setIsPropertyModalOpen(false)}
          title={editingProperty.id.startsWith('prop-') ? 'Thêm Bất Động Sản Mới' : `Chỉnh Sửa BĐS: ${editingProperty.title}`}
          size="3xl"
        >
          <form onSubmit={handleSaveProperty} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề BĐS (*)</label>
                <input
                  type="text"
                  required
                  value={editingProperty.title}
                  onChange={(e) => setEditingProperty({ ...editingProperty, title: e.target.value })}
                  placeholder="VD: Căn hộ 2PN Palm River view sông thoáng mát"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loại hình BĐS (*)</label>
                <select
                  value={editingProperty.type}
                  onChange={(e) => setEditingProperty({ ...editingProperty, type: e.target.value as PropertyType })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="can-ho">Căn hộ</option>
                  <option value="biet-thu">Biệt thự</option>
                  <option value="nha-pho">Nhà phố</option>
                  <option value="shophouse">Shophouse</option>
                  <option value="dat-nen">Đất nền</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mức giá hiển thị (*)</label>
                <input
                  type="text"
                  required
                  value={editingProperty.priceDisplay}
                  onChange={(e) => setEditingProperty({ ...editingProperty, priceDisplay: e.target.value })}
                  placeholder="VD: 4.5 Tỷ hoặc 18 Triệu/tháng"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giá trị số (VNĐ để lọc tìm kiếm) (*)</label>
                <input
                  type="number"
                  required
                  value={editingProperty.price}
                  onChange={(e) => setEditingProperty({ ...editingProperty, price: Number(e.target.value) })}
                  placeholder="VD: 4500000000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Diện tích (m²)</label>
                <input
                  type="number"
                  value={editingProperty.area}
                  onChange={(e) =>
                    setEditingProperty({
                      ...editingProperty,
                      area: Number(e.target.value),
                    })
                  }
                  placeholder="75"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hướng nhà / ban công</label>
                <input
                  type="text"
                  value={editingProperty.direction}
                  onChange={(e) => setEditingProperty({ ...editingProperty, direction: e.target.value })}
                  placeholder="Đông Nam"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phòng ngủ / Phòng tắm</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={editingProperty.bedrooms}
                    onChange={(e) => setEditingProperty({ ...editingProperty, bedrooms: Number(e.target.value) })}
                    placeholder="2 PN"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                  <input
                    type="number"
                    value={editingProperty.bathrooms}
                    onChange={(e) => setEditingProperty({ ...editingProperty, bathrooms: Number(e.target.value) })}
                    placeholder="2 WC"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tình trạng pháp lý</label>
                <input
                  type="text"
                  value={editingProperty.legal}
                  onChange={(e) => setEditingProperty({ ...editingProperty, legal: e.target.value })}
                  placeholder="Sổ hồng riêng"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Địa chỉ chi tiết (*)</label>
                <input
                  type="text"
                  required
                  value={editingProperty.location}
                  onChange={(e) => setEditingProperty({ ...editingProperty, location: e.target.value })}
                  placeholder="Phường An Phú, TP. Thủ Đức, TP.HCM"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {/* Visual Property Thumbnail Picker */}
              <div className="md:col-span-2">
                <ImageField
                  label="Ảnh đại diện bất động sản (Thumbnail)"
                  value={editingProperty.thumbnail}
                  onChange={(url) => setEditingProperty({ ...editingProperty, thumbnail: url })}
                  category="property"
                  required
                  helperText="Ảnh hiển thị trên thẻ card BĐS chuyển nhượng ngoài website. Chọn từ kho ảnh VPS hoặc tải ảnh mới."
                />
              </div>

              {/* Visual Property Gallery Field */}
              <div className="md:col-span-2">
                <GalleryField
                  label="Bộ sưu tập ảnh chi tiết bất động sản (Gallery)"
                  images={editingProperty.images || []}
                  onChange={(imgs) => setEditingProperty({ ...editingProperty, images: imgs })}
                  category="property"
                  helperText="Danh sách hình ảnh thực tế căn hộ, biệt thự (phòng khách, phòng ngủ, ban công, view sông...)."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Mô tả chi tiết (*)</label>
                <textarea
                  rows={3}
                  required
                  value={editingProperty.shortDescription}
                  onChange={(e) => setEditingProperty({ ...editingProperty, shortDescription: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsPropertyModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Lưu BĐS
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================== MODAL: NEWS EDIT/ADD ===================== */}
      {isNewsModalOpen && editingNews && (
        <Modal
          isOpen={isNewsModalOpen}
          onClose={() => setIsNewsModalOpen(false)}
          title={editingNews.id.startsWith('news-') ? 'Thêm Bài Viết Mới' : `Chỉnh Sửa Tin Tức`}
          size="2xl"
        >
          <form onSubmit={handleSaveNews} className="space-y-5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tiêu đề bài viết (*)</label>
              <input
                type="text"
                required
                value={editingNews.title}
                onChange={(e) => setEditingNews({ ...editingNews, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chuyên mục (*)</label>
                <select
                  value={editingNews.category}
                  onChange={(e) => {
                    const cat = e.target.value as NewsCategory;
                    const labels: Record<NewsCategory, string> = {
                      'thi-truong': 'Thị trường',
                      'tin-tuc': 'Tin tức',
                      'du-an': 'Dự án',
                    };
                    setEditingNews({
                      ...editingNews,
                      category: cat,
                      categoryLabel: labels[cat] || 'Thị trường',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="thi-truong">Thị trường</option>
                  <option value="tin-tuc">Tin tức</option>
                  <option value="du-an">Dự án</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tác giả</label>
                <input
                  type="text"
                  value={editingNews.author}
                  onChange={(e) => setEditingNews({ ...editingNews, author: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            {/* Visual News Thumbnail Picker */}
            <div>
              <ImageField
                label="Ảnh đại diện bài viết (Thumbnail)"
                value={editingNews.thumbnail}
                onChange={(url) => setEditingNews({ ...editingNews, thumbnail: url })}
                category="news"
                required
                helperText="Ảnh bìa hiển thị trên trang tin tức và mạng xã hội."
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tóm tắt ngắn (Excerpt)</label>
              <textarea
                rows={2}
                value={editingNews.excerpt}
                onChange={(e) => setEditingNews({ ...editingNews, excerpt: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            {/* News Content with Image Insertion Toolbar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-slate-700">Nội dung chi tiết bài viết (*)</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewsImagePickerOpen(true)}
                  className="text-xs py-1 px-2.5 border-gold-500/50 text-navy-900 hover:bg-gold-50"
                >
                  <ImageIcon className="w-3.5 h-3.5 mr-1 text-gold-600" />
                  + Chèn ảnh từ Kho VPS vào bài viết
                </Button>
              </div>
              <textarea
                rows={7}
                required
                value={editingNews.content}
                onChange={(e) => setEditingNews({ ...editingNews, content: e.target.value })}
                placeholder="Nhập nội dung bài viết. Bạn có thể bấm '+ Chèn ảnh từ Kho VPS' để thêm hình ảnh minh họa..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-sans leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Gợi ý: Ảnh chèn vào bài viết có dạng <code>![Mô tả ảnh](đường-dẫn-ảnh)</code> và sẽ được hiển thị với khung ảnh lớn sắc nét ngoài bài viết.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewsModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Lưu Bài Viết
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal for Inserting Image into News Content */}
      <ImagePickerModal
        isOpen={isNewsImagePickerOpen}
        onClose={() => setIsNewsImagePickerOpen(false)}
        onSelect={(url) => handleInsertImageIntoNews(url)}
        title="Chọn ảnh từ Kho VPS để chèn vào nội dung bài viết"
        defaultCategory="news"
      />

      {/* Modal: Direct VPS Image Link Input */}
      {isMediaUploadModalOpen && (
        <Modal
          isOpen={isMediaUploadModalOpen}
          onClose={() => setIsMediaUploadModalOpen(false)}
          title="Liên Kết Đường Dẫn Ảnh Trực Tiếp Từ VPS / Server"
          size="md"
        >
          <form onSubmit={handleAddVpsUrlFromTab} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Đường dẫn ảnh trên VPS / CDN (*)
              </label>
              <input
                type="url"
                required
                value={directVpsUrl}
                onChange={(e) => setDirectVpsUrl(e.target.value)}
                placeholder="https://vps.phuongnamrealty.com/uploads/photo.jpg"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tên gợi nhớ ảnh
              </label>
              <input
                type="text"
                value={directVpsName}
                onChange={(e) => setDirectVpsName(e.target.value)}
                placeholder="VD: Flycam biệt thự Vinhomes"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Phân loại mục
              </label>
              <select
                value={directVpsCat}
                onChange={(e) => setDirectVpsCat(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              >
                <option value="project">Dự án</option>
                <option value="property">Bất động sản</option>
                <option value="news">Tin tức</option>
                <option value="banner">Banner & Logo</option>
                <option value="general">Khác</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsMediaUploadModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Thêm Vào Kho Ảnh
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

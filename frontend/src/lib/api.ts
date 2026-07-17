import axios from 'axios';
import { getCookie, setCookie, removeCookie } from './cookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getCookie('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Rewrite kanald CDN URLs to proxy URLs to avoid CORS
function rewriteUrls(obj: any): any {
  if (typeof obj === 'string') {
    // image.kanald.com.tr/i/kanald/... -> /api/proxy/image/i/kanald/...
    if (obj.startsWith('https://image.kanald.com.tr/')) return '/api/proxy/image/' + obj.slice('https://image.kanald.com.tr/'.length);
    // kanaldvod.duhnet.tv/hls/... -> /api/proxy/vod/hls/...
    if (obj.startsWith('https://kanaldvod.duhnet.tv/')) return '/api/proxy/vod/' + obj.slice('https://kanaldvod.duhnet.tv/'.length);
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(rewriteUrls);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = rewriteUrls(val);
    }
    return result;
  }
  return obj;
}

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      response.data = rewriteUrls(response.data);
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = getCookie('refreshToken');
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const res = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
          if (res.data.success) {
            setCookie('token', res.data.data.token, 7);
            error.config.headers.Authorization = `Bearer ${res.data.data.token}`;
            return api(error.config);
          }
        } catch {
          removeCookie('token');
          removeCookie('refreshToken');
          if (typeof window !== 'undefined') window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  refreshToken: (token: string) => api.post('/auth/refresh-token', { refreshToken: token }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
};

// Content
export const contentApi = {
  getAll: (params?: any) => api.get('/content', { params }),
  getFeatured: () => api.get('/content/featured'),
  getTrending: () => api.get('/content/trending'),
  getById: (id: string) => api.get(`/content/${id}`),
  getBySlug: (slug: string) => api.get(`/content/slug/${slug}`),
  search: (params: any) => api.get('/content/search', { params }),
  getRecommendations: (id: string) => api.get(`/content/recommendations/${id}`),
};

// User
export const userApi = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data: any) => api.put('/user/profile', data),
  createProfile: (data: any) => api.post('/user/profiles', data),
  updateProfileById: (id: string, data: any) => api.put(`/user/profiles/${id}`, data),
  deleteProfile: (id: string) => api.delete(`/user/profiles/${id}`),
  getWatchHistory: () => api.get('/user/watch-history'),
  saveWatchProgress: (data: any) => api.post('/user/watch-history', data),
  getFavorites: () => api.get('/user/favorites'),
  addFavorite: (contentId: string) => api.post(`/user/favorites/${contentId}`),
  removeFavorite: (contentId: string) => api.delete(`/user/favorites/${contentId}`),
  getWatchLater: () => api.get('/user/watch-later'),
  addWatchLater: (contentId: string) => api.post(`/user/watch-later/${contentId}`),
  removeWatchLater: (contentId: string) => api.delete(`/user/watch-later/${contentId}`),
  getContinueWatching: () => api.get('/user/continue-watching'),
  getSubscription: () => api.get('/user/subscription'),
  getNotifications: () => api.get('/user/notifications'),
  markNotificationRead: (id: string) => api.put(`/user/notifications/${id}/read`),
  deleteWatchHistoryItem: (contentId: string) => api.delete(`/user/watch-history/${contentId}`),
  getMyRatings: () => api.get('/user/ratings'),
  rateContent: (contentId: string, score: number) => api.post(`/user/ratings/${contentId}`, { score }),
  removeRating: (contentId: string) => api.delete(`/user/ratings/${contentId}`),
  getMyComments: () => api.get('/user/my-comments'),
};

// Subscription
export const subscriptionApi = {
  getMySubscription: () => api.get('/subscription/my-subscription'),
  purchase: (data?: { amount?: number; planName?: string; currency?: string }) => api.post('/subscription/purchase', data || {}),
};

// Payment
export const paymentApi = {
  getRevenue: () => api.get('/payment/admin/revenue'),
};

// Admin
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  getUserById: (id: string) => api.get(`/admin/users/${id}`),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  banUser: (id: string) => api.post(`/admin/users/${id}/ban`),
  unbanUser: (id: string) => api.post(`/admin/users/${id}/unban`),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  resetUserPassword: (id: string) => api.post(`/admin/users/${id}/reset-password`),
  createAdmin: (data: any) => api.post('/admin/users/create-admin', data),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: any) => api.put('/admin/settings', data),
  getAuditLogs: (params?: any) => api.get('/admin/audit-logs', { params }),
  createContent: (data: any) => api.post('/admin/content', data),
  updateContent: (id: string, data: any) => api.put(`/admin/content/${id}`, data),
  deleteContent: (id: string) => api.delete(`/admin/content/${id}`),
  createSeason: (contentId: string, data: any) => api.post(`/admin/content/${contentId}/seasons`, data),
  createEpisode: (seasonId: string, data: any) => api.post(`/admin/content/seasons/${seasonId}/episodes`, data),
  deleteEpisode: (id: string) => api.delete(`/admin/content/episodes/${id}`),
  addVideo: (contentId: string, data: any) => api.post(`/admin/content/${contentId}/videos`, data),
  getSubscriptions: (params?: any) => api.get('/admin/subscriptions', { params }),
  activateSubscription: (userId: string, data: any) => api.post(`/admin/subscriptions/user/${userId}`, data),
  updateSubscription: (id: string, data: any) => api.put(`/admin/subscriptions/${id}`, data),
  getPayments: (params?: any) => api.get('/admin/payments', { params }),
  processPayment: (id: string, data: any) => api.put(`/admin/payments/${id}`, data),
  getCategories: () => api.get('/admin/categories'),
  createCategory: (data: any) => api.post('/admin/categories', data),
  updateCategory: (id: string, data: any) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/admin/categories/${id}`),
  getMovies: (params?: any) => api.get('/admin/movies', { params }),
  getSeries: (params?: any) => api.get('/admin/series', { params }),
  broadcastNotification: (data: any) => api.post('/admin/notifications/broadcast', data),
  getNotifications: () => api.get('/admin/notifications'),
  createNotification: (data: any) => api.post('/admin/notifications', data),
  deleteNotification: (id: string) => api.delete(`/admin/notifications/${id}`),
  getNotificationHistory: () => api.get('/admin/notifications/history'),
  getBanners: () => api.get('/admin/banners'),
  createBanner: (data: any) => api.post('/admin/banners', data),
  updateBanner: (id: string, data: any) => api.put(`/admin/banners/${id}`, data),
  deleteBanner: (id: string) => api.delete(`/admin/banners/${id}`),
  // Import
  scanFolder: (folderPath: string) => api.post('/import/scan', { folderPath }),
  startImport: (data: { folderPath: string; genre?: string; year?: number }) => api.post('/import/start', data),
  getImportProgress: (id: string) => `${API_URL}/import/progress/${id}`,

  // Bulk operations
  bulkEdit: (ids: string[], data: any) => api.post('/admin/bulk/edit', { ids, data }),
  bulkDelete: (ids: string[]) => api.post('/admin/bulk/delete', { ids }),

  // Export
  exportContent: (format: string) => api.get(`/admin/export/content`, { params: { format }, responseType: 'blob' }),
  exportUsers: (format: string) => api.get(`/admin/export/users`, { params: { format }, responseType: 'blob' }),

  // TMDB metadata
  tmdbLookup: (tmdbId: string, type: string) => api.post('/admin/tmdb/lookup', { tmdbId, type }),

  // Quality control
  qualityAudit: () => api.get('/admin/quality/audit'),

  // Backup
  createBackup: () => api.post('/admin/backup/create'),
  listBackups: () => api.get('/admin/backup/list'),
  restoreBackup: (id: string) => api.post(`/admin/backup/restore/${id}`),
  downloadBackup: (id: string) => api.get(`/admin/backup/download/${id}`, { responseType: 'blob' }),

  // Advanced stats
  getDetailedStats: () => api.get('/admin/stats/detailed'),

  // Error logs
  getErrorLogs: (params?: any) => api.get('/admin/errors', { params }),
  logError: (data: any) => api.post('/admin/errors/log', data),

  // Media manager
  getMediaList: (params?: any) => api.get('/admin/media/list', { params }),
  deleteMedia: (filename: string) => api.delete(`/admin/media/${filename}`),
  getMediaStats: () => api.get('/admin/media/stats'),

  // Advanced search
  advancedSearch: (params: any) => api.get('/admin/search/advanced', { params }),

  // Recommendations
  getRecommendations: (contentId: string) => api.get(`/admin/recommendations/${contentId}`),
};

// Social
export const socialApi = {
  getComments: (contentId: string, episodeId?: string) => {
    const params = episodeId ? `?episodeId=${episodeId}` : '';
    return api.get(`/social/${contentId}${params}`);
  },
  addComment: (data: any) => api.post('/social', data),
  deleteComment: (id: string) => api.delete(`/social/${id}`),
  toggleReaction: (data: any) => api.post('/social/reactions/toggle', data),
  getReactions: (contentId: string) => api.get(`/social/reactions/${contentId}`),

  createParty: (data: any) => api.post('/social/party/create', data),
  getParty: (id: string) => api.get(`/social/party/${id}`),
  joinParty: (id: string) => api.post(`/social/party/${id}/join`),
  leaveParty: (id: string) => api.post(`/social/party/${id}/leave`),
  syncParty: (id: string, data: any) => api.post(`/social/party/${id}/sync`, data),

  toggleFollow: (userId: string) => api.post('/social/follow/toggle', { userId }),
  getFollowers: () => api.get('/social/followers'),
  getFollowing: () => api.get('/social/following'),

  getMyStats: () => api.get('/social/my-stats'),
  getAchievements: () => api.get('/social/achievements'),

  adminGetComments: (params?: any) => api.get('/social/admin/comments', { params }),
  adminDeleteComment: (id: string) => api.delete(`/social/admin/comments/${id}`),
  adminHardDeleteComment: (id: string) => api.delete(`/social/admin/comments/${id}/hard`),
  adminCommentStats: () => api.get('/social/admin/comments/stats'),
};

// Subscription Extended
export const subscriptionExtendedApi = {
  redeemCoupon: (code: string) => api.post('/subscription/coupon/redeem', { code }),
  validateCoupon: (code: string) => api.get(`/subscription/coupon/validate/${code}`),
  redeemGift: (code: string) => api.post('/subscription/gift/redeem', { code }),
  getPlans: () => api.get('/subscription/plans'),
  startTrial: () => api.post('/subscription/trial/start'),
  getInvoices: () => api.get('/subscription/invoices'),
  toggleAutoRenew: () => api.post('/subscription/auto-renew/toggle'),
};

// Security
export const securityApi = {
  enable2FA: () => api.post('/security/2fa/enable'),
  verify2FA: (code: string) => api.post('/security/2fa/verify', { code }),
  disable2FA: (code: string) => api.post('/security/2fa/disable', { code }),
  getLoginHistory: () => api.get('/security/login-history'),
  getDevices: () => api.get('/security/devices'),
  revokeDevice: (id: string) => api.delete(`/security/devices/${id}`),
  blockIp: (ip: string) => api.post('/security/block-ip', { ip }),
  getBlockedIps: () => api.get('/security/blocked-ips'),
  unblockIp: (ip: string) => api.delete(`/security/blocked-ips/${encodeURIComponent(ip)}`),
};

// Admin Stats
export const adminStatsApi = {
  getServerStats: () => api.get('/admin/stats/server'),
  getRealtimeStats: () => api.get('/admin/stats/realtime'),
  getQueueStatus: () => api.get('/admin/stats/queue'),
  getAuditExtended: (params?: any) => api.get('/admin/stats/audit', { params }),
};

// IBAN Payment
export const ibanPaymentApi = {
  getIbanInfo: () => api.get('/payment/iban/iban-info'),
  createPayment: (data: any) => api.post('/payment/iban/create', data),
  uploadReceipt: (id: string, formData: FormData) => api.post(`/payment/iban/${id}/receipt`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMyPayments: () => api.get('/payment/iban/my'),
  getPayment: (id: string) => api.get(`/payment/iban/${id}`),
  adminGetAll: (params?: any) => api.get('/payment/iban/admin/all', { params }),
  adminApprove: (id: string, note?: string) => api.post(`/payment/iban/admin/${id}/approve`, { note }),
  adminReject: (id: string, note?: string) => api.post(`/payment/iban/admin/${id}/reject`, { note }),
  adminDelete: (id: string) => api.delete(`/payment/iban/admin/${id}`),
};

// AI
export const aiApi = {
  getRecommendations: (userId: string) => api.get(`/ai/recommendations/${userId}`),
  getWhatToWatch: () => api.get('/ai/what-to-watch'),
  summarize: (data: any) => api.post('/ai/summarize', data),
  episodeSummary: (data: any) => api.post('/ai/episode-summary', data),
  getSimilarContent: (contentId: string) => api.get(`/ai/similar/${contentId}`),
  getAgeAppropriate: (userId: string) => api.get(`/ai/age-appropriate/${userId}`),
};

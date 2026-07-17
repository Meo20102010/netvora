export interface User {
  id: string; email: string; username: string; displayName?: string; avatar?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'; isVerified: boolean; isBanned: boolean;
  createdAt: string; lastLoginAt?: string;
}
export interface Profile {
  id: string; userId: string; name: string; avatar?: string; isChild: boolean; pinCode?: string; language: string;
}
export interface Content {
  id: string; title: string; slug: string; description?: string; type: 'MOVIE'|'SERIES'|'DOCUMENTARY'|'ANIMATION'|'STANDUP'|'ORIGINAL';
  posterUrl?: string; coverUrl?: string; trailerUrl?: string; year?: number; duration?: number;
  imdbRating?: number; director?: string; cast: string[]; tags: string[]; country?: string; language?: string;
  quality: string; isActive: boolean; isFeatured: boolean; categoryId?: string; category?: Category;
  seasons?: Season[]; videos?: Video[]; createdAt: string; averageRating?: number;
}
export interface Season { id: string; contentId: string; seasonNumber: number; title?: string; episodes: Episode[]; }
export interface Episode { id: string; seasonId: string; episodeNumber: number; title: string; description?: string; duration?: number; stillUrl?: string; videos?: Video[]; }
export interface Video { id: string; contentId?: string; episodeId?: string; url: string; quality: string; language: string; subtitle?: string; }
export interface Category { id: string; name: string; slug: string; description?: string; image?: string; sortOrder: number; }
export interface Subscription { id: string; userId: string; packageName: string; price: number; currency: string; startDate: string; endDate: string; status: 'ACTIVE'|'EXPIRED'|'CANCELLED'; user?: { id: string; email: string; username: string; displayName?: string; }; }
export interface Payment { id: string; userId: string; amount: number; currency: string; method: string; status: string; createdAt: string; }
export interface Notification { id: string; userId?: string; title: string; message: string; type?: string; isRead?: boolean; link?: string; targetUsers?: string; createdAt: string; }
export interface ApiResponse<T = any> { success: boolean; data?: T; message?: string; error?: string; pagination?: { page: number; limit: number; total: number; totalPages: number; }; }
export interface DashboardStats { totalUsers: number; totalMovies: number; totalSeries: number; totalViews: number; totalRevenue: number; todayRevenue: number; recentUsers: User[]; recentContent: Content[]; }
export interface QualityIssue {
  contentId: string;
  title: string;
  type: 'missing_poster' | 'missing_episodes' | 'broken_video' | 'missing_subtitle';
  details: string;
}
export interface Backup {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
}
export interface MediaFile {
  name: string;
  path: string;
  size: number;
  type: string;
  modifiedAt: string;
}
export interface ErrorLog {
  id: string;
  type: string;
  message: string;
  details?: string;
  createdAt: string;
}
export interface DetailedStats {
  mostWatched: { contentId: string; title: string; views: number }[];
  mostActiveUsers: { userId: string; username: string; watchTime: number }[];
  topSearches: { query: string; count: number }[];
  popularGenres: { categoryId: string; name: string; count: number }[];
}
export interface Banner {
  id: string; title: string; image: string; link?: string;
  active: boolean; sortOrder?: number; createdAt: string;
}
export interface TmdbMetadata {
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  rating: number;
  director: string;
  cast: string[];
  genres: string[];
  duration: number;
  trailerUrl: string;
}

export interface Comment {
  id: string; userId: string; contentId: string; episodeId?: string;
  text: string; hasSpoiler: boolean; createdAt: string;
  user?: { id: string; username: string; displayName?: string; avatar?: string };
  reactions?: Reaction[];
}
export interface Reaction {
  id: string; userId: string; commentId?: string; contentId?: string;
  emoji: string; createdAt: string;
}
export interface WatchParty {
  id: string; hostId: string; contentId: string; isActive: boolean;
  startedAt: string; participants?: WatchPartyParticipant[];
  content?: Content;
}
export interface WatchPartyParticipant {
  id: string; partyId: string; userId: string; joinedAt: string;
  user?: { id: string; username: string; displayName?: string; avatar?: string };
}
export interface Follow {
  id: string; followerId: string; followingId: string; createdAt: string;
}
export interface UserBadge {
  id: string; userId: string; badgeType: string; earnedAt: string;
}
export interface UserStats {
  totalWatchTime: number; moviesWatched: number; seriesWatched: number;
  episodesWatched: number; topGenre?: string; weeklyMinutes: number;
  monthlyMinutes: number;
}
export interface Coupon {
  id: string; code: string; discount: number; discountType: string;
  maxUses?: number; usedCount: number; isActive: boolean;
}
export interface IbanPayment {
  id: string; userId: string; amount: number; currency: string; packageName: string;
  duration: number; paymentCode: string; status: 'PENDING' | 'RECEIVED' | 'APPROVED' | 'REJECTED';
  iban?: string; receiptUrl?: string; receiptFilename?: string; adminNote?: string;
  approvedAt?: string; rejectedAt?: string; createdAt: string;
  user?: { id: string; email: string; username: string; displayName?: string };
}

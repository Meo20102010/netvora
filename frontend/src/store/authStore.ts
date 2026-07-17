import { create } from 'zustand';
import { User } from '@/types';
import { authApi } from '@/lib/api';
import { setCookie, getCookie, removeCookie } from '@/lib/cookies';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  setUser: (user: User) => void;
}

const AUTH_KEY = 'netvora_auth';

function saveLocal(data: { user: User; isAuthenticated: boolean }) {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(data)); } catch {}
}

function loadLocal(): { user: User; isAuthenticated: boolean } | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function clearLocal() {
  try { localStorage.removeItem(AUTH_KEY); } catch {}
}

export const useAuthStore = create<AuthState>((set) => {
  const cached = loadLocal();

  return {
    user: cached?.user || null,
    isAuthenticated: cached?.isAuthenticated || false,
    isLoading: true,

    login: async (email, password, rememberMe) => {
      const res = await authApi.login({ email, password, rememberMe });
      if (res.data.success) {
        const { token, refreshToken, user } = res.data.data;
        const days = rememberMe ? 30 : 7;
        setCookie('token', token, days);
        setCookie('refreshToken', refreshToken, 30);
        set({ user, isAuthenticated: true });
        saveLocal({ user, isAuthenticated: true });
      }
    },

    register: async (email, password, username) => {
      const res = await authApi.register({ email, password, username });
      if (res.data.success) {
        const { token, refreshToken, user } = res.data.data;
        setCookie('token', token, 7);
        setCookie('refreshToken', refreshToken, 30);
        set({ user, isAuthenticated: true });
        saveLocal({ user, isAuthenticated: true });
      }
    },

    logout: () => {
      removeCookie('token');
      removeCookie('refreshToken');
      clearLocal();
      set({ user: null, isAuthenticated: false });
    },

    fetchUser: async () => {
      let token = getCookie('token');

      if (!token) {
        const refreshToken = getCookie('refreshToken');
        if (refreshToken) {
          try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
            const res = await fetch(`${API_URL}/auth/refresh-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            const data = await res.json();
            if (data.success) {
              token = data.data.token;
              setCookie('token', data.data.token, 7);
              setCookie('refreshToken', data.data.refreshToken, 30);
              set({ user: data.data.user, isAuthenticated: true, isLoading: false });
              saveLocal({ user: data.data.user, isAuthenticated: true });
              return;
            }
          } catch {}
        }

        clearLocal();
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      try {
        const res = await authApi.getMe();
        if (res.data.success) {
          set({ user: res.data.data, isAuthenticated: true, isLoading: false });
          saveLocal({ user: res.data.data, isAuthenticated: true });
        }
      } catch {
        removeCookie('token');
        removeCookie('refreshToken');
        clearLocal();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },

    setUser: (user) => {
      set({ user, isAuthenticated: true });
      saveLocal({ user, isAuthenticated: true });
    },
  };
});

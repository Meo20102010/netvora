import Cookies from 'js-cookie';

export const setCookie = (name: string, value: string, days: number = 7) => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  Cookies.set(name, value, {
    expires: days,
    secure: !isLocalhost,
    sameSite: 'lax',
    path: '/',
  });
};

export const getCookie = (name: string): string | undefined => {
  return Cookies.get(name);
};

export const removeCookie = (name: string) => {
  Cookies.remove(name, { path: '/' });
};

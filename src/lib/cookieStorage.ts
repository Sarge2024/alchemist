export const cookieStorage = {
  getItem: (key: string) => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
    if (match) return decodeURIComponent(match[2]);
    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof document === 'undefined') return;
    // Expira em 1 ano
    const d = new Date();
    d.setTime(d.getTime() + (365*24*60*60*1000));
    document.cookie = `${key}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  },
  removeItem: (key: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax`;
  }
};

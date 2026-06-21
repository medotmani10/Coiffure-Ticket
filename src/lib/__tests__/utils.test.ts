import { describe, it, expect, afterEach } from 'vitest';
import { cn, getCustomerBaseUrl, getBarberBaseUrl } from '../utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges tailwind classes correctly', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
      expect(cn('bg-red-500', undefined, null, false, 'text-white')).toBe('bg-red-500 text-white');
      // Tailwind merge test: text-white and text-black conflict, text-black wins
      expect(cn('text-white text-black')).toBe('text-black');
    });
  });

  describe('URL helpers', () => {
    const originalWindow = global.window;

    afterEach(() => {
      global.window = originalWindow;
    });

    describe('getCustomerBaseUrl', () => {
      it('returns empty string if window is undefined', () => {
        // @ts-ignore
        delete global.window;
        expect(getCustomerBaseUrl()).toBe('');
        global.window = originalWindow;
      });

      it('returns protocol + host for localhost', () => {
        global.window = {
          ...originalWindow,
          location: {
            host: 'localhost:5173',
            protocol: 'http:',
          } as Location
        } as Window & typeof globalThis;

        expect(getCustomerBaseUrl()).toBe('http://localhost:5173');
      });

      it('returns protocol + host for 127.0.0.1', () => {
        global.window = {
          ...originalWindow,
          location: {
            host: '127.0.0.1:5173',
            protocol: 'http:',
          } as Location
        } as Window & typeof globalThis;

        expect(getCustomerBaseUrl()).toBe('http://127.0.0.1:5173');
      });

      it('removes admin- prefix for localhost', () => {
        global.window = {
          ...originalWindow,
          location: {
            host: 'admin-localhost:5173',
            protocol: 'http:',
          } as Location
        } as Window & typeof globalThis;

        expect(getCustomerBaseUrl()).toBe('http://localhost:5173');
      });

      it('returns Vercel customer app URL in production', () => {
        global.window = {
          ...originalWindow,
          location: {
            host: 'admin.coiffureticket.vercel.app',
            protocol: 'https:',
          } as Location
        } as Window & typeof globalThis;

        expect(getCustomerBaseUrl()).toBe('https://customer-coiffureticket.vercel.app');
      });
    });

    describe('getBarberBaseUrl', () => {
      it('returns empty string if window is undefined', () => {
        // @ts-ignore
        delete global.window;
        expect(getBarberBaseUrl()).toBe('');
        global.window = originalWindow;
      });

      it('returns protocol + host for localhost', () => {
        global.window = {
          ...originalWindow,
          location: {
            host: 'localhost:5173',
            protocol: 'http:',
          } as Location
        } as Window & typeof globalThis;

        expect(getBarberBaseUrl()).toBe('http://localhost:5173');
      });

      it('returns protocol + host for 127.0.0.1', () => {
        global.window = {
          ...originalWindow,
          location: {
            host: '127.0.0.1:5173',
            protocol: 'http:',
          } as Location
        } as Window & typeof globalThis;

        expect(getBarberBaseUrl()).toBe('http://127.0.0.1:5173');
      });

      it('removes admin- prefix for localhost', () => {
        global.window = {
          ...originalWindow,
          location: {
            host: 'admin-localhost:5173',
            protocol: 'http:',
          } as Location
        } as Window & typeof globalThis;

        expect(getBarberBaseUrl()).toBe('http://localhost:5173');
      });

      it('returns Vercel barber app URL in production', () => {
        global.window = {
          ...originalWindow,
          location: {
            host: 'admin.coiffureticket.vercel.app',
            protocol: 'https:',
          } as Location
        } as Window & typeof globalThis;

        expect(getBarberBaseUrl()).toBe('https://coiffure-coiffureticket.vercel.app');
      });
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { resolveApiBaseUrl } from '../config/apiConfig';

describe('Centralized API Configuration', () => {
  it('uses configured production VITE_API_URL when valid', () => {
    const url = resolveApiBaseUrl({
      viteApiUrl: 'https://borrowhub.onrender.com/api/',
      isProd: true
    });
    expect(url).toBe('https://borrowhub.onrender.com/api');
  });

  it('normalizes production URL missing /api suffix', () => {
    const url = resolveApiBaseUrl({
      viteApiUrl: 'https://borrowhub.onrender.com',
      isProd: true
    });
    expect(url).toBe('https://borrowhub.onrender.com/api');
  });

  it('never falls back to localhost when VITE_API_URL is missing in production', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const url = resolveApiBaseUrl({
      viteApiUrl: undefined,
      isProd: true
    });
    expect(url).toBe('https://borrowhub.onrender.com/api');
    expect(url).not.toContain('localhost');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('throws an error if localhost is configured in production', () => {
    expect(() =>
      resolveApiBaseUrl({
        viteApiUrl: 'http://localhost:5000/api',
        isProd: true
      })
    ).toThrow(/cannot use a localhost API URL/i);

    expect(() =>
      resolveApiBaseUrl({
        viteApiUrl: 'http://127.0.0.1:5000/api',
        isProd: true
      })
    ).toThrow(/cannot use a localhost API URL/i);
  });

  it('uses localhost fallback only in development mode', () => {
    const url = resolveApiBaseUrl({
      viteApiUrl: undefined,
      isProd: false,
      devFallback: 'http://localhost:5000/api'
    });
    expect(url).toBe('http://localhost:5000/api');
  });
});

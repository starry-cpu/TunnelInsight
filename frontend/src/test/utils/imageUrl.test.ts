import { describe, it, expect } from 'vitest';
import { getImageUrl } from '../../utils/imageUrl';

describe('getImageUrl', () => {
  it('returns original URL if already absolute http URL', () => {
    const result = getImageUrl('http://example.com/image.jpg');
    expect(result).toBe('http://example.com/image.jpg');
  });

  it('returns original URL if already absolute https URL', () => {
    const result = getImageUrl('https://example.com/image.jpg');
    expect(result).toBe('https://example.com/image.jpg');
  });

  it('returns relative path for /uploads/ paths', () => {
    const result = getImageUrl('/uploads/2024/01/image.jpg');
    expect(result).toBe('/uploads/2024/01/image.jpg');
  });

  it('handles paths without leading slash', () => {
    const result = getImageUrl('uploads/2024/01/image.jpg');
    expect(result).toBe('/uploads/2024/01/image.jpg');
  });

  it('handles empty or null paths', () => {
    expect(getImageUrl('')).toBe('');
    expect(getImageUrl(null as unknown as string)).toBe('');
    expect(getImageUrl(undefined as unknown as string)).toBe('');
  });

  it('handles data URLs', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    expect(getImageUrl(dataUrl)).toBe(dataUrl);
  });

  it('handles blob URLs', () => {
    const blobUrl = 'blob:http://localhost:6006/abc123';
    expect(getImageUrl(blobUrl)).toBe(blobUrl);
  });
});

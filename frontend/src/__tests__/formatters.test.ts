import { describe, it, expect } from 'vitest';
import { formatRupiah, formatDate, truncateUuid } from '@/lib/formatters';

describe('formatRupiah', () => {
  it('formats zero', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
  });

  it('formats small number', () => {
    expect(formatRupiah(1500)).toMatch(/Rp\s?1[.,]500/);
  });

  it('formats large number with dot separators', () => {
    const result = formatRupiah(1500000);
    expect(result).toMatch(/Rp/);
    expect(result).toMatch(/1[.,]500[.,]000/);
  });

  it('formats negative values (edge case)', () => {
    const result = formatRupiah(-500);
    expect(result).toMatch(/Rp/);
  });
});

describe('formatDate', () => {
  it('formats valid ISO date', () => {
    const result = formatDate('2025-06-20T00:00:00');
    expect(result).not.toBe('-');
    expect(result).toMatch(/20/);
    expect(result).toMatch(/2025/);
  });

  it('returns dash for null', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('returns dash for undefined', () => {
    expect(formatDate(undefined)).toBe('-');
  });

  it('returns dash for empty string', () => {
    expect(formatDate('')).toBe('-');
  });

  it('returns dash for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('-');
  });
});

describe('truncateUuid', () => {
  it('truncates long UUID', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const result = truncateUuid(uuid);
    expect(result).toBe('a1b2c3d4...');
    expect(result.length).toBeLessThan(uuid.length);
  });

  it('keeps short strings as-is', () => {
    expect(truncateUuid('abc')).toBe('abc');
  });

  it('returns dash for empty string', () => {
    expect(truncateUuid('')).toBe('-');
  });
});

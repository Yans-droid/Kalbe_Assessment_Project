import { describe, it, expect } from 'vitest';
import { trackerSchema, requestSchema, loginSchema } from '@/lib/schemas';

describe('trackerSchema', () => {
  it('validates valid tracker', () => {
    const result = trackerSchema.safeParse({
      code: 'TRK-01',
      description: 'Test tracker',
      actionType: 'text',
      order: 0,
      mandays: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty code', () => {
    const result = trackerSchema.safeParse({
      code: '',
      description: 'Test',
      actionType: 'none',
      order: 0,
      mandays: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects lowercase code', () => {
    const result = trackerSchema.safeParse({
      code: 'trk-01',
      description: 'Test',
      actionType: 'none',
      order: 0,
      mandays: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('code');
    }
  });

  it('rejects invalid actionType', () => {
    const result = trackerSchema.safeParse({
      code: 'TRK-01',
      description: 'Test',
      actionType: 'invalid',
      order: 0,
      mandays: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects mandays < -1', () => {
    const result = trackerSchema.safeParse({
      code: 'TRK-01',
      description: 'Test',
      actionType: 'none',
      order: 0,
      mandays: -2,
    });
    expect(result.success).toBe(false);
  });

  it('allows mandays = -1 (no SLA)', () => {
    const result = trackerSchema.safeParse({
      code: 'TRK-01',
      description: 'Test',
      actionType: 'none',
      order: 0,
      mandays: -1,
    });
    expect(result.success).toBe(true);
  });
});

describe('requestSchema', () => {
  it('validates valid request', () => {
    const result = requestSchema.safeParse({
      projectCode: 'PRJ-001',
      totalFee: 1500000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty projectCode', () => {
    const result = requestSchema.safeParse({
      projectCode: '',
      totalFee: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative totalFee', () => {
    const result = requestSchema.safeParse({
      projectCode: 'PRJ-001',
      totalFee: -100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects completedDate before wipDate', () => {
    const result = requestSchema.safeParse({
      projectCode: 'PRJ-001',
      totalFee: 0,
      analysisWipDate: '2026-06-20',
      analysisCompletedDate: '2026-06-10',
    });
    expect(result.success).toBe(false);
  });

  it('allows completedDate after wipDate', () => {
    const result = requestSchema.safeParse({
      projectCode: 'PRJ-001',
      totalFee: 0,
      analysisWipDate: '2026-06-10',
      analysisCompletedDate: '2026-06-20',
    });
    expect(result.success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('rejects empty username', () => {
    const result = loginSchema.safeParse({ user: '', password: 'pass' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ user: 'admin', password: '' });
    expect(result.success).toBe(false);
  });

  it('validates valid login', () => {
    const result = loginSchema.safeParse({ user: 'assessment.it', password: 'secret' });
    expect(result.success).toBe(true);
  });
});

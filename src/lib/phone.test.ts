import { describe, expect, it } from 'vitest';
import { normalizePhoneNumber } from './phone.ts';

describe('normalizePhoneNumber', () => {
  it('normalizes a Pakistani local number to E.164', () => {
    expect(normalizePhoneNumber('PK', '03001234567')).toBe('+923001234567');
  });

  it('accepts a Pakistani number without the trunk prefix', () => {
    expect(normalizePhoneNumber('PK', '300 1234567')).toBe('+923001234567');
  });

  it('rejects numbers that do not match the selected country', () => {
    expect(normalizePhoneNumber('PK', '+14155552671')).toBeNull();
  });
});

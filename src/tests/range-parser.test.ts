import { describe, it, expect } from 'vitest';
import {
  parsePageRange,
  getAllPagesRange,
  getOddPagesRange,
  getEvenPagesRange,
  reversePages,
} from '../scripts/range-parser';

describe('Page Range Parser & Validator', () => {
  it('parses empty or whitespace input cleanly', () => {
    const res1 = parsePageRange('');
    expect(res1.isValid).toBe(true);
    expect(res1.pages).toEqual([]);
    expect(res1.totalOutputCount).toBe(0);

    const res2 = parsePageRange('   \n\t  ');
    expect(res2.isValid).toBe(true);
    expect(res2.pages).toEqual([]);
  });

  it('parses single pages correctly', () => {
    const res = parsePageRange('5', 10);
    expect(res.isValid).toBe(true);
    expect(res.pages).toEqual([5]);
    expect(res.totalOutputCount).toBe(1);
    expect(res.duplicatePages).toEqual([]);
  });

  it('parses forward ranges correctly', () => {
    const res = parsePageRange('1-4', 10);
    expect(res.isValid).toBe(true);
    expect(res.pages).toEqual([1, 2, 3, 4]);
    expect(res.totalOutputCount).toBe(4);
  });

  it('parses reverse ranges (e.g. 4-2) correctly', () => {
    const res = parsePageRange('4-2', 10);
    expect(res.isValid).toBe(true);
    expect(res.pages).toEqual([4, 3, 2]);
    expect(res.totalOutputCount).toBe(3);
  });

  it('parses mixed delimiters: commas, semicolons, whitespace', () => {
    const res = parsePageRange('1-2, 5; 7  9-10', 10);
    expect(res.isValid).toBe(true);
    expect(res.pages).toEqual([1, 2, 5, 7, 9, 10]);
  });

  it('handles repeated/duplicate pages in custom order', () => {
    const res = parsePageRange('5, 1-3, 2, 5', 10);
    expect(res.isValid).toBe(true);
    expect(res.pages).toEqual([5, 1, 2, 3, 2, 5]);
    expect(res.totalOutputCount).toBe(6);
    expect(res.uniqueCount).toBe(4);
    expect(res.duplicatePages).toContain(2);
    expect(res.duplicatePages).toContain(5);
  });

  it('flags errors for out-of-bounds pages', () => {
    const res = parsePageRange('1-5, 15', 10);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Page 15 exceeds total document pages (10)');
    expect(res.pages).toEqual([]);
  });

  it('flags errors for range start or end exceeding total pages', () => {
    const res1 = parsePageRange('1-12', 10);
    expect(res1.isValid).toBe(false);
    expect(res1.error).toContain('Page 12 exceeds total document pages (10)');

    const res2 = parsePageRange('12-5', 10);
    expect(res2.isValid).toBe(false);
    expect(res2.error).toContain('Page 12 exceeds total document pages (10)');
  });

  it('flags errors for zero or negative pages', () => {
    const res1 = parsePageRange('0', 10);
    expect(res1.isValid).toBe(false);
    expect(res1.error).toContain('must be 1 or greater');

    const res2 = parsePageRange('0-5', 10);
    expect(res2.isValid).toBe(false);
    expect(res2.error).toContain('must be 1 or greater');
  });

  it('flags errors for malformed tokens', () => {
    const res1 = parsePageRange('1--4', 10);
    expect(res1.isValid).toBe(false);
    expect(res1.error).toContain('Malformed range token');

    const res2 = parsePageRange('abc', 10);
    expect(res2.isValid).toBe(false);
    expect(res2.error).toContain('Invalid page token');

    const res3 = parsePageRange('1-', 10);
    expect(res3.isValid).toBe(false);
    expect(res3.error).toContain('Invalid characters in range token');
  });

  it('generates preset ranges correctly', () => {
    expect(getAllPagesRange(5)).toBe('1-5');
    expect(getAllPagesRange(1)).toBe('1');
    expect(getOddPagesRange(5)).toBe('1, 3, 5');
    expect(getEvenPagesRange(5)).toBe('2, 4');
    expect(reversePages([1, 2, 3, 5])).toBe('5, 3, 2, 1');
  });
});

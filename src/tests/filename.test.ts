import { describe, it, expect } from 'vitest';
import { generateOutputFilename, sanitizeFilename, formatBytes } from '../scripts/file-system';

describe('Filename and Suffix Logic', () => {
  it('appends default suffix _extracted before the .pdf extension', () => {
    expect(generateOutputFilename('report.pdf')).toBe('report_extracted.pdf');
    expect(generateOutputFilename('Annual_Review.pdf')).toBe('Annual_Review_extracted.pdf');
  });

  it('handles custom suffix editing', () => {
    expect(generateOutputFilename('document.pdf', '_cut')).toBe('document_cut.pdf');
    expect(generateOutputFilename('document.pdf', '_pages_1_to_3')).toBe('document_pages_1_to_3.pdf');
    expect(generateOutputFilename('document.pdf', '')).toBe('document.pdf');
  });

  it('correctly handles filenames with multiple dots', () => {
    expect(generateOutputFilename('my.archive.2026.final.pdf', '_selected')).toBe('my.archive.2026.final_selected.pdf');
    expect(generateOutputFilename('v1.0.0.pdf', '_part2')).toBe('v1.0.0_part2.pdf');
  });

  it('sanitizes illegal filesystem characters', () => {
    expect(sanitizeFilename('my:report*name?test.pdf')).toBe('my_report_name_test.pdf');
    expect(generateOutputFilename('bad/name\\test.pdf', '_extracted')).toBe('bad_name_test_extracted.pdf');
  });

  it('formats bytes into human readable sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576 * 2.5)).toBe('2.5 MB');
  });
});

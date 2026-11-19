/**
 * Range Parser & Validator for PDF Page Extraction
 * Supports:
 * - Single pages: "5"
 * - Forward ranges: "1-5"
 * - Reverse ranges: "5-1"
 * - Mixed delimiters: commas, semicolons, spaces ("1-3, 5; 7 9-10")
 * - Repeated / duplicate pages: "1, 2, 1, 3, 2"
 * - Arbitrary order: "5, 1-3, 2, 8-10, 5"
 */

export interface ParseResult {
  isValid: boolean;
  pages: number[];
  error?: string;
  duplicatePages: number[];
  uniqueCount: number;
  totalOutputCount: number;
}

/**
 * Parses a page range string and validates against total pages in the source PDF.
 * @param input Raw range input string from user
 * @param totalPages Total number of pages in the source PDF (optional, for boundary checking)
 */
export function parsePageRange(input: string, totalPages?: number): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      isValid: true,
      pages: [],
      duplicatePages: [],
      uniqueCount: 0,
      totalOutputCount: 0,
    };
  }

  // Split tokens by commas, semicolons, or whitespace (treating contiguous separators cleanly)
  const rawTokens = trimmed.split(/[,;\s]+/).filter((token) => token.length > 0);
  const pages: number[] = [];

  for (const token of rawTokens) {
    // Check if token is a range (e.g., "1-5" or "5-1")
    if (token.includes('-')) {
      const parts = token.split('-');
      if (parts.length !== 2) {
        return {
          isValid: false,
          pages: [],
          error: `Malformed range token "${token}". Use format "start-end" (e.g. 1-5).`,
          duplicatePages: [],
          uniqueCount: 0,
          totalOutputCount: 0,
        };
      }

      const [startStr, endStr] = parts;
      if (!/^\d+$/.test(startStr) || !/^\d+$/.test(endStr)) {
        return {
          isValid: false,
          pages: [],
          error: `Invalid characters in range token "${token}". Page numbers must be integers.`,
          duplicatePages: [],
          uniqueCount: 0,
          totalOutputCount: 0,
        };
      }

      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (start <= 0 || end <= 0) {
        return {
          isValid: false,
          pages: [],
          error: `Page numbers must be 1 or greater in "${token}".`,
          duplicatePages: [],
          uniqueCount: 0,
          totalOutputCount: 0,
        };
      }

      if (totalPages !== undefined) {
        if (start > totalPages) {
          return {
            isValid: false,
            pages: [],
            error: `Page ${start} exceeds total document pages (${totalPages}).`,
            duplicatePages: [],
            uniqueCount: 0,
            totalOutputCount: 0,
          };
        }
        if (end > totalPages) {
          return {
            isValid: false,
            pages: [],
            error: `Page ${end} exceeds total document pages (${totalPages}).`,
            duplicatePages: [],
            uniqueCount: 0,
            totalOutputCount: 0,
          };
        }
      }

      if (start <= end) {
        for (let p = start; p <= end; p++) {
          pages.push(p);
        }
      } else {
        // Reverse range e.g. 5-3 -> [5, 4, 3]
        for (let p = start; p >= end; p--) {
          pages.push(p);
        }
      }
    } else {
      // Single page token
      if (!/^\d+$/.test(token)) {
        return {
          isValid: false,
          pages: [],
          error: `Invalid page token "${token}". Page numbers must be positive integers.`,
          duplicatePages: [],
          uniqueCount: 0,
          totalOutputCount: 0,
        };
      }

      const pageNum = parseInt(token, 10);
      if (pageNum <= 0) {
        return {
          isValid: false,
          pages: [],
          error: `Page numbers must be 1 or greater (got ${pageNum}).`,
          duplicatePages: [],
          uniqueCount: 0,
          totalOutputCount: 0,
        };
      }

      if (totalPages !== undefined && pageNum > totalPages) {
        return {
          isValid: false,
          pages: [],
          error: `Page ${pageNum} exceeds total document pages (${totalPages}).`,
          duplicatePages: [],
          uniqueCount: 0,
          totalOutputCount: 0,
        };
      }

      pages.push(pageNum);
    }
  }

  // Calculate duplicates
  const seen = new Set<number>();
  const duplicates = new Set<number>();
  for (const p of pages) {
    if (seen.has(p)) {
      duplicates.add(p);
    } else {
      seen.add(p);
    }
  }

  return {
    isValid: true,
    pages,
    duplicatePages: Array.from(duplicates),
    uniqueCount: seen.size,
    totalOutputCount: pages.length,
  };
}

/**
 * Generate range string for all pages: 1-N
 */
export function getAllPagesRange(totalPages: number): string {
  if (totalPages <= 0) return '';
  return totalPages === 1 ? '1' : `1-${totalPages}`;
}

/**
 * Generate range string for odd pages: 1, 3, 5...
 */
export function getOddPagesRange(totalPages: number): string {
  const odds: number[] = [];
  for (let i = 1; i <= totalPages; i += 2) {
    odds.push(i);
  }
  return odds.join(', ');
}

/**
 * Generate range string for even pages: 2, 4, 6...
 */
export function getEvenPagesRange(totalPages: number): string {
  const evens: number[] = [];
  for (let i = 2; i <= totalPages; i += 2) {
    evens.push(i);
  }
  return evens.join(', ');
}

/**
 * Reverse the current pages list and format as range string
 */
export function reversePages(currentPages: number[]): string {
  return [...currentPages].reverse().join(', ');
}

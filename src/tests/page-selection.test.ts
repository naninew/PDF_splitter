import { describe, it, expect } from 'vitest';
import {
  addRangePages,
  incrementPageCount,
  decrementPageCount,
  togglePageSelection,
  reorderPage,
  removePageAtIndex,
  getAllPagesList,
  getOddPagesList,
  getEvenPagesList,
  invertPagesList,
} from '../scripts/page-selection';

describe('Page Selection Logic (UI-driven)', () => {
  it('adds a range of pages correctly', () => {
    const res = addRangePages([1], 3, 5, 10);
    expect(res).toEqual([1, 3, 4, 5]);

    const rev = addRangePages([], 5, 3, 10);
    expect(rev).toEqual([5, 4, 3]);
  });

  it('increments page count (duplicates page)', () => {
    const res1 = incrementPageCount([2, 3], 2);
    expect(res1).toEqual([2, 3, 2]);

    const res2 = incrementPageCount(res1, 2);
    expect(res2).toEqual([2, 3, 2, 2]);
  });

  it('decrements page count and removes when 0', () => {
    const list = [2, 3, 2];
    const dec1 = decrementPageCount(list, 2);
    expect(dec1).toEqual([2, 3]);

    const dec2 = decrementPageCount(dec1, 2);
    expect(dec2).toEqual([3]);

    const dec3 = decrementPageCount(dec2, 2);
    expect(dec3).toEqual([3]);
  });

  it('toggles page selection cleanly', () => {
    const empty: number[] = [];
    const t1 = togglePageSelection(empty, 5);
    expect(t1).toEqual([5]);

    const t2 = togglePageSelection(t1, 5);
    expect(t2).toEqual([]);
  });

  it('reorders pages in sequence (left and right)', () => {
    const initial = [1, 2, 3, 4];
    const movedLeft = reorderPage(initial, 2, 'left'); // page 3 moves left
    expect(movedLeft).toEqual([1, 3, 2, 4]);

    const movedRight = reorderPage(movedLeft, 1, 'right'); // page 3 moves right
    expect(movedRight).toEqual([1, 2, 3, 4]);

    // Boundary checks
    expect(reorderPage(initial, 0, 'left')).toEqual(initial);
    expect(reorderPage(initial, 3, 'right')).toEqual(initial);
  });

  it('removes page at specific index', () => {
    const initial = [10, 20, 30, 20];
    const removed = removePageAtIndex(initial, 1);
    expect(removed).toEqual([10, 30, 20]);
  });

  it('handles presets: all, odd, even, invert', () => {
    expect(getAllPagesList(5)).toEqual([1, 2, 3, 4, 5]);
    expect(getOddPagesList(5)).toEqual([1, 3, 5]);
    expect(getEvenPagesList(5)).toEqual([2, 4]);
    expect(invertPagesList([2, 4], 5)).toEqual([1, 3, 5]);
  });
});

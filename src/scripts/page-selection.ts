/**
 * Visual Page Selection & Queue Operations (100% UI-driven)
 */

/**
 * Appends a range of pages (start to end inclusive) to the current list
 */
export function addRangePages(current: number[], start: number, end: number, totalPages: number): number[] {
  const result = [...current];
  const s = Math.max(1, Math.min(start, totalPages));
  const e = Math.max(1, Math.min(end, totalPages));

  if (s <= e) {
    for (let p = s; p <= e; p++) {
      result.push(p);
    }
  } else {
    for (let p = s; p >= e; p--) {
      result.push(p);
    }
  }
  return result;
}

/**
 * Increments the occurrence count of a page by appending another copy
 */
export function incrementPageCount(current: number[], pageNum: number): number[] {
  return [...current, pageNum];
}

/**
 * Decrements the occurrence count of a page by removing its last occurrence.
 * If only 1 occurrence existed, it is completely removed.
 */
export function decrementPageCount(current: number[], pageNum: number): number[] {
  const lastIndex = current.lastIndexOf(pageNum);
  if (lastIndex === -1) return current;

  const result = [...current];
  result.splice(lastIndex, 1);
  return result;
}

/**
 * Toggles a page: if not in list, adds it; if in list, removes all occurrences of it.
 */
export function togglePageSelection(current: number[], pageNum: number): number[] {
  if (current.includes(pageNum)) {
    return current.filter((p) => p !== pageNum);
  } else {
    return [...current, pageNum];
  }
}

/**
 * Moves a page item in the sequence left or right
 */
export function reorderPage(current: number[], index: number, direction: 'left' | 'right'): number[] {
  if (direction === 'left' && index > 0) {
    const result = [...current];
    const temp = result[index];
    result[index] = result[index - 1];
    result[index - 1] = temp;
    return result;
  }
  if (direction === 'right' && index < current.length - 1) {
    const result = [...current];
    const temp = result[index];
    result[index] = result[index + 1];
    result[index + 1] = temp;
    return result;
  }
  return current;
}

/**
 * Removes a page item at a specific queue index
 */
export function removePageAtIndex(current: number[], index: number): number[] {
  if (index < 0 || index >= current.length) return current;
  const result = [...current];
  result.splice(index, 1);
  return result;
}

/**
 * Returns array of all pages [1..totalPages]
 */
export function getAllPagesList(totalPages: number): number[] {
  const result: number[] = [];
  for (let p = 1; p <= totalPages; p++) {
    result.push(p);
  }
  return result;
}

/**
 * Returns odd pages [1, 3, 5...]
 */
export function getOddPagesList(totalPages: number): number[] {
  const result: number[] = [];
  for (let p = 1; p <= totalPages; p += 2) {
    result.push(p);
  }
  return result;
}

/**
 * Returns even pages [2, 4, 6...]
 */
export function getEvenPagesList(totalPages: number): number[] {
  const result: number[] = [];
  for (let p = 2; p <= totalPages; p += 2) {
    result.push(p);
  }
  return result;
}

/**
 * Inverts selection: pages not in current selection become selected,
 * and currently selected pages are removed.
 */
export function invertPagesList(current: number[], totalPages: number): number[] {
  const selectedSet = new Set(current);
  const result: number[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (!selectedSet.has(p)) {
      result.push(p);
    }
  }
  return result;
}

export function isStrictTabPermutation(
  nextOrder: readonly string[],
  currentOrder: readonly string[],
): boolean {
  if (nextOrder.length !== currentOrder.length) {
    return false;
  }

  const currentSet = new Set(currentOrder);
  const nextSet = new Set(nextOrder);
  return (
    currentSet.size === currentOrder.length &&
    nextSet.size === nextOrder.length &&
    nextSet.size === currentSet.size &&
    nextOrder.every((path) => currentSet.has(path))
  );
}

export function applyStrictTabPermutation<T extends { openTabs: string[] }>(
  current: T,
  nextOrder: readonly string[],
): T {
  return isStrictTabPermutation(nextOrder, current.openTabs)
    ? { ...current, openTabs: [...nextOrder] }
    : current;
}

export function reorderTabPathsAtTarget(
  tabs: readonly string[],
  sourcePath: string,
  targetPath: string,
): string[] {
  const sourceIndex = tabs.indexOf(sourcePath);
  const targetIndex = tabs.indexOf(targetPath);
  if (sourceIndex < 0 || targetIndex < 0 || sourcePath === targetPath) {
    return [...tabs];
  }

  const nextOrder = [...tabs];
  nextOrder.splice(sourceIndex, 1);
  const insertionIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  nextOrder.splice(insertionIndex, 0, sourcePath);
  return nextOrder;
}

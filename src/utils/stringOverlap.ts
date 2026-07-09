/**
 * 线性时间求「existing 的后缀 = incoming 的前缀」的最长重叠长度（KMP 前缀函数）。
 * 与逐字符递减 endsWith 的朴素实现语义等价，但把 O(n·m) 降为 O(n+m)，
 * 避免长流式文本（assistant/reasoning/tool output）在每次 delta flush 时
 * 产生随文本增长的同步卡顿。
 */
export function longestSuffixPrefixOverlap(existing: string, incoming: string) {
  const maxOverlap = Math.min(existing.length, incoming.length);
  if (maxOverlap === 0) {
    return 0;
  }
  const pattern =
    incoming.length > maxOverlap ? incoming.slice(0, maxOverlap) : incoming;
  const text =
    existing.length > maxOverlap ? existing.slice(-maxOverlap) : existing;
  const combined = `${pattern}\u0000${text}`;
  const prefixTable = new Int32Array(combined.length);
  for (let index = 1; index < combined.length; index += 1) {
    let candidate = prefixTable[index - 1] ?? 0;
    while (candidate > 0 && combined[index] !== combined[candidate]) {
      candidate = prefixTable[candidate - 1] ?? 0;
    }
    if (combined[index] === combined[candidate]) {
      candidate += 1;
    }
    prefixTable[index] = candidate;
  }
  return prefixTable[combined.length - 1] ?? 0;
}

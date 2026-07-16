export type CompactDisplayMathNormalizationResult = {
  value: string;
  hasUnresolvedCandidate: boolean;
};

function parseCompactDisplayLinePrefix(line: string) {
  const match = /^((?:[ \t]*>[ \t]*)*[ \t]*)(.*)$/.exec(line);
  return {
    prefix: match?.[1] ?? "",
    content: match?.[2] ?? line,
  };
}

function isUnescapedCharacter(value: string, index: number) {
  let backslashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) {
    backslashCount += 1;
  }
  return backslashCount % 2 === 0;
}

function findUnescapedDoubleDollar(value: string, startIndex = 0) {
  for (let index = startIndex; index < value.length - 1; index += 1) {
    if (
      value[index] === "$" &&
      value[index + 1] === "$" &&
      isUnescapedCharacter(value, index)
    ) {
      return index;
    }
  }
  return -1;
}

function looksLikeLatexExpression(value: string) {
  const trimmed = value.trim();
  return Boolean(trimmed && (/\\[A-Za-z]+/.test(trimmed) || /[_^]/.test(trimmed)));
}

function hasSafeTrailingBoundary(value: string) {
  if (!value) {
    return true;
  }
  return /[\s\u3400-\u9fff)\]}>"'”’、，。！？；：,:;!?]/u.test(value[0] ?? "");
}

export function normalizeCompactMultiLineDisplayMath(
  value: string,
): CompactDisplayMathNormalizationResult {
  if (!value.includes("$$") || !value.includes("\n")) {
    return { value, hasUnresolvedCandidate: false };
  }

  const lines = value.split(/\r?\n/);
  let changed = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const openingLine = parseCompactDisplayLinePrefix(lines[lineIndex] ?? "");
    if (!openingLine.content.startsWith("$$")) {
      continue;
    }
    const openingBody = openingLine.content.slice(2).trim();
    if (
      !openingBody ||
      findUnescapedDoubleDollar(openingLine.content, 2) >= 0 ||
      !looksLikeLatexExpression(openingBody)
    ) {
      continue;
    }

    let closingLineIndex = -1;
    let closingBody = "";
    let trailingProse = "";
    for (
      let candidateIndex = lineIndex + 1;
      candidateIndex < lines.length;
      candidateIndex += 1
    ) {
      const candidateLine = parseCompactDisplayLinePrefix(lines[candidateIndex] ?? "");
      if (
        candidateLine.content.startsWith("$$") &&
        findUnescapedDoubleDollar(candidateLine.content, 2) < 0
      ) {
        return { value, hasUnresolvedCandidate: true };
      }
      const delimiterIndex = findUnescapedDoubleDollar(candidateLine.content);
      if (delimiterIndex < 0) {
        continue;
      }
      if (candidateLine.prefix !== openingLine.prefix) {
        return { value, hasUnresolvedCandidate: true };
      }
      closingBody = candidateLine.content.slice(0, delimiterIndex).trimEnd();
      const rawTrailingProse = candidateLine.content.slice(delimiterIndex + 2);
      if (!closingBody || !hasSafeTrailingBoundary(rawTrailingProse)) {
        return { value, hasUnresolvedCandidate: true };
      }
      trailingProse = rawTrailingProse.trimStart();
      const expression = [
        openingBody,
        ...lines.slice(lineIndex + 1, candidateIndex),
        closingBody,
      ].join("\n");
      if (!looksLikeLatexExpression(expression)) {
        return { value, hasUnresolvedCandidate: true };
      }
      closingLineIndex = candidateIndex;
      break;
    }

    if (closingLineIndex < 0) {
      return { value, hasUnresolvedCandidate: true };
    }

    const replacement = [
      `${openingLine.prefix}$$`,
      `${openingLine.prefix}${openingBody}`,
      ...lines.slice(lineIndex + 1, closingLineIndex),
      `${openingLine.prefix}${closingBody}`,
      `${openingLine.prefix}$$`,
    ];
    if (trailingProse) {
      replacement.push(`${openingLine.prefix}${trailingProse}`);
    }
    lines.splice(lineIndex, closingLineIndex - lineIndex + 1, ...replacement);
    changed = true;
    lineIndex += replacement.length - 1;
  }

  return {
    value: changed ? lines.join("\n") : value,
    hasUnresolvedCandidate: false,
  };
}

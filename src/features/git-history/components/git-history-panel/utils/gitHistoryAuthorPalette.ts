const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export const GIT_HISTORY_AUTHOR_PALETTE_SIZE = 8;

function normalizeAuthorIdentity(
  authorEmail: string | null | undefined,
  author: string | null | undefined,
): string {
  return (authorEmail?.trim() || author?.trim() || "").toLowerCase();
}

export function getGitHistoryAuthorColorSlot(
  authorEmail: string | null | undefined,
  author: string | null | undefined,
): number {
  const authorIdentity = normalizeAuthorIdentity(authorEmail, author);
  if (!authorIdentity) {
    return 0;
  }

  let authorHash = FNV_OFFSET_BASIS;
  for (let index = 0; index < authorIdentity.length; index += 1) {
    authorHash ^= authorIdentity.charCodeAt(index);
    authorHash = Math.imul(authorHash, FNV_PRIME);
  }
  return (authorHash >>> 0) % GIT_HISTORY_AUTHOR_PALETTE_SIZE;
}

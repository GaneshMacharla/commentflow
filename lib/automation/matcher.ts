import { MatchMode, MatchType, MatchResult } from './types';

/**
 * Checks if a single keyword matches the comment text according to the match type.
 * Always case-insensitive.
 */
export function checkSingleKeyword(
  comment: string,
  keyword: string,
  matchType: MatchType
): boolean {
  const normComment = comment.trim().toLowerCase();
  const normKeyword = keyword.trim().toLowerCase();

  if (!normKeyword) return false;

  switch (matchType) {
    case 'EXACT':
      return normComment === normKeyword;
    case 'CONTAINS':
      return normComment.includes(normKeyword);
    case 'STARTS_WITH':
      return normComment.startsWith(normKeyword);
    case 'ENDS_WITH':
      return normComment.endsWith(normKeyword);
    default:
      return false;
  }
}

/**
 * Evaluates comment text against a list of keywords and matching configuration.
 */
export function matchComment(
  commentText: string,
  keywords: string[],
  matchType: MatchType = 'CONTAINS',
  matchMode: MatchMode = 'ANY'
): MatchResult {
  if (!commentText || !keywords || keywords.length === 0) {
    return { matched: false, matchedKeywords: [] };
  }

  const matchedKeywords: string[] = [];

  for (const kw of keywords) {
    if (checkSingleKeyword(commentText, kw, matchType)) {
      matchedKeywords.push(kw);
    }
  }

  if (matchMode === 'ALL') {
    const matched = matchedKeywords.length === keywords.length && keywords.length > 0;
    return { matched, matchedKeywords: matched ? matchedKeywords : [] };
  } else {
    // Default: ANY
    const matched = matchedKeywords.length > 0;
    return { matched, matchedKeywords };
  }
}

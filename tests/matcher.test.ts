import { describe, it, expect } from 'vitest';
import { matchComment, checkSingleKeyword } from '../lib/automation/matcher';

describe('Automation Keyword Matcher', () => {
  it('should match case-insensitively (Rule: AI, ai, Ai, aI match)', () => {
    expect(checkSingleKeyword('I love AI', 'ai', 'CONTAINS')).toBe(true);
    expect(checkSingleKeyword('Ai is awesome', 'AI', 'CONTAINS')).toBe(true);
    expect(checkSingleKeyword('aI tools', 'Ai', 'CONTAINS')).toBe(true);
  });

  it('should support Rule 1: CONTAINS', () => {
    const result = matchComment('I want the AI roadmap please', ['AI'], 'CONTAINS', 'ANY');
    expect(result.matched).toBe(true);
    expect(result.matchedKeywords).toContain('AI');
  });

  it('should support Rule 2: EXACT', () => {
    const exactMatch = matchComment('AI', ['AI'], 'EXACT', 'ANY');
    expect(exactMatch.matched).toBe(true);

    const nonExactMatch = matchComment('I want AI', ['AI'], 'EXACT', 'ANY');
    expect(nonExactMatch.matched).toBe(false);
  });

  it('should support STARTS_WITH and ENDS_WITH', () => {
    expect(checkSingleKeyword('AI roadmap now', 'AI', 'STARTS_WITH')).toBe(true);
    expect(checkSingleKeyword('Roadmap for AI', 'AI', 'STARTS_WITH')).toBe(false);

    expect(checkSingleKeyword('Give me the roadmap', 'roadmap', 'ENDS_WITH')).toBe(true);
    expect(checkSingleKeyword('roadmap please', 'roadmap', 'ENDS_WITH')).toBe(false);
  });

  it('should support Rule 3: Multiple keywords with ANY mode', () => {
    const keywords = ['AI', 'ROADMAP', 'GUIDE'];
    const matchOne = matchComment('Here is my GUIDE', keywords, 'CONTAINS', 'ANY');
    expect(matchOne.matched).toBe(true);
    expect(matchOne.matchedKeywords).toEqual(['GUIDE']);

    const matchNone = matchComment('Just a random comment', keywords, 'CONTAINS', 'ANY');
    expect(matchNone.matched).toBe(false);
  });

  it('should support Multiple keywords with ALL mode', () => {
    const keywords = ['AI', 'ROADMAP'];
    const matchBoth = matchComment('I need the AI ROADMAP', keywords, 'CONTAINS', 'ALL');
    expect(matchBoth.matched).toBe(true);
    expect(matchBoth.matchedKeywords.length).toBe(2);

    const matchOnlyOne = matchComment('I only want AI', keywords, 'CONTAINS', 'ALL');
    expect(matchOnlyOne.matched).toBe(false);
  });

  it('should support Wildcard * (Any Comment) matching', () => {
    const result1 = matchComment('Great post bro!', ['*'], 'CONTAINS', 'ANY');
    expect(result1.matched).toBe(true);

    const result2 = matchComment('any text here 🚀', ['*'], 'CONTAINS', 'ANY');
    expect(result2.matched).toBe(true);

    const resultEmpty = matchComment('', ['*'], 'CONTAINS', 'ANY');
    expect(resultEmpty.matched).toBe(false);
  });
});

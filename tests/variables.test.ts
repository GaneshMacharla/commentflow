import { describe, it, expect } from 'vitest';
import { interpolateVariables, findUnsupportedVariables } from '../lib/automation/variables';

describe('Variable Interpolation', () => {
  it('should interpolate {{username}}, {{comment}}, and {{post_url}}', () => {
    const template = 'Hey @{{username}}! You commented "{{comment}}". View post: {{post_url}}';
    const context = {
      username: 'johndoe',
      comment: 'AI',
      post_url: 'https://instagram.com/p/12345',
    };

    const result = interpolateVariables(template, context);
    expect(result).toBe('Hey @johndoe! You commented "AI". View post: https://instagram.com/p/12345');
  });

  it('should handle whitespace inside double braces', () => {
    const template = 'Hello {{  username  }} 👋';
    const result = interpolateVariables(template, { username: 'creator', comment: '' });
    expect(result).toBe('Hello creator 👋');
  });

  it('should detect unsupported variables', () => {
    const template = 'Hey {{username}}, your email is {{email}} and phone is {{phone}}';
    const unsupported = findUnsupportedVariables(template);
    expect(unsupported).toEqual(['{{email}}', '{{phone}}']);
  });
});

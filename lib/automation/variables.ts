export interface VariableContext {
  username: string;
  comment: string;
  post_url?: string;
}

const SUPPORTED_VARIABLES = ['{{username}}', '{{comment}}', '{{post_url}}'] as const;

/**
 * Interpolates supported template variables in response messages.
 * Only replaces variables officially provided by the Instagram API context.
 */
export function interpolateVariables(template: string, context: VariableContext): string {
  if (!template) return '';

  return template
    .replace(/\{\{\s*username\s*\}\}/gi, context.username || '')
    .replace(/\{\{\s*comment\s*\}\}/gi, context.comment || '')
    .replace(/\{\{\s*post_url\s*\}\}/gi, context.post_url || '');
}

/**
 * Extracts and returns any unsupported variables found in a template string.
 */
export function findUnsupportedVariables(template: string): string[] {
  const matches = template.match(/\{\{([^{}]+)\}\}/g) || [];
  const unsupported: string[] = [];

  for (const match of matches) {
    const clean = match.toLowerCase().replace(/\s+/g, '');
    if (!['{{username}}', '{{comment}}', '{{post_url}}'].includes(clean)) {
      unsupported.push(match);
    }
  }

  return unsupported;
}

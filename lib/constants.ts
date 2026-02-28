/**
 * Built-in system tag names available in all environments.
 * These are inserted via a database migration and used as category filters.
 */
export const SYSTEM_TAG_NAMES = [
  'ai',
  'devops',
  'frontend',
  'backend',
  'security',
  'testing',
  'database',
  'cloud',
  'mobile',
  'data-science',
  'java',
  '.net',
  'nodejs',
  'web-development',
  'documentation',
  'python',
  'go',
  'rust',
] as const;

export type SystemTagName = (typeof SYSTEM_TAG_NAMES)[number];

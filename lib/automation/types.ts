export type MatchType = 'CONTAINS' | 'EXACT' | 'STARTS_WITH' | 'ENDS_WITH';
export type MatchMode = 'ANY' | 'ALL';
export type ActionType = 'PUBLIC_REPLY' | 'PRIVATE_MESSAGE';
export type AutomationStatus = 'ACTIVE' | 'PAUSED' | 'ERROR';
export type EventStatus = 'SENT' | 'SIMULATED_SENT' | 'FAILED' | 'SKIPPED';

export interface Trigger {
  id: string;
  automationId: string;
  keyword: string;
}

export interface Action {
  id: string;
  automationId: string;
  actionType: ActionType;
  message: string;
}

export interface Automation {
  id: string;
  userId: string;
  instagramAccountId: string;
  mediaId: string | null; // null means all posts & reels
  media?: {
    id: string;
    instagramMediaId?: string;
    caption?: string;
    thumbnailUrl?: string;
    mediaType?: string;
    permalink?: string;
  } | null;
  name: string;
  status: AutomationStatus;
  matchType: MatchType;
  matchMode: MatchMode;
  errorReason?: string | null;
  triggers: Trigger[];
  actions: Action[];
  createdAt: string;
  updatedAt: string;
}

export interface NormalizedCommentEvent {
  eventId: string; // Used for idempotency (e.g. comment_id)
  commentId: string;
  mediaId: string;
  instagramAccountId: string;
  commenterUsername: string;
  commenterId: string;
  commentText: string;
  permalink?: string;
  parentId?: string;
  mediaProductType?: string;
  timestamp?: string;
}

export interface MatchResult {
  matched: boolean;
  matchedKeywords: string[];
}

export interface ActionExecutionResult {
  type: ActionType;
  message: string;
  success: boolean;
  error?: string;
}

export interface ProcessEventResult {
  eventId: string;
  automationId?: string;
  matched: boolean;
  status: EventStatus;
  results: ActionExecutionResult[];
  error?: string;
}

// ─── Roles ──────────────────────────────────────────────────
const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER',
};

// ─── Task Status ─────────────────────────────────────────────
const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  BLOCKED: 'BLOCKED',
};

// ─── Task Priority ───────────────────────────────────────────
const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
};

// ─── Status Transition Map ────────────────────────────────────
// Server-side enforced — only these transitions are allowed
const ALLOWED_TRANSITIONS = {
  TODO:        ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['IN_REVIEW',   'BLOCKED'],
  IN_REVIEW:   ['DONE',        'BLOCKED'],
  DONE:        [],                              // Terminal — no exit
  BLOCKED:     ['TODO', 'IN_PROGRESS', 'IN_REVIEW'],
};

// ─── Standardised Error Codes ────────────────────────────────
const ERROR_CODES = {
  VALIDATION_ERROR:   'VALIDATION_ERROR',
  AUTH_ERROR:         'AUTHENTICATION_ERROR',
  FORBIDDEN:          'AUTHORIZATION_ERROR',
  NOT_FOUND:          'NOT_FOUND',
  CONFLICT:           'CONFLICT',
  INVALID_TRANSITION: 'INVALID_STATUS_TRANSITION',
  INTERNAL:           'INTERNAL_SERVER_ERROR',
};

module.exports = {
  ROLES,
  TASK_STATUS,
  TASK_PRIORITY,
  ALLOWED_TRANSITIONS,
  ERROR_CODES,
};

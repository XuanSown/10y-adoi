export const ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  UNAUTHORIZED: "UNAUTHORIZED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  ALREADY_VOTED: "ALREADY_VOTED",
  VOTING_NOT_OPEN: "VOTING_NOT_OPEN",
  VOTING_CLOSED: "VOTING_CLOSED",
  RATE_LIMITED: "RATE_LIMITED",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

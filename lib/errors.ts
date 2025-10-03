export type AppErrorType =
  | 'StorageQuotaError'
  | 'PermissionError'
  | 'NetworkError'
  | 'NotFoundError'
  | 'ValidationError'
  | 'UnknownError';

export class AppError extends Error {
  constructor(
    public kind: AppErrorType,
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = kind;
  }
}

export const mapBrowserError = (e: any): AppError => {
  const msg = typeof e?.message === 'string' ? e.message : String(e);
  if (/QUOTA_EXCEEDED_ERR|quota|exceed/i.test(msg))
    return new AppError('StorageQuotaError', msg, e);
  if (/permission|denied|forbidden/i.test(msg)) return new AppError('PermissionError', msg, e);
  if (/network|fetch|timeout/i.test(msg)) return new AppError('NetworkError', msg, e);
  if (/not found|missing/i.test(msg)) return new AppError('NotFoundError', msg, e);
  if (/invalid|validation/i.test(msg)) return new AppError('ValidationError', msg, e);
  return new AppError('UnknownError', msg, e);
};

export const userMessageForError = (err: AppError): string => {
  switch (err.kind) {
    case 'StorageQuotaError':
      return 'Storage is nearly full. Open Settings > Data Management to remove old items.';
    case 'PermissionError':
      return 'Permission denied. Check extension permissions in your browser settings.';
    case 'NetworkError':
      return 'Network issue. Please try again when you are online.';
    case 'NotFoundError':
      return 'Item not found. It may have been removed.';
    case 'ValidationError':
      return 'Some fields are invalid. Please review your input.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

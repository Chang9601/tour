import { CoreError, CodeAttr } from '@whooatour/common';

export class UnauthorizedReviewDeletionError extends CoreError {
  constructor(
    public readonly code: CodeAttr,
    public readonly detail: string | string[],
    public readonly isOperational: boolean
  ) {
    super(code, detail, isOperational);
  }
}

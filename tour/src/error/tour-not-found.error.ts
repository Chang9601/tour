import { AbstractError, CodeAttr } from '@whooatour/common';

export class TourNotFoundError extends AbstractError {
  constructor(
    public readonly code: CodeAttr,
    public readonly detail: string | string[],
    public readonly isOperational: boolean,
  ) {
    super(code, detail, isOperational);
  }
}

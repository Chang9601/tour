import { AbstractError, CodeAttr } from '@whooatour/common';

export class UserNotFoundError extends AbstractError {
  constructor(
    public readonly codeAttr: CodeAttr,
    public readonly detail: string | string[],
    public readonly isOperational: boolean,
  ) {
    super(codeAttr, detail, isOperational);
  }
}

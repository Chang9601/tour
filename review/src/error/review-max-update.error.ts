import { CoreError, CodeAttribute } from '@whooatour/common';

export class ReviewMaxUpdateError extends CoreError {
  constructor(
    public readonly code: CodeAttribute,
    public readonly detail: string | string[],
  ) {
    super(code, detail);
  }
}

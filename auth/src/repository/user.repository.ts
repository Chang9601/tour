import { CoreRepository } from '@whooatour/common';

import { UserDocument, UserModel } from '../model/user.model';

export class UserRepository extends CoreRepository<UserDocument> {
  constructor(public readonly userModel: UserModel) {
    super(userModel);
  }
}

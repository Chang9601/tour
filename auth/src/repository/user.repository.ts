import { AbstractRepository } from '@whooatour/common';

import { UserDocument, UserModel } from '../model/user.model';

export class UserRepository extends AbstractRepository<UserDocument> {
  constructor(public readonly userModel: UserModel) {
    super(userModel);
  }
}

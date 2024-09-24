import { NextFunction, Request, Response, Router } from 'express';

import {
  CoreController,
  catchAsync,
  JwtPayload,
  JwtUtil,
  CookieUtil,
  OAuth2Util,
  ApiResponse,
  Code,
  OAuth2AuthorizationCodeError,
  OAuth2UserInfo,
  RequestWithUser,
  Nullable,
  OAuth2Provider,
  authenticationMiddleware,
} from '@whooatour/common';
import { JwtBundle } from '@whooatour/common/dist/type/jwt-bundle.type';

import { DuplicateUserError } from '../error/duplicate-user.error';
import { User, UserDocument } from '../model/user.model';
import { redis } from '../redis/redis';
import { UserRepository } from '../repository/user.repository';

export class OAuth2Controller implements CoreController {
  public readonly path = '/api/v1/oauth2';
  public readonly router = Router();
  public readonly repository = new UserRepository(User);

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes = (): void => {
    this.router.get(`${this.path}/authorization/google`, this.signInWithGoogle);
    this.router.get(`${this.path}/code/google`, this.signInWithGoogleRedirect);
    this.router.get(
      `${this.path}/unlink/google`,
      authenticationMiddleware(redis),
      this.unlinkGoogle,
    );

    this.router.get(`${this.path}/authorization/naver`, this.signInWithNaver);
    this.router.get(`${this.path}/code/naver`, this.signInWithNaverRedirect);
    this.router.get(
      `${this.path}/unlink/naver`,
      authenticationMiddleware(redis),
      this.unlinkNaver,
    );
  };

  private signInWithGoogle = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      response.redirect(OAuth2Util.buildGoogleAuthroizationUri());
    },
  );

  private signInWithGoogleRedirect = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const { code, error } = request.query;

      if (error) {
        console.log(error);

        return next(
          new OAuth2AuthorizationCodeError(
            Code.INTERNAL_SERVER_ERROR,
            '구글 로그인 인증에 실패했습니다',
          ),
        );
      }

      const tokens = await OAuth2Util.issueGoogleTokens(code as any);

      const accessToken = tokens.accessToken;
      const refreshToken = tokens.refreshToken;

      const userInfo = await OAuth2Util.getGoogleUserInfo(accessToken);

      const user = await this.processOAuth2SignIn(
        userInfo,
        accessToken,
        refreshToken,
        OAuth2Provider.Google,
      );

      const payload: JwtPayload = { id: user._id };
      const jwt: JwtBundle = JwtUtil.issue(payload, user.email);
      const cookies = CookieUtil.setJwtCookies(
        jwt.accessToken,
        jwt.refreshToken,
      );

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        user,
        '구글 로그인 했습니다.',
      );

      response
        .status(Code.OK.code)
        .setHeader('Set-Cookie', cookies)
        .json(success);
    },
  );

  private signInWithNaver = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      response.redirect(OAuth2Util.buildNaverAuthorizationUri());
    },
  );

  private signInWithNaverRedirect = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const { code, error } = request.query;

      if (error) {
        console.log(error);

        return next(
          new OAuth2AuthorizationCodeError(
            Code.INTERNAL_SERVER_ERROR,
            '네이버 로그인 인증에 실패했습니다',
          ),
        );
      }

      const tokens = await OAuth2Util.issueNaverTokens(code as any);
      const accessToken = tokens.accessToken;
      const refreshToken = tokens.refreshToken;

      const userInfo = await OAuth2Util.getNaverUserInfo(accessToken);

      const user = await this.processOAuth2SignIn(
        userInfo,
        accessToken,
        refreshToken,
        OAuth2Provider.Naver,
      );

      const payload: JwtPayload = { id: user._id };
      const jwt: JwtBundle = JwtUtil.issue(payload, user.email);
      const cookies = CookieUtil.setJwtCookies(
        jwt.accessToken,
        jwt.refreshToken,
      );

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        user,
        '네이버 로그인 했습니다.',
      );

      response
        .status(Code.OK.code)
        .setHeader('Set-Cookie', cookies)
        .json(success);
    },
  );

  private unlinkNaver = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const user = await this.repository.findOne({ _id: request.user!.id });

      await OAuth2Util.unlinkNaver(user.oAuth2AccessToken);

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        null,
        '네이버 로그인 연동을 해제했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private unlinkGoogle = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const user = await this.repository.findOne({ _id: request.user!.id });

      await OAuth2Util.unlinkGoogle(user.oAuth2AccessToken);

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        null,
        '구글 로그인 연동을 해제했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private processOAuth2SignIn = async (
    oAuth2UserInfo: OAuth2UserInfo,
    oAuth2AccessToken: string,
    oAuth2RefreshToken: string,
    oAuth2Provider: OAuth2Provider,
  ): Promise<UserDocument> => {
    // TODO: 회원탈퇴인 경우 어떻게?
    /* findOne()에서 예외처리 때문에 User 모델을 사용한다. */
    const user: Nullable<UserDocument> = await User.findOne({
      email: oAuth2UserInfo.email,
    });

    if (user) {
      if (user.oAuth2Provider !== oAuth2UserInfo.provider) {
        throw new DuplicateUserError(
          Code.CONFLICT,
          '해당 이메일로 이미 회원가입 했습니다.',
        );
      }

      await this.repository.update(
        { email: oAuth2UserInfo.email },
        { name: oAuth2UserInfo.name, updatedAt: new Date(Date.now()) },
      );

      return user;
    } else {
      const newUser = new User({
        email: oAuth2UserInfo.email,
        name: oAuth2UserInfo.name,
        password: oAuth2UserInfo.id,
        oAuth2Provider,
        oAuth2ProviderId: oAuth2UserInfo.id,
        oAuth2AccessToken,
        oAuth2RefreshToken,
      });

      await newUser.save({ validateBeforeSave: false });

      return newUser;
    }
  };
}

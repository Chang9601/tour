import axios from 'axios';
import { NextFunction, Request, Response, Router } from 'express';

import { CoreController, catchAsync, OAuth2Provider } from '@whooatour/common';

import { User } from '../model/user.model';
import { UserRepository } from '../repository/user.repository';

export class OAuth2Controller implements CoreController {
  public readonly path = '/api/v1/oauth2';
  public readonly router = Router();
  public readonly repository = new UserRepository(User);

  // private get GOOGLE_OAUTH2_AUTHORIZATION_URI(): string {
  //   return process.env.GOOGLE_OAUTH2_AUTHORIZATION_URI;
  // }

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes = (): void => {
    this.router
      .route(`${this.path}/authorization/google`)
      .get(this.signInWithGoogle);
    this.router
      .route(`${this.path}/code/google`)
      .get(this.signInWithGoogleRedirect);

    // this.router
    //   .route(`${this.path}/authorization/naver`)
    //   .get(this.signInWithNaver);
    // this.router
    //   .route(
    //     `${this.path}/naver/${this.getOAuth2RedirectUri(OAuth2Provider.Naver)}`,
    //   )
    //   .get(this.signInWithNaverRedirect);

    // this.router.all('*', this.handleRoutes);
  };

  // private handleRoutes = async (
  //   request: Request,
  //   response: Response,
  //   next: NextFunction,
  // ) => {
  //   const error = {
  //     codeAttr: Code.NOT_FOUND,
  //     detail: `페이지 ${request.originalUrl}는 존재하지 않습니다.`,
  //     isOperational: true,
  //   };

  //   next(error);
  // };

  private signInWithGoogle = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      // const parameters = `?client_id=${this.getOAuth2ClientId(OAuth2Provider.Google)}&redirect_uri=${this.getOAuth2RedirectUri(OAuth2Provider.Google)}&response_type=code&scope=${this.getOAuth2Scope(OAuth2Provider.Google)}&access_type=offline&state=oauth2google`;
      // const url = `${this.getOAuth2AuthorizationUri(OAuth2Provider.Google)}${parameters}`;

      response.redirect(buildGoogleAuthroizationUri());
    },
  );

  private signInWithNavere = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      // const parameters = `?client_id=${this.getOAuth2ClientId(OAuth2Provider.Google)}&redirect_uri=${this.getOAuth2RedirectUri(OAuth2Provider.Google)}&response_type=code&scope=${this.getOAuth2Scope(OAuth2Provider.Google)}&access_type=offline&state=oauth2google`;
      // const url = `${this.getOAuth2AuthorizationUri(OAuth2Provider.Google)}${parameters}`;

      response.redirect(buildNaverAuthroizationUri());
    },
  );

  private signInWithGoogleRedirect = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const { code } = request.query;

      const accessToken = await getGoogleAccessToken(code);

      const userInfo = await getGoogleUserInfo(accessToken);

      // const tokenResponse = await axios.post(
      //   this.getOAuth2TokenUri(OAuth2Provider.Google),
      //   {
      //     client_id: this.getOAuth2ClientId(OAuth2Provider.Google),
      //     client_secret: this.getOAuth2ClientSecret(OAuth2Provider.Google),
      //     code,
      //     redirect_uri: this.getOAuth2RedirectUri(OAuth2Provider.Google),
      //     grant_type: this.getOAuth2AuthorizationGrant(OAuth2Provider.Google),
      //   },
      // );

      // const accessToken = tokenResponse.data.access_token;

      // const userInfoResponse = await axios.get(
      //   this.getOAuth2UserInfoUri(OAuth2Provider.Google),
      //   {
      //     headers: {
      //       Authorization: `Bearer ${accessToken}`,
      //     },
      //   },
      // );

      // console.log(userInfoResponse);
    },
  );

  private signInWithNaverRedirect = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const { code } = request.query;

      const accessToken = await getNaverAccessToken(code);

      const userInfo = await getNaverUserInfo(accessToken);

      await this.processOAuth2(userInfo);

      // const tokenResponse = await axios.post(
      //   this.getOAuth2TokenUri(OAuth2Provider.Google),
      //   {
      //     client_id: this.getOAuth2ClientId(OAuth2Provider.Google),
      //     client_secret: this.getOAuth2ClientSecret(OAuth2Provider.Google),
      //     code,
      //     redirect_uri: this.getOAuth2RedirectUri(OAuth2Provider.Google),
      //     grant_type: this.getOAuth2AuthorizationGrant(OAuth2Provider.Google),
      //   },
      // );

      // const accessToken = tokenResponse.data.access_token;

      // const userInfoResponse = await axios.get(
      //   this.getOAuth2UserInfoUri(OAuth2Provider.Google),
      //   {
      //     headers: {
      //       Authorization: `Bearer ${accessToken}`,
      //     },
      //   },
      // );

      // console.log(userInfoResponse);
    },
  );

  private processOAuth2 = async (
    oAuth2UserInfo: OAuth2UserInfo,
  ): Promise<void> => {
    if (!oAuth2UserInfo) {
    }

    const user = await this.repository.find({
      email: oAuth2UserInfo.email,
      active: true,
    });

    if (user) {
      if (user.oAuth2Provider !== oAuth2UserInfo.provider) {
        throw new Error();
      }

      this.repository.update(
        { email: oAuth2UserInfo.email },
        { name: oAuth2UserInfo.name },
      );
    } else {
      this.repository.create({
        email: oAuth2UserInfo.email,
        name: oAuth2UserInfo.name,
        password: oAuth2UserInfo.id,
        oAuth2Provider: oAuth2UserInfo.provider,
        oAuth2ProviderId: oAuth2UserInfo.id,
      });
    }
  };
}

import axios from 'axios';
import { NextFunction, Request, Response, Router } from 'express';

import {
  CoreController,
  User,
  UserRepository,
  catchAsync,
  OAuth2Provider,
} from '@whooatour/common';

export class OAuth2Controller implements CoreController {
  public readonly path = '/api/v1/oauth2';
  public readonly router = Router();
  public readonly repository = new UserRepository(User);

  private getOAuth2AuthorizationGrant(oAuth2Provider: OAuth2Provider): string {
    switch (oAuth2Provider) {
      case OAuth2Provider.Google:
        return process.env.GOOGLE_OAUTH2_AUTHORIZATION_GRANT;
      case OAuth2Provider.Naver:
        return process.env.NAVER_OAUTH2_AUTHORIZATION_GRANT;
      default:
        return '';
    }
  }

  private getOAuth2AuthorizationUri(oAuth2Provider: OAuth2Provider): string {
    switch (oAuth2Provider) {
      case OAuth2Provider.Google:
        return process.env.GOOGLE_OAUTH2_AUTHORIZATION_URI;
      case OAuth2Provider.Naver:
        return process.env.NAVER_OAUTH2_AUTHORIZATION_URI;
      default:
        return '';
    }
  }

  private getOAuth2ClientId(oAuth2Provider: OAuth2Provider): string {
    switch (oAuth2Provider) {
      case OAuth2Provider.Google:
        return process.env.GOOGLE_OAUTH2_CLIENT_ID;
      case OAuth2Provider.Naver:
        return process.env.NAVER_OAUTH2_CLIENT_ID;
      default:
        return '';
    }
  }

  private getOAuth2ClientSecret(oAuth2Provider: OAuth2Provider): string {
    switch (oAuth2Provider) {
      case OAuth2Provider.Google:
        return process.env.GOOGLE_OAUTH2_CLIENT_SECRET;
      case OAuth2Provider.Naver:
        return process.env.NAVER_OAUTH2_CLIENT_SECRET;
      default:
        return '';
    }
  }

  private getOAuth2RedirectUri(oAuth2Provider: OAuth2Provider): string {
    switch (oAuth2Provider) {
      case OAuth2Provider.Google:
        return process.env.GOOGLE_OAUTH2_REDIRECT_URI;
      case OAuth2Provider.Naver:
        return process.env.NAVER_OAUTH2_REDIRECT_URI;
      default:
        return '';
    }
  }

  private getOAuth2Scope(oAuth2Provider: OAuth2Provider): string {
    switch (oAuth2Provider) {
      case OAuth2Provider.Google:
        return process.env.GOOGLE_OAUTH2_SCOPE;
      case OAuth2Provider.Naver:
        return process.env.NAVER_OAUTH2_SCOPE;
      default:
        return '';
    }
  }

  private getOAuth2TokenUri(oAuth2Provider: OAuth2Provider): string {
    switch (oAuth2Provider) {
      case OAuth2Provider.Google:
        return process.env.GOOGLE_OAUTH2_TOKEN_URI;
      case OAuth2Provider.Naver:
        return process.env.NAVER_OAUTH2_TOKEN_URI;
      default:
        return '';
    }
  }

  private getOAuth2UserInfoUri(oAuth2Provider: OAuth2Provider): string {
    switch (oAuth2Provider) {
      case OAuth2Provider.Google:
        return process.env.GOOGLE_OAUTH2_USER_INFO_URI;
      case OAuth2Provider.Naver:
        return process.env.NAVER_OAUTH2_USER_INFO_URI;
      default:
        return '';
    }
  }

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
      const parameters = `?client_id=${this.getOAuth2ClientId(OAuth2Provider.Google)}&redirect_uri=${this.getOAuth2RedirectUri(OAuth2Provider.Google)}&response_type=code&scope=${this.getOAuth2Scope(OAuth2Provider.Google)}&access_type=offline&state=oauth2google`;
      const url = `${this.getOAuth2AuthorizationUri(OAuth2Provider.Google)}${parameters}`;

      response.redirect(url);
    },
  );

  private signInWithGoogleRedirect = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const { code } = request.query;

      const tokenResponse = await axios.post(
        this.getOAuth2TokenUri(OAuth2Provider.Google),
        {
          client_id: this.getOAuth2ClientId(OAuth2Provider.Google),
          client_secret: this.getOAuth2ClientSecret(OAuth2Provider.Google),
          code,
          redirect_uri: this.getOAuth2RedirectUri(OAuth2Provider.Google),
          grant_type: this.getOAuth2AuthorizationGrant(OAuth2Provider.Google),
        },
      );

      const accessToken = tokenResponse.data.access_token;

      const userInfoResponse = await axios.get(
        this.getOAuth2UserInfoUri(OAuth2Provider.Google),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      console.log(userInfoResponse);
    },
  );
}

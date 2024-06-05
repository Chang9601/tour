import * as nodemailer from 'nodemailer';

import { EmailMessage } from '../type/email-message';

export class EmailUtil {
  public static async sendEmail(
    emailMessage: Partial<EmailMessage>,
  ): Promise<void> {
    /* 1. 트랜스포터(이메일을 전송하는 객체.)를 생성한다. */
    const transporter = nodemailer.createTransport({
      host: process.env.NODEMAILER_HOST,
      port: process.env.NODEMAILER_PORT,
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS,
      },
    });

    /* 2. 이메일 옵션을 정의한다. */
    emailMessage.from = '이창섭 <changsup96@naver.com>';

    /* 3. 이메일을 전송한다. */
    await transporter.sendMail(emailMessage);
  }
}

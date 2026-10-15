import { CredentialsSignin } from "next-auth";

export class EmailSignInError extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
  }
}

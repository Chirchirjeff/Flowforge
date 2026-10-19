declare module 'passport-local' {
  import { Strategy as PassportStrategy } from 'passport';

  export interface IStrategyOptions {
    usernameField?: string;
    passwordField?: string;
    session?: boolean;
    passReqToCallback?: false;
  }

  export class Strategy extends PassportStrategy {
    constructor(options: IStrategyOptions, verify: (...args: unknown[]) => void);
    constructor(verify: (...args: unknown[]) => void);
  }
}

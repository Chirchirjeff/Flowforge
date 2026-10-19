declare module 'passport-jwt' {
  import { Strategy as PassportStrategy } from 'passport';

  export interface JwtFromRequestFunction {
    (req: import('express').Request): string | null;
  }

  export interface StrategyOptions {
    jwtFromRequest: JwtFromRequestFunction;
    secretOrKey?: string | Buffer;
    secretOrKeyProvider?: (
      request: import('express').Request,
      rawJwtToken: string,
      done: (err: Error | null, secretOrKey?: string | Buffer) => void
    ) => void;
    issuer?: string;
    audience?: string;
    algorithms?: string[];
    ignoreExpiration?: boolean;
    passReqToCallback?: boolean;
    jsonWebTokenOptions?: object;
  }

  export class ExtractJwt {
    static fromAuthHeaderAsBearerToken(): JwtFromRequestFunction;
    static fromHeader(headerName: string): JwtFromRequestFunction;
    static fromBodyField(fieldName: string): JwtFromRequestFunction;
    static fromUrlQueryParameter(paramName: string): JwtFromRequestFunction;
  }

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: (...args: unknown[]) => void);
  }
}

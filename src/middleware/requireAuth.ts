import { Request, Response, NextFunction } from 'express';
import passport from '../config/passport';
import { UnauthorizedError } from '../utils/errors';
import { TokenPayload } from '../services/tokenService';

/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type */
declare global {
  namespace Express {
    interface User extends TokenPayload {}
  }
}
/* eslint-enable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type */

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('jwt', { session: false }, (err: unknown, user: TokenPayload | false) => {
    if (err || !user || !user.organizationId) {
      return next(new UnauthorizedError('Authentication required'));
    }
    req.user = user;
    next();
  })(req, res, next);
}
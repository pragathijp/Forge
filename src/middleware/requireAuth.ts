import { Request, Response, NextFunction } from 'express';
import passport from '../config/passport';
import { UnauthorizedError } from '../utils/errors';
import { TokenPayload } from '../services/tokenService';

declare global {
  namespace Express {
    interface User extends TokenPayload {}
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('jwt', { session: false }, (err: unknown, user: TokenPayload | false) => {
    if (err || !user || !user.organizationId) {
      return next(new UnauthorizedError('Authentication required'));
    }
    req.user = user;
    next();
  })(req, res, next);
}
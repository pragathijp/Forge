import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { env } from './env';

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.JWT_ACCESS_SECRET,
    },
    (payload, done) => {
      // payload will contain { userId, organizationId, role } once we issue real tokens in Task 1.3
      return done(null, payload);
    }
  )
);

export default passport;
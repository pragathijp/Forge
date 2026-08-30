import express from 'express';
import cookieParser from 'cookie-parser';
import passport from './config/passport';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import healthRouter from './routes/health';
import authRouter from './routes/auth';

const app = express();

app.use(requestLogger);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(healthRouter);
app.use('/api/auth', authRouter);

app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
});
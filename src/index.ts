import express from 'express';
import cookieParser from 'cookie-parser';
import passport from './config/passport';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/tasks';
import { connectRedis } from './config/redis';

const app = express();

app.use(requestLogger);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);

app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok' });
});


app.use(errorHandler);

connectRedis()
  .then(() => {
    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to Redis:', err);
    process.exit(1);
  });
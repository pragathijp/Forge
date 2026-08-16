import express from 'express';
import { env } from './config/env';

const app = express();

app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
});
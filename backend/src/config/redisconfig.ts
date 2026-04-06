import dotenv from 'dotenv';
dotenv.config();

import { createClient } from 'redis';

const client = createClient({
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
});

client.on('error', (err) => console.log('Redis Client Error', err));

// Connect once when this module is imported
(async () => {
  if (!client.isOpen) {
    await client.connect();
    console.log('✅ Connected to Redis');
  }
})();

export default client;
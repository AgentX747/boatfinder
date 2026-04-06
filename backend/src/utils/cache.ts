import client from '../config/redisconfig.js';

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await client.get(key);
  if (cached) {
    console.log(`Cache HIT [${key}]`);
    return JSON.parse(cached) as T;
  }

  console.log(`Cache MISS [${key}]`);
  const data = await fetcher();

  await client.set(key, JSON.stringify(data), { EX: ttlSeconds });
  return data;
}

// Call this when data changes (login, update, delete, etc.)
export async function invalidateCache(...keys: string[]): Promise<void> {
  if (keys.length > 0) await client.del(keys);
}
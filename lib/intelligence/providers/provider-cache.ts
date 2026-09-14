import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function withProviderCache<T>(
  provider: string,
  operation: string,
  input: unknown,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const queryHash = hash(JSON.stringify({ operation, input }));
  const cacheKey = `${provider}:${operation}:${queryHash}`;
  const now = new Date();

  const cached = await supabaseAdmin
    .from('property_intelligence_provider_cache')
    .select('response_json, expires_at, status')
    .eq('cache_key', cacheKey)
    .maybeSingle();

  if (!cached.error && cached.data && new Date(cached.data.expires_at).getTime() > now.getTime()) {
    return cached.data.response_json as T;
  }

  const value = await loader();
  const expiresAt = new Date(now.getTime() + Math.max(60, ttlSeconds) * 1000).toISOString();

  await supabaseAdmin.from('property_intelligence_provider_cache').upsert({
    cache_key: cacheKey,
    provider,
    query_hash: queryHash,
    response_json: value,
    fetched_at: now.toISOString(),
    expires_at: expiresAt,
    status: 'available',
  });

  return value;
}

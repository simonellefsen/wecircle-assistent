import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';

const EMAIL_COOLDOWN_MINUTES = 5;
const IP_COOLDOWN_MINUTES = 2;
const EMAIL_LIMIT = 3;
const IP_LIMIT = 5;

const hashValue = (value: string) => {
  const salt = process.env.RATE_LIMIT_SALT || 'wecircle-rate';
  return crypto.createHmac('sha256', salt).update(value).digest('hex');
};

const nowIso = () => new Date().toISOString();
const minutesAgoIso = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000).toISOString();

const resolveRedirectUrl = () => {
  const raw = process.env.APP_BASE_URL || 'http://localhost:5173';
  const normalized = raw.startsWith('http://') || raw.startsWith('https://')
    ? raw
    : `https://${raw}`;
  try {
    return new URL(normalized).toString();
  } catch {
    console.warn(`APP_BASE_URL is invalid ("${raw}"). Falling back to localhost.`);
    return 'http://localhost:5173';
  }
};

const sanitizeRedirect = (raw?: string) => {
  const fallback = resolveRedirectUrl();
  if (!raw) return fallback;
  try {
    const fallbackUrl = new URL(fallback);
    const normalized = raw.startsWith('http://') || raw.startsWith('https://')
      ? new URL(raw)
      : new URL(raw, fallbackUrl.origin);
    if (normalized.origin !== fallbackUrl.origin) {
      return fallback;
    }
    return normalized.toString();
  } catch {
    return fallback;
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin client misconfigured' });
  }

  const email = (req.body?.email || '').toLowerCase().trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Ugyldig e-mail' });
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const ipHash = hashValue(ip);

  try {
    const emailWindow = minutesAgoIso(EMAIL_COOLDOWN_MINUTES);
    const ipWindow = minutesAgoIso(IP_COOLDOWN_MINUTES);

    const [{ count: emailCount }, { count: ipCount }] = await Promise.all([
      supabaseAdmin
        .from('auth_throttle')
        .select('id', { count: 'exact', head: true })
        .eq('email', email)
        .gte('requested_at', emailWindow),
      supabaseAdmin
        .from('auth_throttle')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('requested_at', ipWindow),
    ]);

    if ((emailCount ?? 0) >= EMAIL_LIMIT) {
      return res.status(429).json({ error: 'For mange forsøg for denne e-mail. Prøv igen om lidt.' });
    }
    if ((ipCount ?? 0) >= IP_LIMIT) {
      return res.status(429).json({ error: 'For mange forsøg fra denne enhed. Prøv igen om lidt.' });
    }

    await supabaseAdmin.from('auth_throttle').insert({
      email,
      ip_hash: ipHash,
      requested_at: nowIso(),
    });

    const redirectUrl = sanitizeRedirect(typeof req.body?.redirectTo === 'string' ? req.body.redirectTo : undefined);
    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) {
      console.error('Magic link error', error);
      const rateLimited = error.code === 'over_email_send_rate_limit' || error.status === 429;
      return res
        .status(rateLimited ? 429 : 500)
        .json({
          error: rateLimited
            ? 'Du har lige fået sendt for mange login-links. Vent fem minutter og prøv igen, så undgår vi at blokere e-mailen.'
            : 'Kunne ikke sende login-link. Prøv igen.'
        });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Magic link handler error', error);
    return res.status(500).json({ error: 'Uventet fejl' });
  }
}

const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

webpush.setVapidDetails(
  'mailto:elias.collobert@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

function supabaseAdmin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Sends a push notification to a set of users (or all subscribed users),
 * and cleans up subscriptions that are no longer valid (410/404).
 * @param {{userIds?: string[], all?: boolean, title: string, body: string, url?: string}} params
 */
async function sendPush({ userIds, all, title, body, url }) {
  const sb = supabaseAdmin();
  let query = sb.from('push_subscriptions').select('id, endpoint, p256dh, auth, user_id');
  if (!all) {
    if (!userIds || !userIds.length) return { sent: 0, failed: 0 };
    query = query.in('user_id', userIds);
  }
  const { data: subs, error } = await query;
  if (error) throw error;

  const payload = JSON.stringify({ title, body, url: url || '/' });
  let sent = 0, failed = 0;
  const staleIds = [];

  await Promise.all((subs || []).map(async (s) => {
    const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    try {
      await webpush.sendNotification(subscription, payload);
      sent++;
    } catch (e) {
      failed++;
      if (e.statusCode === 404 || e.statusCode === 410) staleIds.push(s.id);
    }
  }));

  if (staleIds.length) {
    await sb.from('push_subscriptions').delete().in('id', staleIds);
  }

  return { sent, failed };
}

module.exports = { sendPush, supabaseAdmin };

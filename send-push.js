const { sendPush } = require('./_push-lib');

/**
 * POST /api/send-push
 * Headers: x-api-secret: <API_SECRET>
 * Body: { userIds?: string[], all?: boolean, title: string, body: string, url?: string }
 *
 * Exemples d'appel côté app (depuis le client, juste après un événement) :
 *   fetch('/api/send-push', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json', 'x-api-secret': PUBLIC_TRIGGER_SECRET },
 *     body: JSON.stringify({ userIds: [SYNC.user.id], title: 'Objectif atteint 🎉', body: 'Tu as atteint ton poids cible !' })
 *   });
 *
 * ATTENTION : si tu appelles ça depuis le client (navigateur), le secret est visible.
 * Pour un vrai événement sécurisé (ex: "ne pas laisser un utilisateur notifier les autres"),
 * préfère un secret différent de celui du cron, ou fais cet appel depuis une Supabase Edge Function
 * déclenchée par une écriture en base plutôt que depuis le navigateur.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (req.headers['x-api-secret'] !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const { userIds, all, title, body, url } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  try {
    const result = await sendPush({ userIds, all, title, body, url });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

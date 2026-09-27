const { sendPush, supabaseAdmin } = require('./_push-lib');

/**
 * Appelée automatiquement chaque jour par Vercel Cron (voir vercel.json).
 * Ne notifie QUE les utilisateurs qui n'ont pas encore enregistré de séance
 * aujourd'hui (au moins une série loggée), en lisant leur état sauvegardé
 * dans la table `user_data` (colonne `state`, JSON).
 *
 * Limite connue : la date "aujourd'hui" est calculée en UTC côté serveur,
 * alors que l'app calcule la date locale de l'utilisateur. Comme le cron est
 * réglé pour tourner en soirée heure française, ça ne pose problème que dans
 * de rares cas limites (juste après minuit UTC).
 */
function hasWorkoutToday(state, todayStr) {
  try {
    const s = typeof state === 'string' ? JSON.parse(state) : state;
    const w = (s.workouts || []).find(w => w.date === todayStr);
    if (!w) return false;
    return (w.entries || []).some(e => (e.sets || []).length > 0);
  } catch (e) {
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const sb = supabaseAdmin();
    const todayStr = new Date().toISOString().slice(0, 10);

    const { data: rows, error } = await sb.from('user_data').select('user_id, state');
    if (error) throw error;

    const pendingIds = (rows || [])
      .filter(r => !hasWorkoutToday(r.state, todayStr))
      .map(r => r.user_id);

    if (!pendingIds.length) {
      return res.status(200).json({ sent: 0, failed: 0, notified: 0, total: (rows || []).length });
    }

    const result = await sendPush({
      userIds: pendingIds,
      title: 'Forma',
      body: "Pense à ta séance aujourd'hui 💪",
      url: '/'
    });
    res.status(200).json({ ...result, notified: pendingIds.length, total: (rows || []).length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

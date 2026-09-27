const { sendPush } = require('./_push-lib');

/**
 * Appelée automatiquement chaque jour par Vercel Cron (voir vercel.json).
 * Envoie un rappel à tous les utilisateurs abonnés aux notifications.
 *
 * Amélioration possible plus tard : ne notifier que ceux qui n'ont pas encore
 * fait leur séance aujourd'hui, en lisant leur état dans la table `user_data`
 * (colonne `state`, JSON). Pour l'instant ça envoie à tout le monde, chaque jour,
 * pour rester simple et fiable.
 */
module.exports = async (req, res) => {
  // Vercel Cron ajoute cet en-tête automatiquement ; ça évite qu'un tiers déclenche l'envoi.
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const result = await sendPush({
      all: true,
      title: 'Forma',
      body: "Pense à ta séance aujourd'hui 💪",
      url: '/'
    });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

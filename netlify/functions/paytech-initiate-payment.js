/**
 * paytech-initiate-payment — désactivée (audit de sécurité, nov. 2026).
 * Ancien paiement des consultations (réservations), appelable sans connexion. Health-e ne propose plus
 * de consultations ; les étincelles passent par paytech-koris. L'ancienne version est dans l'historique git.
 */
exports.handler = async () => ({
  statusCode: 410,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ error: 'disabled' }),
});

/**
 * cleanup-expired-slots — désactivée (audit de sécurité, nov. 2026).
 * Elle était appelable par n'importe qui, sans connexion, et écrivait/supprimait dans Firestore
 * (revenus fictifs, créneaux). Plus aucune page ne l'utilise. L'ancienne version est dans l'historique git.
 */
exports.handler = async () => ({
  statusCode: 410,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ error: 'disabled' }),
});

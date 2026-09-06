const { admin, db, verifyAuth } = require('./_firebase')

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const user = await verifyAuth(event)
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié' }) }
  }

  // Verify admin status
  const userDoc = await db.collection('users').doc(user.uid).get()
  if (!userDoc.exists || userDoc.data().type !== 'admin') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès réservé aux administrateurs' }) }
  }

  let payload
  try {
    payload = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) }
  }

  const { targetUserId, amount, reason } = payload

  if (!targetUserId || typeof targetUserId !== 'string') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'targetUserId requis' }) }
  }
  if (!amount || typeof amount !== 'number' || amount < 1 || amount > 500 || !Number.isInteger(amount)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Montant invalide (1-500, entier)' }) }
  }
  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Motif requis (min 3 caractères)' }) }
  }

  const patientRef = db.collection('patients').doc(targetUserId)

  try {
    const newBalance = await db.runTransaction(async (tx) => {
      const patientDoc = await tx.get(patientRef)
      if (!patientDoc.exists) {
        throw new Error('PATIENT_NOT_FOUND')
      }

      const wallet = patientDoc.data().korisWallet
      const currentBalance = wallet?.balance ?? 0

      tx.update(patientRef, {
        'korisWallet.balance': admin.firestore.FieldValue.increment(amount),
      })

      const historyRef = db.collection('patients').doc(targetUserId).collection('korisHistory').doc()
      tx.set(historyRef, {
        type: 'bonus',
        amount,
        feature: 'admin_credit',
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + amount,
        timestamp: new Date().toISOString(),
        details: `Crédit admin par ${user.email || user.uid} — ${reason.trim()}`,
      })

      return currentBalance + amount
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        newBalance,
        credited: amount,
      }),
    }
  } catch (err) {
    if (err.message === 'PATIENT_NOT_FOUND') {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Patient introuvable' }) }
    }
    console.error('admin-koris-credit error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur' }) }
  }
}

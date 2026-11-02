/**
 * _roles — qui peut gérer quoi dans l'Espace pro.
 *   Propriétaire : Dr Lô (staff/{uid}.drlo === true, ou role 'owner'). Il gère tout et valide l'arrivée des pros.
 *   Pro vérifié  : staff/{uid} = { role:'pro', verified:true } (posé par la validation de Dr Lô), non suspendu.
 *                  Il crée librement ses chaînes (ownerUid = lui) et ne gère que celles-là.
 * Une chaîne sans ownerUid (créée avant les pros) appartient au propriétaire.
 */
const { db } = require('./_firebase');

async function roleOf(uid) {
  const s = await db.collection('staff').doc(uid).get();
  const d = s.exists ? s.data() || {} : {};
  const owner = d.drlo === true || d.role === 'owner';
  const pro = !owner && d.role === 'pro' && d.verified === true && d.suspended !== true;
  return { owner, pro, staff: d };
}

/** Gérer une chaîne (publier, modérer, modifier) : le propriétaire, ou le pro qui l'a créée. */
const canManageChannel = (r, ch, uid) => !!ch && (r.owner || (r.pro && !!ch.ownerUid && ch.ownerUid === uid));

/** Qui anime la chaîne, tel que l'affichent les membres. */
function hostOf(ch) {
  if (ch && ch.ownerUid && ch.ownerName) return { name: String(ch.ownerName), title: String(ch.ownerTitle || ''), pro: true };
  return { name: 'Dr Lô', title: 'Médecin', pro: false };
}

/** Le nom et le titre d'un gestionnaire, à poser sur ce qu'il crée. */
function ownerFields(r, uid) {
  if (r.owner) return { ownerUid: null, ownerName: null, ownerTitle: null };
  return { ownerUid: uid, ownerName: r.staff.fullName || 'Professionnel', ownerTitle: r.staff.title || '' };
}

const PROFESSIONS = ['psychologue', 'psychiatre', 'medecin', 'sage_femme', 'sexologue', 'infirmier', 'travailleur_social', 'autre'];
const PROFESSION_LABEL = {
  psychologue: 'Psychologue', psychiatre: 'Psychiatre', medecin: 'Médecin', sage_femme: 'Sage-femme', sexologue: 'Sexologue',
  infirmier: 'Infirmier ou infirmière', travailleur_social: 'Travailleur social', autre: 'Professionnel de santé',
};
const clean = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Demande d'accès pro : { data } ou { error }. */
function cleanApplication(b) {
  const fullName = clean(b.fullName, 60);
  const profession = PROFESSIONS.includes(b.profession) ? b.profession : '';
  const title = clean(b.title, 60) || PROFESSION_LABEL[profession] || '';
  const license = clean(b.license, 80);
  const city = clean(b.city, 40);
  const bio = String(b.bio || '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 600);
  if (fullName.length < 3) return { error: 'Écris ton nom complet.' };
  if (!profession) return { error: 'Choisis ta profession.' };
  if (license.length < 3) return { error: 'Indique ton numéro d\'inscription à l\'ordre ou ton diplôme, pour la vérification.' };
  if (city.length < 2) return { error: 'Indique ta ville.' };
  if (bio.length < 20) return { error: 'Présente-toi en quelques phrases (20 caractères au moins).' };
  return { data: { fullName, profession, title, license, city, bio } };
}

module.exports = { roleOf, canManageChannel, hostOf, ownerFields, cleanApplication, PROFESSIONS, PROFESSION_LABEL };

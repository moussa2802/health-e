/**
 * _anonNames — un nom au hasard pour qui choisit « Anonyme » (Pénc, chaînes, commentaires).
 * Le but : qu'on ne puisse pas distinguer un anonyme d'un pseudo ou d'un prénom. Les noms ressemblent donc
 * aux uns et aux autres (prénoms courants, choses et animaux d'ici comme « Gaïndé » ou « Guerté », pseudos en wolof,
 * français ou anglais, parfois avec un chiffre).
 * Le même nom revient pour la même personne dans le même lieu (un Pénc, une chaîne), jamais d'un lieu à l'autre :
 * graine = « lieu:uid », mélangée à un sel serveur, donc impossible de remonter à la personne.
 */
const crypto = require('crypto');

const PRENOMS = ['Fatou', 'Moussa', 'Awa', 'Ibou', 'Khady', 'Modou', 'Aïda', 'Cheikh', 'Mariama', 'Ousmane', 'Bineta', 'Saliou', 'Ndeye', 'Lamine',
  'Coumba', 'Babacar', 'Astou', 'Pape', 'Rokhaya', 'Malick', 'Adama', 'Yacine', 'Aminata', 'Abdou', 'Sokhna', 'Mamadou', 'Dieynaba', 'Serigne', 'Marème', 'Assane'];
// Pseudos « mot + mot » : wolof, français, anglais
const DEBUT = ['Baobab', 'Teranga', 'Jamm', 'Ndank', 'Lion', 'Soleil', 'Lune', 'Moon', 'Night', 'Sunu', 'Xel', 'Diamono', 'Lumière', 'Calme', 'Petit',
  'Grand', 'Dream', 'Soul', 'Coeur', 'Kër', 'Mbalax', 'Sabar', 'Thiof', 'Bissap', 'Ataya', 'Gazelle', 'Hibou', 'Etoile', 'Wind', 'River'];
const FIN = ['Zen', 'Doux', 'Calme', 'Rider', 'Bi', 'Gi', 'Life', 'Vibes', 'Ndanane', 'Dakar', 'Sn', 'Soul', 'Libre', 'Tranquille', 'Sky', 'Fan', 'Kid',
  'Leer', 'Rafet', 'Bu Baax', 'Dou', 'Flow', 'Star', 'Ndaw', 'Joy', 'Mood', 'Wax', 'Yeewu', 'Sama', 'Do'];
// Choses et animaux d'ici (wolof surtout), seuls ou avec un petit mot : « Gaïndé », « Guerté_7 », « Bukki Zen »
const CHOSES = ['Gaïndé', 'Guerté', 'Bukki', 'Golo', 'Kéwél', 'Ganaar', 'Fas', 'Jën', 'Xar', 'Nag', 'Baobab', 'Bouye', 'Ataya', 'Bissap', 'Ceebu Jën',
  'Thiakry', 'Xalam', 'Kora', 'Tama', 'Sabar', 'Jambaar', 'Teranga', 'Jamm', 'Mangue', 'Hibou', 'Tortue', 'Colibri', 'Fennec', 'Pirogue', 'Calebasse',
  'Lion', 'Gazelle', 'Dauphin', 'Panthère', 'Firefly', 'Falcon', 'Mango', 'Coconut', 'Sopi', 'Ndox'];
const PETIT = ['Zen', 'Doux', 'Calme', 'Bi', 'Gi', 'Dakar', 'Sn', 'Libre', 'Ndaw', 'Joy', 'Rafet', 'Leer', 'Star', 'Flow'];
const SEP = ['', '_', '.', ' '];

function pick(buf, i, list) { return list[buf.readUInt16BE(i) % list.length]; }

/** Un nom stable pour cette graine (« penc:ID:uid », « ch:ID:uid »…). */
function anonName(seed) {
  const salt = process.env.ANON_NAME_SALT || 'health-e-anon';
  const b = crypto.createHmac('sha256', salt).update(String(seed || Math.random())).digest();
  const kind = b[0] % 10; // 0-2 : prénom ; 3-5 : chose ou animal ; 6-9 : pseudo
  const num = String(b.readUInt16BE(12) % 100);
  if (kind >= 3 && kind <= 5) {
    const c = pick(b, 16, CHOSES);
    const s = b[18] % 4; // seul, + chiffre, + petit mot, + _chiffre
    if (s === 0 || c.includes(' ')) return c;
    if (s === 1) return `${c}${num}`.slice(0, 20);
    if (s === 2) return `${c}${pick(b, 20, [' ', '_', ''])}${pick(b, 22, PETIT)}`.slice(0, 20);
    return `${c}_${num}`.slice(0, 20);
  }
  if (kind < 3) {
    const p = pick(b, 2, PRENOMS);
    const s = b[14] % 4; // prénom seul, prénom + chiffre, prénom + initiale
    return s === 0 ? `${p}_${num}` : s === 1 ? `${p}${num}` : s === 2 ? `${p}.${'ABCDFGKLMNST'[b[15] % 12]}` : p;
  }
  const a = pick(b, 4, DEBUT);
  let z = pick(b, 6, FIN);
  if (z === a) z = 'Zen';
  const sep = z.includes(' ') ? ' ' : pick(b, 8, SEP);
  const withNum = b[10] % 3 === 0 && sep !== ' ';
  return `${a}${sep}${z}${withNum ? num : ''}`.slice(0, 20);
}

module.exports = { anonName };

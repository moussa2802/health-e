/**
 * Formules d'étincelles vendues sur Health-e (prix en FCFA / XOF). Le serveur fait foi : le navigateur
 * n'envoie que l'identifiant de la formule. Mêmes formules et mêmes prix que paytech-koris.js.
 */
const KORIS_PACKS = Object.freeze({
  pack_decouverte: { koris: 25, price: 500, label: "25 étincelles — Découverte" },
  pack_populaire: { koris: 55, price: 1000, label: "55 étincelles — Populaire" },
  pack_confort: { koris: 150, price: 2500, label: "150 étincelles — Confort" },
  pack_grand: { koris: 350, price: 5000, label: "350 étincelles — Grand" },
});

module.exports = { KORIS_PACKS };

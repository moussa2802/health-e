# Vocaux du compagnon — textes à valider

Voix : celle du compte ElevenLabs du dossier promo (`ELEVENLABS_VOICE_ID`). Français uniquement. Tutoiement, sans accord masculin/féminin (« tu as ce qu'il faut » plutôt que « tu es prêt »).
Tout est **gratuit** (comme « Respirer 1 min »), ouvert à tous, et jamais proposé **à la place** des numéros d'urgence.

Comment ça marche dans la discussion : chaque exercice est découpé en **étapes**. Une étape = une phrase enregistrée + une durée fixe. La phrase part au début de l'étape, puis silence jusqu'à l'étape suivante. Le rythme reste donc exact, quelle que soit la vitesse de la voix. Le texte de l'étape s'affiche à l'écran (pour ceux qui n'ont pas d'écouteurs). Bouton « Couper la voix » et « Arrêter ».

---

## 1. Respirer 1 min (existe déjà, on ajoute la voix)

Cercle : 4 s inspire / 4 s expire. Une consigne par phase (moins de 3,6 s chacune).

> **Prononciation :** les consignes vocales commencent par « On » (« On inspire… ») pour que « Inspire »/« Expire » ne soient pas lus à l'anglaise, et chaque appel envoie un `previous_text` français. Le texte affiché à l'écran pendant l'exercice ne change pas.

| Fichier | Texte |
|---|---|
| intro | On respire ensemble. On inspire… |
| inspire_1 | On inspire, par le nez. |
| expire_1 | On expire, doucement. |
| inspire_2 | On inspire… |
| expire_2 | Et on expire, tout doucement. |
| inspire_3 | On inspire, le ventre se gonfle. |
| expire_3 | On expire, on relâche les épaules. |
| milieu | C'est bien, continue. On inspire… |
| fin | Bien joué. Une minute pour toi, ça compte. |

---

## 2. Cohérence cardiaque — 5 min

Cercle : 5 s inspire / 5 s expire (6 respirations par minute), 30 cycles. Un **son doux** marque chaque inspiration et chaque expiration (généré avec `sfx.ts`), la voix ne parle que de temps en temps.

| Moment | Fichier | Texte |
|---|---|---|
| Avant (20 s) | coh_intro | Cinq minutes pour calmer ton cœur et ton stress. Assieds-toi, le dos droit, les pieds au sol. Inspire quand le cercle grandit, expire quand il se resserre, cinq secondes chacun. Un son doux va te guider. |
| Cycles 1 et 2 | coh_inspire / coh_expire | On inspire… / Et on expire… |
| Cycle 7 (≈ 1 min) | coh_1min | C'est bien. Continue, tranquillement. |
| Cycle 16 (moitié) | coh_moitie | Tu es à la moitié. |
| Cycle 25 | coh_derniere | Encore une minute. |
| Fin | coh_fin | Bien joué. Le mieux, c'est trois fois par jour : le matin, avant le repas de midi, et en fin d'après-midi. |

Sons : `son_inspire` (montant, doux, ≈ 1 s) et `son_expire` (descendant, ≈ 1 s).

---

## 3. Ancrage 5-4-3-2-1 — 2 min

Pour quand l'angoisse monte : ramène au moment présent par les sens.

| Étape | Durée | Texte |
|---|---|---|
| anc_1 | 12 s | Quand l'angoisse monte, on revient ici, maintenant. Pose tes pieds bien à plat, et respire une fois, tranquillement. |
| anc_2 | 20 s | Regarde autour de toi. Trouve cinq choses que tu vois. Nomme-les dans ta tête, une par une. |
| anc_3 | 18 s | Maintenant, quatre choses que tu peux toucher. Tes mains, le tissu de tes vêtements, le sol sous tes pieds… |
| anc_4 | 16 s | Trois sons que tu entends. Proches ou lointains. Juste écouter. |
| anc_5 | 14 s | Deux odeurs. Si tu n'en sens aucune, pense à deux odeurs que tu aimes. |
| anc_6 | 12 s | Et une chose que tu peux goûter. Une gorgée d'eau, si tu en as. |
| anc_7 | 14 s | Maintenant, inspire lentement… et expire, plus longtemps. Tu es ici. Ce que tu ressens va redescendre. |
| anc_8 | 10 s | Bien. Tu peux refaire cet exercice chaque fois que ça monte. |

---

## 4. Pour s'endormir — 3 min

Respiration 4-7-8 (4 cycles), puis relâchement. Voix très douce.

| Étape | Durée | Texte |
|---|---|---|
| som_1 | 15 s | Allonge-toi, lumière basse. Cette respiration aide le corps à ralentir. Si la tête te tourne, reviens simplement à ta respiration normale. |
| som_in | 4 s | On inspire par le nez… |
| som_garde | 7 s | Garde l'air… |
| som_out | 8 s | Souffle doucement par la bouche… |
| *(× 4 cycles : som_in, som_garde, som_out)* | 76 s | |
| som_2 | 20 s | Laisse ta respiration redevenir naturelle. Ton corps devient lourd, il s'enfonce dans le lit. |
| som_3 | 20 s | Si des pensées arrivent, laisse-les passer, comme des nuages. Tu n'as rien à régler cette nuit. |
| som_4 | 20 s | Ta mâchoire se détend… tes épaules descendent… tes mains sont lourdes. |
| som_5 | 15 s | Reste là, tranquillement. Bonne nuit. |

À la fin : pas de message bruyant, l'écran s'assombrit.

---

## 5. Relâcher les tensions — 3 min

Contracter puis relâcher, partie par partie.

| Étape | Durée | Texte |
|---|---|---|
| rel_1 | 14 s | Installe-toi confortablement, sur une chaise ou sur ton lit. On va serrer puis relâcher chaque partie du corps. Sans forcer : si une zone te fait mal, passe-la. |
| rel_mains_a | 7 s | Serre les poings, fort… |
| rel_mains_b | 12 s | Relâche. Sens la chaleur qui revient dans tes mains. |
| rel_bras_a | 7 s | Plie les bras et serre-les contre toi… |
| rel_bras_b | 12 s | Relâche. Laisse tes bras tomber, lourds. |
| rel_epaules_a | 7 s | Monte les épaules vers les oreilles… |
| rel_epaules_b | 12 s | Et laisse-les tomber. Tout ce poids descend. |
| rel_visage_a | 7 s | Serre la mâchoire, plisse les yeux… |
| rel_visage_b | 12 s | Relâche. Ton front se détend, ta mâchoire s'entrouvre. |
| rel_ventre_a | 7 s | Rentre le ventre, serre-le… |
| rel_ventre_b | 12 s | Relâche. Ton ventre se gonfle librement quand tu respires. |
| rel_jambes_a | 7 s | Tends les jambes, ramène les orteils vers toi… |
| rel_jambes_b | 12 s | Relâche. Tes jambes sont lourdes, bien posées. |
| rel_2 | 20 s | Respire lentement. Passe ton attention sur tout le corps : s'il reste une tension, souffle dessus en expirant. |
| rel_3 | 10 s | Bien joué. Ton corps sait se détendre, tu viens de le lui rappeler. |

---

## 6. Vocaux de soutien (25 à 40 s, un seul fichier chacun)

Joués comme un message vocal dans la discussion (bouton ▶, texte affiché à côté), jamais en lecture automatique.

**sou_journee — Après une journée lourde**
> Ta journée a été lourde, et tu es encore là. Ça compte. Tu n'as pas besoin de tout régler ce soir. Pose ce que tu portes, juste pour quelques minutes. Bois un peu d'eau, relâche tes épaules, respire un peu plus lentement. Demain, tu y verras plus clair. Et si tu veux en parler, je suis là.

**sou_pensees — Pensées qui tournent**
> Quand les pensées tournent en boucle, on ne les arrête pas de force. On les pose. Nomme ce qui tourne, en une phrase. Puis demande-toi : est-ce que je peux faire quelque chose maintenant ? Si oui, choisis un tout petit geste. Si non, ça peut attendre demain. Ramène ton attention sur tes pieds, sur ta respiration. Les pensées vont repasser. Tu n'as pas à les suivre.

**sou_avant — Avant un moment stressant**
> C'est normal d'avoir le cœur qui bat : ton corps se prépare. Pose tes pieds au sol. Inspire sur quatre temps… *(3 s)* et expire sur six. *(3 s)* Encore une fois. On inspire… *(3 s)* et expire, doucement. *(3 s)* Pense à une chose que tu as déjà réussie, même petite. Tu as ce qu'il faut. Vas-y à ton rythme.

---

## Où ça apparaît

- **Menu « + »** : « Respirer avec moi » devient « Exercices guidés » → petite liste dans la discussion (Respirer 1 min, Cohérence cardiaque 5 min, Ancrage 2 min, Pour s'endormir 3 min, Relâcher les tensions 3 min).
- **Le compagnon les propose au bon moment** avec une carte « ▶ Écouter » :
  - stress, pression → cohérence cardiaque ;
  - angoisse, panique qui monte → ancrage ;
  - sommeil, insomnie, la nuit → pour s'endormir ;
  - corps tendu, douleurs de tension, mâchoire serrée → relâcher les tensions ;
  - journée difficile → sou_journee ; ruminations → sou_pensees ; examen, entretien, discussion difficile → sou_avant.
- **En cas d'alerte (crise)** : rien ne remplace les numéros. L'ancrage peut être proposé **sous** la carte des numéros, jamais à sa place.


---

**Généré le 6 nov. 2026** : `public/audio/{coherence,ancrage,sommeil,relacher,soutien}/*.mp3`, par `promo/scripts/vocaux.ts` (les textes du script font foi). « Respirer 1 min » garde ses fichiers de `public/audio/respirer/`.

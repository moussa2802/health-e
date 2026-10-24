/** Les images des 12 totems (un seul endroit pour l'accueil, le programme et la page totem). */
import type { TotemAnimal } from '../utils/totemAlgorithm';
import lionImg from '../assets/totems/lion.jpg';
import loupImg from '../assets/totems/loup.jpg';
import cerfImg from '../assets/totems/cerf.jpg';
import dauphinImg from '../assets/totems/dauphin.jpg';
import tortueImg from '../assets/totems/tortue.jpg';
import hibouImg from '../assets/totems/hibou.jpg';
import aigleImg from '../assets/totems/aigle.jpg';
import elephantImg from '../assets/totems/elephant.jpg';
import panthereImg from '../assets/totems/panthere.jpg';
import renardImg from '../assets/totems/renard.jpg';
import chevalImg from '../assets/totems/cheval.jpg';
import oursImg from '../assets/totems/ours.jpg';

export const TOTEM_IMAGES: Record<TotemAnimal, string> = {
  lion: lionImg, loup: loupImg, cerf: cerfImg, dauphin: dauphinImg,
  tortue: tortueImg, hibou: hibouImg, aigle: aigleImg, elephant: elephantImg,
  panthere: panthereImg, renard: renardImg, cheval: chevalImg, ours: oursImg,
};

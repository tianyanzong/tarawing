import type { StaticImageData } from 'next/image';
import type { Card } from './types';
import { resolveCardArtDescriptor } from './cardArt';

import tarot00 from '@/app/assets/images/tarot/00-TheFool.webp';
import tarot01 from '@/app/assets/images/tarot/01-TheMagician.webp';
import tarot02 from '@/app/assets/images/tarot/02-TheHighPriestess.webp';
import tarot03 from '@/app/assets/images/tarot/03-TheEmpress.webp';
import tarot04 from '@/app/assets/images/tarot/04-TheEmperor.webp';
import tarot05 from '@/app/assets/images/tarot/05-TheHierophant.webp';
import tarot06 from '@/app/assets/images/tarot/06-TheLovers.webp';
import tarot07 from '@/app/assets/images/tarot/07-TheChariot.webp';
import tarot08 from '@/app/assets/images/tarot/08-Strength.webp';
import tarot09 from '@/app/assets/images/tarot/09-TheHermit.webp';
import tarot10 from '@/app/assets/images/tarot/10-WheelOfFortune.webp';
import tarot11 from '@/app/assets/images/tarot/11-Justice.webp';
import tarot12 from '@/app/assets/images/tarot/12-TheHangedMan.webp';
import tarot13 from '@/app/assets/images/tarot/13-Death.webp';
import tarot14 from '@/app/assets/images/tarot/14-Temperance.webp';
import tarot15 from '@/app/assets/images/tarot/15-TheDevil.webp';
import tarot16 from '@/app/assets/images/tarot/16-TheTower.webp';
import tarot17 from '@/app/assets/images/tarot/17-TheStar.webp';
import tarot18 from '@/app/assets/images/tarot/18-TheMoon.webp';
import tarot19 from '@/app/assets/images/tarot/19-TheSun.webp';
import tarot20 from '@/app/assets/images/tarot/20-Judgement.webp';
import tarot21 from '@/app/assets/images/tarot/21-TheWorld.webp';

import cups01 from '@/app/assets/images/tarot/Cups01.webp';
import cups02 from '@/app/assets/images/tarot/Cups02.webp';
import cups03 from '@/app/assets/images/tarot/Cups03.webp';
import cups04 from '@/app/assets/images/tarot/Cups04.webp';
import cups05 from '@/app/assets/images/tarot/Cups05.webp';
import cups06 from '@/app/assets/images/tarot/Cups06.webp';
import cups07 from '@/app/assets/images/tarot/Cups07.webp';
import cups08 from '@/app/assets/images/tarot/Cups08.webp';
import cups09 from '@/app/assets/images/tarot/Cups09.webp';
import cups10 from '@/app/assets/images/tarot/Cups10.webp';
import cups11 from '@/app/assets/images/tarot/Cups11.webp';
import cups12 from '@/app/assets/images/tarot/Cups12.webp';
import cups13 from '@/app/assets/images/tarot/Cups13.webp';
import cups14 from '@/app/assets/images/tarot/Cups14.webp';

import pentacles01 from '@/app/assets/images/tarot/Pentacles01.webp';
import pentacles02 from '@/app/assets/images/tarot/Pentacles02.webp';
import pentacles03 from '@/app/assets/images/tarot/Pentacles03.webp';
import pentacles04 from '@/app/assets/images/tarot/Pentacles04.webp';
import pentacles05 from '@/app/assets/images/tarot/Pentacles05.webp';
import pentacles06 from '@/app/assets/images/tarot/Pentacles06.webp';
import pentacles07 from '@/app/assets/images/tarot/Pentacles07.webp';
import pentacles08 from '@/app/assets/images/tarot/Pentacles08.webp';
import pentacles09 from '@/app/assets/images/tarot/Pentacles09.webp';
import pentacles10 from '@/app/assets/images/tarot/Pentacles10.webp';
import pentacles11 from '@/app/assets/images/tarot/Pentacles11.webp';
import pentacles12 from '@/app/assets/images/tarot/Pentacles12.webp';
import pentacles13 from '@/app/assets/images/tarot/Pentacles13.webp';
import pentacles14 from '@/app/assets/images/tarot/Pentacles14.webp';

import swords01 from '@/app/assets/images/tarot/Swords01.webp';
import swords02 from '@/app/assets/images/tarot/Swords02.webp';
import swords03 from '@/app/assets/images/tarot/Swords03.webp';
import swords04 from '@/app/assets/images/tarot/Swords04.webp';
import swords05 from '@/app/assets/images/tarot/Swords05.webp';
import swords06 from '@/app/assets/images/tarot/Swords06.webp';
import swords07 from '@/app/assets/images/tarot/Swords07.webp';
import swords08 from '@/app/assets/images/tarot/Swords08.webp';
import swords09 from '@/app/assets/images/tarot/Swords09.webp';
import swords10 from '@/app/assets/images/tarot/Swords10.webp';
import swords11 from '@/app/assets/images/tarot/Swords11.webp';
import swords12 from '@/app/assets/images/tarot/Swords12.webp';
import swords13 from '@/app/assets/images/tarot/Swords13.webp';
import swords14 from '@/app/assets/images/tarot/Swords14.webp';

import wands01 from '@/app/assets/images/tarot/Wands01.webp';
import wands02 from '@/app/assets/images/tarot/Wands02.webp';
import wands03 from '@/app/assets/images/tarot/Wands03.webp';
import wands04 from '@/app/assets/images/tarot/Wands04.webp';
import wands05 from '@/app/assets/images/tarot/Wands05.webp';
import wands06 from '@/app/assets/images/tarot/Wands06.webp';
import wands07 from '@/app/assets/images/tarot/Wands07.webp';
import wands08 from '@/app/assets/images/tarot/Wands08.webp';
import wands09 from '@/app/assets/images/tarot/Wands09.webp';
import wands10 from '@/app/assets/images/tarot/Wands10.webp';
import wands11 from '@/app/assets/images/tarot/Wands11.webp';
import wands12 from '@/app/assets/images/tarot/Wands12.webp';
import wands13 from '@/app/assets/images/tarot/Wands13.webp';
import wands14 from '@/app/assets/images/tarot/Wands14.webp';

import lenormand01 from '@/app/assets/images/lenormand/01_rider.webp';
import lenormand02 from '@/app/assets/images/lenormand/02_clover.webp';
import lenormand03 from '@/app/assets/images/lenormand/03_ship.webp';
import lenormand04 from '@/app/assets/images/lenormand/04_house.webp';
import lenormand05 from '@/app/assets/images/lenormand/05_tree.webp';
import lenormand06 from '@/app/assets/images/lenormand/06_clouds.webp';
import lenormand07 from '@/app/assets/images/lenormand/07_snake.webp';
import lenormand08 from '@/app/assets/images/lenormand/08_coffin.webp';
import lenormand09 from '@/app/assets/images/lenormand/09_bouquet.webp';
import lenormand10 from '@/app/assets/images/lenormand/10_scythe.webp';
import lenormand11 from '@/app/assets/images/lenormand/11_whip.webp';
import lenormand12 from '@/app/assets/images/lenormand/12_birds.webp';
import lenormand13 from '@/app/assets/images/lenormand/13_child.webp';
import lenormand14 from '@/app/assets/images/lenormand/14_fox.webp';
import lenormand15 from '@/app/assets/images/lenormand/15_bear.webp';
import lenormand16 from '@/app/assets/images/lenormand/16_stars.webp';
import lenormand17 from '@/app/assets/images/lenormand/17_stork.webp';
import lenormand18 from '@/app/assets/images/lenormand/18_dog.webp';
import lenormand19 from '@/app/assets/images/lenormand/19_tower.webp';
import lenormand20 from '@/app/assets/images/lenormand/20_garden.webp';
import lenormand21 from '@/app/assets/images/lenormand/21_mountain.webp';
import lenormand22 from '@/app/assets/images/lenormand/22_path.webp';
import lenormand23 from '@/app/assets/images/lenormand/23_mice.webp';
import lenormand24 from '@/app/assets/images/lenormand/24_heart.webp';
import lenormand25 from '@/app/assets/images/lenormand/25_ring.webp';
import lenormand26 from '@/app/assets/images/lenormand/26_book.webp';
import lenormand27 from '@/app/assets/images/lenormand/27_letter.webp';
import lenormand28 from '@/app/assets/images/lenormand/28_man.webp';
import lenormand29 from '@/app/assets/images/lenormand/29_woman.webp';
import lenormand30 from '@/app/assets/images/lenormand/30_lilies.webp';
import lenormand31 from '@/app/assets/images/lenormand/31_sun.webp';
import lenormand32 from '@/app/assets/images/lenormand/32_moon.webp';
import lenormand33 from '@/app/assets/images/lenormand/33_key.webp';
import lenormand34 from '@/app/assets/images/lenormand/34_fish.webp';
import lenormand35 from '@/app/assets/images/lenormand/35_anchor.webp';
import lenormand36 from '@/app/assets/images/lenormand/36_cross.webp';

import twoClubs from '@/app/assets/images/playing/2_of_clubs.webp';
import twoDiamonds from '@/app/assets/images/playing/2_of_diamonds.webp';
import twoHearts from '@/app/assets/images/playing/2_of_hearts.webp';
import twoSpades from '@/app/assets/images/playing/2_of_spades.webp';
import threeClubs from '@/app/assets/images/playing/3_of_clubs.webp';
import threeDiamonds from '@/app/assets/images/playing/3_of_diamonds.webp';
import threeHearts from '@/app/assets/images/playing/3_of_hearts.webp';
import threeSpades from '@/app/assets/images/playing/3_of_spades.webp';
import fourClubs from '@/app/assets/images/playing/4_of_clubs.webp';
import fourDiamonds from '@/app/assets/images/playing/4_of_diamonds.webp';
import fourHearts from '@/app/assets/images/playing/4_of_hearts.webp';
import fourSpades from '@/app/assets/images/playing/4_of_spades.webp';
import fiveClubs from '@/app/assets/images/playing/5_of_clubs.webp';
import fiveDiamonds from '@/app/assets/images/playing/5_of_diamonds.webp';
import fiveHearts from '@/app/assets/images/playing/5_of_hearts.webp';
import fiveSpades from '@/app/assets/images/playing/5_of_spades.webp';
import sixClubs from '@/app/assets/images/playing/6_of_clubs.webp';
import sixDiamonds from '@/app/assets/images/playing/6_of_diamonds.webp';
import sixHearts from '@/app/assets/images/playing/6_of_hearts.webp';
import sixSpades from '@/app/assets/images/playing/6_of_spades.webp';
import sevenClubs from '@/app/assets/images/playing/7_of_clubs.webp';
import sevenDiamonds from '@/app/assets/images/playing/7_of_diamonds.webp';
import sevenHearts from '@/app/assets/images/playing/7_of_hearts.webp';
import sevenSpades from '@/app/assets/images/playing/7_of_spades.webp';
import eightClubs from '@/app/assets/images/playing/8_of_clubs.webp';
import eightDiamonds from '@/app/assets/images/playing/8_of_diamonds.webp';
import eightHearts from '@/app/assets/images/playing/8_of_hearts.webp';
import eightSpades from '@/app/assets/images/playing/8_of_spades.webp';
import nineClubs from '@/app/assets/images/playing/9_of_clubs.webp';
import nineDiamonds from '@/app/assets/images/playing/9_of_diamonds.webp';
import nineHearts from '@/app/assets/images/playing/9_of_hearts.webp';
import nineSpades from '@/app/assets/images/playing/9_of_spades.webp';
import tenClubs from '@/app/assets/images/playing/10_of_clubs.webp';
import tenDiamonds from '@/app/assets/images/playing/10_of_diamonds.webp';
import tenHearts from '@/app/assets/images/playing/10_of_hearts.webp';
import tenSpades from '@/app/assets/images/playing/10_of_spades.webp';
import aceClubs from '@/app/assets/images/playing/ace_of_clubs.webp';
import aceDiamonds from '@/app/assets/images/playing/ace_of_diamonds.webp';
import aceHearts from '@/app/assets/images/playing/ace_of_hearts.webp';
import aceSpades from '@/app/assets/images/playing/ace_of_spades.webp';
import jackClubs from '@/app/assets/images/playing/jack_of_clubs.webp';
import jackDiamonds from '@/app/assets/images/playing/jack_of_diamonds.webp';
import jackHearts from '@/app/assets/images/playing/jack_of_hearts.webp';
import jackSpades from '@/app/assets/images/playing/jack_of_spades.webp';
import queenClubs from '@/app/assets/images/playing/queen_of_clubs.webp';
import queenDiamonds from '@/app/assets/images/playing/queen_of_diamonds.webp';
import queenHearts from '@/app/assets/images/playing/queen_of_hearts.webp';
import queenSpades from '@/app/assets/images/playing/queen_of_spades.webp';
import kingClubs from '@/app/assets/images/playing/king_of_clubs.webp';
import kingDiamonds from '@/app/assets/images/playing/king_of_diamonds.webp';
import kingHearts from '@/app/assets/images/playing/king_of_hearts.webp';
import kingSpades from '@/app/assets/images/playing/king_of_spades.webp';
import jokerBlack from '@/app/assets/images/playing/joker_black.webp';
import jokerRed from '@/app/assets/images/playing/joker_red.webp';

const TAROT_ART: Record<string, StaticImageData> = {
  '00-TheFool': tarot00,
  '01-TheMagician': tarot01,
  '02-TheHighPriestess': tarot02,
  '03-TheEmpress': tarot03,
  '04-TheEmperor': tarot04,
  '05-TheHierophant': tarot05,
  '06-TheLovers': tarot06,
  '07-TheChariot': tarot07,
  '08-Strength': tarot08,
  '09-TheHermit': tarot09,
  '10-WheelOfFortune': tarot10,
  '11-Justice': tarot11,
  '12-TheHangedMan': tarot12,
  '13-Death': tarot13,
  '14-Temperance': tarot14,
  '15-TheDevil': tarot15,
  '16-TheTower': tarot16,
  '17-TheStar': tarot17,
  '18-TheMoon': tarot18,
  '19-TheSun': tarot19,
  '20-Judgement': tarot20,
  '21-TheWorld': tarot21,
  Cups01: cups01,
  Cups02: cups02,
  Cups03: cups03,
  Cups04: cups04,
  Cups05: cups05,
  Cups06: cups06,
  Cups07: cups07,
  Cups08: cups08,
  Cups09: cups09,
  Cups10: cups10,
  Cups11: cups11,
  Cups12: cups12,
  Cups13: cups13,
  Cups14: cups14,
  Pentacles01: pentacles01,
  Pentacles02: pentacles02,
  Pentacles03: pentacles03,
  Pentacles04: pentacles04,
  Pentacles05: pentacles05,
  Pentacles06: pentacles06,
  Pentacles07: pentacles07,
  Pentacles08: pentacles08,
  Pentacles09: pentacles09,
  Pentacles10: pentacles10,
  Pentacles11: pentacles11,
  Pentacles12: pentacles12,
  Pentacles13: pentacles13,
  Pentacles14: pentacles14,
  Swords01: swords01,
  Swords02: swords02,
  Swords03: swords03,
  Swords04: swords04,
  Swords05: swords05,
  Swords06: swords06,
  Swords07: swords07,
  Swords08: swords08,
  Swords09: swords09,
  Swords10: swords10,
  Swords11: swords11,
  Swords12: swords12,
  Swords13: swords13,
  Swords14: swords14,
  Wands01: wands01,
  Wands02: wands02,
  Wands03: wands03,
  Wands04: wands04,
  Wands05: wands05,
  Wands06: wands06,
  Wands07: wands07,
  Wands08: wands08,
  Wands09: wands09,
  Wands10: wands10,
  Wands11: wands11,
  Wands12: wands12,
  Wands13: wands13,
  Wands14: wands14,
};

const LENORMAND_ART: Record<string, StaticImageData> = {
  '01_rider': lenormand01,
  '02_clover': lenormand02,
  '03_ship': lenormand03,
  '04_house': lenormand04,
  '05_tree': lenormand05,
  '06_clouds': lenormand06,
  '07_snake': lenormand07,
  '08_coffin': lenormand08,
  '09_bouquet': lenormand09,
  '10_scythe': lenormand10,
  '11_whip': lenormand11,
  '12_birds': lenormand12,
  '13_child': lenormand13,
  '14_fox': lenormand14,
  '15_bear': lenormand15,
  '16_stars': lenormand16,
  '17_stork': lenormand17,
  '18_dog': lenormand18,
  '19_tower': lenormand19,
  '20_garden': lenormand20,
  '21_mountain': lenormand21,
  '22_path': lenormand22,
  '23_mice': lenormand23,
  '24_heart': lenormand24,
  '25_ring': lenormand25,
  '26_book': lenormand26,
  '27_letter': lenormand27,
  '28_man': lenormand28,
  '29_woman': lenormand29,
  '30_lilies': lenormand30,
  '31_sun': lenormand31,
  '32_moon': lenormand32,
  '33_key': lenormand33,
  '34_fish': lenormand34,
  '35_anchor': lenormand35,
  '36_cross': lenormand36,
};

const PLAYING_ART: Record<string, StaticImageData> = {
  '2_of_clubs': twoClubs,
  '2_of_diamonds': twoDiamonds,
  '2_of_hearts': twoHearts,
  '2_of_spades': twoSpades,
  '3_of_clubs': threeClubs,
  '3_of_diamonds': threeDiamonds,
  '3_of_hearts': threeHearts,
  '3_of_spades': threeSpades,
  '4_of_clubs': fourClubs,
  '4_of_diamonds': fourDiamonds,
  '4_of_hearts': fourHearts,
  '4_of_spades': fourSpades,
  '5_of_clubs': fiveClubs,
  '5_of_diamonds': fiveDiamonds,
  '5_of_hearts': fiveHearts,
  '5_of_spades': fiveSpades,
  '6_of_clubs': sixClubs,
  '6_of_diamonds': sixDiamonds,
  '6_of_hearts': sixHearts,
  '6_of_spades': sixSpades,
  '7_of_clubs': sevenClubs,
  '7_of_diamonds': sevenDiamonds,
  '7_of_hearts': sevenHearts,
  '7_of_spades': sevenSpades,
  '8_of_clubs': eightClubs,
  '8_of_diamonds': eightDiamonds,
  '8_of_hearts': eightHearts,
  '8_of_spades': eightSpades,
  '9_of_clubs': nineClubs,
  '9_of_diamonds': nineDiamonds,
  '9_of_hearts': nineHearts,
  '9_of_spades': nineSpades,
  '10_of_clubs': tenClubs,
  '10_of_diamonds': tenDiamonds,
  '10_of_hearts': tenHearts,
  '10_of_spades': tenSpades,
  ace_of_clubs: aceClubs,
  ace_of_diamonds: aceDiamonds,
  ace_of_hearts: aceHearts,
  ace_of_spades: aceSpades,
  jack_of_clubs: jackClubs,
  jack_of_diamonds: jackDiamonds,
  jack_of_hearts: jackHearts,
  jack_of_spades: jackSpades,
  queen_of_clubs: queenClubs,
  queen_of_diamonds: queenDiamonds,
  queen_of_hearts: queenHearts,
  queen_of_spades: queenSpades,
  king_of_clubs: kingClubs,
  king_of_diamonds: kingDiamonds,
  king_of_hearts: kingHearts,
  king_of_spades: kingSpades,
  joker_black: jokerBlack,
  joker_red: jokerRed,
};

export function getCardArtAsset(card: Card): StaticImageData | null {
  const descriptor = resolveCardArtDescriptor(card);
  if (!descriptor) return null;

  if (descriptor.deck === 'tarot') return TAROT_ART[descriptor.key] ?? null;
  if (descriptor.deck === 'playing') return PLAYING_ART[descriptor.key] ?? null;
  return LENORMAND_ART[descriptor.key] ?? null;
}

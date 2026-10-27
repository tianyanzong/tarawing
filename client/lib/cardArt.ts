import type { Card } from './types';

export interface CardArtDescriptor {
  deck: 'tarot' | 'playing' | 'lenormand';
  key: string;
}

const LENORMAND_FILES = [
  '01_rider',
  '02_clover',
  '03_ship',
  '04_house',
  '05_tree',
  '06_clouds',
  '07_snake',
  '08_coffin',
  '09_bouquet',
  '10_scythe',
  '11_whip',
  '12_birds',
  '13_child',
  '14_fox',
  '15_bear',
  '16_stars',
  '17_stork',
  '18_dog',
  '19_tower',
  '20_garden',
  '21_mountain',
  '22_path',
  '23_mice',
  '24_heart',
  '25_ring',
  '26_book',
  '27_letter',
  '28_man',
  '29_woman',
  '30_lilies',
  '31_sun',
  '32_moon',
  '33_key',
  '34_fish',
  '35_anchor',
  '36_cross',
] as const;

const TAROT_MAJOR_FILES = [
  '00-TheFool',
  '01-TheMagician',
  '02-TheHighPriestess',
  '03-TheEmpress',
  '04-TheEmperor',
  '05-TheHierophant',
  '06-TheLovers',
  '07-TheChariot',
  '08-Strength',
  '09-TheHermit',
  '10-WheelOfFortune',
  '11-Justice',
  '12-TheHangedMan',
  '13-Death',
  '14-Temperance',
  '15-TheDevil',
  '16-TheTower',
  '17-TheStar',
  '18-TheMoon',
  '19-TheSun',
  '20-Judgement',
  '21-TheWorld',
] as const;

const TAROT_SUIT_PREFIX: Record<string, string> = {
  cups: 'Cups',
  pentacles: 'Pentacles',
  swords: 'Swords',
  wands: 'Wands',
};

const TAROT_RANK_ORDINAL: Record<string, number> = {
  Ace: 1,
  Two: 2,
  Three: 3,
  Four: 4,
  Five: 5,
  Six: 6,
  Seven: 7,
  Eight: 8,
  Nine: 9,
  Ten: 10,
  Page: 11,
  Knight: 12,
  Queen: 13,
  King: 14,
};

const PLAYING_SUIT_FILE: Record<string, string> = {
  hearts: 'hearts',
  diamonds: 'diamonds',
  clubs: 'clubs',
  spades: 'spades',
};

const PLAYING_RANK_FILE: Record<string, string> = {
  A: 'ace',
  J: 'jack',
  Q: 'queen',
  K: 'king',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
};

const JOKER_FILES: Record<string, string> = {
  'black joker': 'joker_black',
  'joker black': 'joker_black',
  'red joker': 'joker_red',
  'joker red': 'joker_red',
};

function resolveTarotArt(card: Card): CardArtDescriptor | null {
  if (card.arcana === 'major') {
    if (card.num == null || !TAROT_MAJOR_FILES[card.num]) return null;
    return { deck: 'tarot', key: TAROT_MAJOR_FILES[card.num] };
  }

  if (card.arcana !== 'minor' || !card.suit || !card.rank) return null;

  const prefix = TAROT_SUIT_PREFIX[card.suit.toLowerCase()];
  const ordinal = TAROT_RANK_ORDINAL[card.rank];
  if (!prefix || !ordinal) return null;

  return {
    deck: 'tarot',
    key: `${prefix}${String(ordinal).padStart(2, '0')}`,
  };
}

function resolvePlayingArt(card: Card): CardArtDescriptor | null {
  const normalizedName = card.name.trim().toLowerCase();
  const jokerFile = JOKER_FILES[normalizedName];
  if (jokerFile) return { deck: 'playing', key: jokerFile };

  if (!card.suit || !card.rank) return null;

  const suit = PLAYING_SUIT_FILE[card.suit.toLowerCase()];
  const rank = PLAYING_RANK_FILE[card.rank.toUpperCase()];
  if (!suit || !rank) return null;

  return { deck: 'playing', key: `${rank}_of_${suit}` };
}

export function resolveCardArtDescriptor(card: Card): CardArtDescriptor | null {
  if (card.n != null) {
    const key = LENORMAND_FILES[card.n - 1];
    if (key) return { deck: 'lenormand', key };
  }

  return resolveTarotArt(card) ?? resolvePlayingArt(card);
}

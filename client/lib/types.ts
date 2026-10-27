export type ReadingType =
  | 'astrology_natal' | 'tarot' | 'lenormand' | 'playing_cards'
  | 'holy_triangle' | 'gypsy_cross' | 'hexagram' | 'solomon_star' | 'seven_planets';

export interface Card {
  name: string;
  meaning: string;
  reversed?: boolean;
  arcana?: 'major' | 'minor';
  suit?: string;
  rank?: string;
  num?: number; // Major Arcana index (0-21), used to resolve the card artwork
  n?: number; // Lenormand card number (1-36), used to resolve the card artwork
}

export interface DrawnCard {
  position: string;
  card: Card;
}

export interface SpreadResult {
  spread?: string;
  label?: string;
  deck: string;
  cards: DrawnCard[];
}

export interface ZodiacPoint {
  sign: string;
  degreeInSign: number;
  longitude: number;
  precisionNote?: string;
}

export interface NatalChartResult {
  utcDate: string;
  sun: ZodiacPoint;
  moon: ZodiacPoint;
  ascendant: ZodiacPoint | null;
  caveats: string[];
  planetsNote: string;
}

export type ReadingCategory = 'tarot' | 'astrology' | 'spreads';

export interface ReadingSummary {
  id: string;
  type: ReadingType;
  category: ReadingCategory | null;
  question: string | null;
  status: string;
  resultBasic: SpreadResult | NatalChartResult;
  deepInsightsReport: string | null;
  createdAt: string;
}

export interface DeepInsightsState {
  ordered: boolean;
  paid: boolean;
  ready: boolean;
  pending: boolean; // paid, but report not generated yet (manual or failed auto-gen)
  report: string | null;
  orderId: string | null; // a pending (unpaid) order's id, if one exists
}

export interface ReadingPricing {
  detailCents: number;
  deepInsightsCents: number;
}

/** The full shape returned by GET /api/readings/:id — drives the whole
 * free-report -> paid-detail -> paid-deep-insights UI pipeline. */
export interface ReadingView {
  id: string;
  type: ReadingType;
  category: ReadingCategory | null;
  question: string | null;
  status: string;
  createdAt: string;
  owned: boolean;
  resultBasic: SpreadResult | NatalChartResult | null;
  simpleReport: string | null;
  detailedUnlocked: boolean;
  detailedReport: string | null;
  deepInsights: DeepInsightsState;
  pricing: ReadingPricing | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  lastActive?: string | null;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  category: string;
  createdAt: string;
}

export interface Article extends ArticleSummary {
  body: string;
  published?: boolean;
  updatedAt?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder?: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  readingId: string | null;
  productCode: string;
  amountCents: number;
  currency: string;
  channel: string | null;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminReadingSummary {
  id: string;
  userId: string | null;
  type: string;
  question: string | null;
  status: string;
  createdAt: string;
}

export interface AdminReadingDetail extends AdminReadingSummary {
  resultBasic: unknown;
  simpleReport: string | null;
  detailedReport: string | null;
  deepInsightsReport: string | null;
  adminNotes: string | null;
}

export interface AdminAccount {
  id: string;
  username: string;
  role: string;
  permissions: string[];
  status: string;
  createdAt: string;
}

export interface Consultation {
  id: string;
  name: string | null;
  contact: string | null;
  question: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
}

export interface DeepInsightsQueueItem {
  orderId: string;
  productCode: string;
  amountCents: number;
  paidAt: string;
  readingId: string;
  type: string;
  question: string | null;
  readingCreatedAt: string;
  category: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

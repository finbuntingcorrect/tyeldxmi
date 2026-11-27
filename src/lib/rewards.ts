import type { Notebook } from './notebook';
import type { TreatKind } from './focusSession';

export type RewardId =
  | 'violet-bag'
  | 'black-bag'
  | 'fish-can'
  | 'treat-jar'
  | 'chicken'
  | 'fish-cracker'
  | 'bone'
  | 'mouse'
  | 'ball'
  | 'wand'
  | 'scrunchie'
  | 'sock';

export type RewardShelf = 'top' | 'middle' | 'bottom';

export type RewardItem = {
  id: RewardId;
  name: string;
  brought: string;
  shelf: RewardShelf;
  /** Share of 200 so the six foods, four toys, and two odds sum to 100%. */
  weight: number;
};

export type FocusReward = {
  signalId: string;
  itemId: RewardId;
  food: TreatKind;
  date: string;
};

export const REWARD_CABINET = '/assets/today-cat/rewards/cabinet.png';
export const CABINET_RATIO = 1315 / 1196;
const REWARD_LIMIT = 2000;

/** One catalog for names, shelves, and weights. Foods 20/200, toys 15/200, odds 10/200. */
export const REWARD_ITEMS: RewardItem[] = [
  { id: 'violet-bag', name: 'Фиолетовый пакет корма', brought: 'фиолетовый пакет корма', shelf: 'top', weight: 20 },
  { id: 'black-bag', name: 'Чёрно-золотой пакет корма', brought: 'чёрно-золотой пакет корма', shelf: 'top', weight: 20 },
  { id: 'fish-can', name: 'Рыбные консервы', brought: 'рыбные консервы', shelf: 'top', weight: 20 },
  { id: 'treat-jar', name: 'Баночка лакомств', brought: 'баночку лакомств', shelf: 'top', weight: 20 },
  { id: 'chicken', name: 'Курочка', brought: 'курочку', shelf: 'middle', weight: 20 },
  { id: 'fish-cracker', name: 'Рыбка-лакомство', brought: 'рыбку-лакомство', shelf: 'middle', weight: 20 },
  { id: 'bone', name: 'Игрушечная косточка', brought: 'игрушечную косточку', shelf: 'middle', weight: 15 },
  { id: 'mouse', name: 'Игрушечная мышка', brought: 'игрушечную мышку', shelf: 'middle', weight: 15 },
  { id: 'ball', name: 'Мячик', brought: 'мячик', shelf: 'bottom', weight: 15 },
  { id: 'wand', name: 'Удочка с перьями', brought: 'удочку с перьями', shelf: 'bottom', weight: 15 },
  { id: 'scrunchie', name: 'Резинка для волос', brought: 'резинку для волос', shelf: 'bottom', weight: 10 },
  { id: 'sock', name: 'Украденный носок', brought: 'украденный носок', shelf: 'bottom', weight: 10 },
];

const ITEM_IDS = new Set<string>(REWARD_ITEMS.map((item) => item.id));
const SHELVES: Record<RewardShelf, { top: number; bottom: number }> = {
  top: { top: 0.268, bottom: 0.404 },
  middle: { top: 0.484, bottom: 0.619 },
  bottom: { top: 0.701, bottom: 0.832 },
};
const SHELF_LEFT = 0.142;
const SHELF_RIGHT = 0.857;

export function rewardItem(id: string): RewardItem | null {
  return REWARD_ITEMS.find((item) => item.id === id) ?? null;
}

export function rewardSrc(id: RewardId) {
  return `/assets/today-cat/rewards/${id}.png`;
}

export function rewardWeightTotal() {
  return REWARD_ITEMS.reduce((sum, item) => sum + item.weight, 0);
}

/** Fractions of the cabinet image. The same box is used at every screen size. */
export function rewardSlot(id: RewardId) {
  const index = REWARD_ITEMS.findIndex((item) => item.id === id);
  const item = REWARD_ITEMS[index];
  const column = index % 4;
  const band = SHELVES[item.shelf];
  const span = (SHELF_RIGHT - SHELF_LEFT) / 4;
  const insetX = span * 0.08;
  const insetY = (band.bottom - band.top) * 0.08;
  return {
    left: SHELF_LEFT + column * span + insetX,
    top: band.top + insetY,
    width: span - insetX * 2,
    height: band.bottom - band.top - insetY * 2,
  };
}

export function pickFood(random: () => number): TreatKind {
  return random() < 0.5 ? 'whiskas' : 'sheba';
}

export function pickItem(random: () => number): RewardItem {
  const total = rewardWeightTotal();
  let ticket = Math.floor(random() * total);
  if (!Number.isFinite(ticket) || ticket < 0) ticket = 0;
  if (ticket >= total) ticket = total - 1;
  let cursor = 0;
  for (const item of REWARD_ITEMS) {
    cursor += item.weight;
    if (ticket < cursor) return item;
  }
  return REWARD_ITEMS[REWARD_ITEMS.length - 1];
}

export function rewardCounts(rewards: FocusReward[]) {
  const counts = new Map<RewardId, number>();
  for (const reward of rewards) counts.set(reward.itemId, (counts.get(reward.itemId) ?? 0) + 1);
  return counts;
}

export function parseRewards(value: unknown): FocusReward[] {
  if (!Array.isArray(value)) return [];
  const rewards: FocusReward[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    if (!validSignal(raw.signalId) || typeof raw.itemId !== 'string' || !ITEM_IDS.has(raw.itemId)) continue;
    if (raw.food !== 'whiskas' && raw.food !== 'sheba') continue;
    if (typeof raw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) continue;
    if (seen.has(raw.signalId)) continue;
    seen.add(raw.signalId);
    rewards.push({ signalId: raw.signalId, itemId: raw.itemId as RewardId, food: raw.food, date: raw.date });
    if (rewards.length >= REWARD_LIMIT) break;
  }
  return rewards;
}

export function validSignal(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9-]{8,80}$/.test(value);
}

export function validRewardDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export type GrantResult = {
  book: Notebook;
  reward: FocusReward | null;
  created: boolean;
  error: 'invalid' | 'ineligible' | 'full' | null;
};

/** One reward per focus signal. A repeat returns the stored roll and does not increment again. */
export function grantReward(book: Notebook, signalId: string, date: string, random: () => number): GrantResult {
  if (!validSignal(signalId) || !validRewardDate(date)) return { book, reward: null, created: false, error: 'invalid' };
  const existing = book.rewards.find((reward) => reward.signalId === signalId);
  if (existing) return { book, reward: existing, created: false, error: null };
  const session = book.focusSession;
  const eligible = session != null
    && session.signalId === signalId
    && session.phase === 'focus'
    && session.settled
    && session.full
    && session.paused !== true;
  if (!eligible) return { book, reward: null, created: false, error: 'ineligible' };
  if (book.rewards.length >= REWARD_LIMIT) return { book, reward: null, created: false, error: 'full' };
  const reward: FocusReward = { signalId, itemId: pickItem(random).id, food: pickFood(random), date };
  return { book: { ...book, rewards: [...book.rewards, reward] }, reward, created: true, error: null };
}

export function broughtLine(id: RewardId) {
  const item = rewardItem(id);
  return item ? `Кот принёс: ${item.brought}` : '';
}

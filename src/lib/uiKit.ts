/** Separate PNGs from the Today Cat UI kit. Looped preview.webp files are not used. */

const root = '/assets/today-cat';

export const BUTTON_KINDS = ['add', 'play', 'pause', 'sound-on', 'sound-off'] as const;
export const BUTTON_STATES = ['default', 'hover', 'pressed', 'disabled'] as const;

export type PixelButtonKind = (typeof BUTTON_KINDS)[number];
export type PixelButtonState = (typeof BUTTON_STATES)[number];
export type FeedKind = 'basic' | 'whiskas' | 'sheba';

/** Frame durations from feeding/{basic,whiskas,sheba}/timing.json. Play once. */
export const FEED_FRAME_MS = [500, 350, 180, 650, 350, 900] as const;

export function buttonSrc(kind: PixelButtonKind, state: PixelButtonState) {
  return `${root}/buttons/${kind}-${state}.png`;
}

export function feedFrames(kind: FeedKind) {
  return [1, 2, 3, 4, 5, 6].map((frame) => `${root}/feeding/${kind}/frame-0${frame}.png`);
}

export const uiKit = {
  arrow: {
    previous: `${root}/arrows/previous.png`,
    next: `${root}/arrows/next.png`,
  },
  icon: {
    check: `${root}/icons/check.png`,
    cross: `${root}/icons/cross.png`,
    settings: `${root}/icons/settings-paw.png`,
  },
  tab: {
    diary: `${root}/tabs/diary.png`,
    habits: `${root}/tabs/habits.png`,
    focus: `${root}/tabs/focus.png`,
    today: `${root}/tabs/today.png`,
  },
  empty: {
    tasks: `${root}/empty-states/tasks-pencil.png`,
    habits: `${root}/empty-states/habits-blank-page.png`,
  },
  paw: [`${root}/loading/paw-1.png`, `${root}/loading/paw-2.png`, `${root}/loading/paw-3.png`],
};

const warmed = new Set<string>();

export function warmImages(urls: readonly string[]) {
  if (typeof window === 'undefined') return;
  for (const url of urls) {
    if (warmed.has(url)) continue;
    warmed.add(url);
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
  }
}

export function buttonSources() {
  return BUTTON_KINDS.flatMap((kind) => BUTTON_STATES.map((state) => buttonSrc(kind, state)));
}

export function cabinetSources() {
  return [
    ...buttonSources(),
    uiKit.arrow.previous,
    uiKit.arrow.next,
    uiKit.icon.check,
    uiKit.icon.cross,
    uiKit.icon.settings,
    uiKit.tab.diary,
    uiKit.tab.habits,
    uiKit.tab.focus,
    uiKit.tab.today,
    uiKit.empty.tasks,
    uiKit.empty.habits,
    ...uiKit.paw,
  ];
}

export function feedingSources() {
  return (['basic', 'whiskas', 'sheba'] as const).flatMap((kind) => feedFrames(kind));
}

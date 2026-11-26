declare module 'page-flip' {
  export interface PageFlipSettings {
    width: number;
    height: number;
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
  }

  export type PageFlipPoint = { x: number; y: number };
  export type PageFlipEvent = { data: number | string };

  export class PageFlip {
    constructor(element: HTMLElement, settings: Record<string, number | string | boolean>);
    loadFromHTML(items: HTMLElement[]): void;
    destroy(): void;
    update(): void;
    flipNext(corner?: 'top' | 'bottom'): void;
    flipPrev(corner?: 'top' | 'bottom'): void;
    turnToPage(page: number): void;
    getState(): string;
    getSettings(): PageFlipSettings;
    getBoundsRect(): { left: number; top: number; width: number; height: number; pageWidth: number };
    getUI(): { getDistElement(): HTMLElement };
    on(event: string, callback: (event: PageFlipEvent) => void): this;
    off(event: string): void;
    startUserTouch(pos: PageFlipPoint): void;
    userMove(pos: PageFlipPoint, isTouch: boolean): void;
    userStop(pos: PageFlipPoint, isSwipe?: boolean): void;
  }
}

import type { StandFrame } from '../game/stand';

export function watchStandFrame(
  hud: HTMLElement,
  game: HTMLElement,
  onChange: (frame: StandFrame) => void,
): () => void {
  const ticket = hud.querySelector<HTMLElement>('.ticket');
  const tray = hud.querySelector<HTMLElement>('.tray');
  if (!ticket || !tray) return () => undefined;
  const measure = (): void => {
    const origin = game.getBoundingClientRect().top;
    onChange({
      top: ticket.getBoundingClientRect().bottom - origin,
      counter: tray.getBoundingClientRect().top - origin,
    });
  };
  const observer = new ResizeObserver(measure);
  for (const element of [hud, ticket, tray]) observer.observe(element);
  measure();
  return () => observer.disconnect();
}

export type PopKind = 'score' | 'combo' | 'go' | 'hint';

const POP_MS = 1_000;

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function popText(layer: HTMLElement, text: string, kind: PopKind): void {
  const pop = document.createElement('span');
  pop.className = `pop pop-${kind}`;
  pop.textContent = text;
  layer.append(pop);
  window.setTimeout(() => pop.remove(), POP_MS);
}

export function popArt(layer: HTMLElement, markup: string): void {
  const pop = document.createElement('span');
  pop.className = 'pop pop-dish';
  pop.innerHTML = markup;
  layer.append(pop);
  window.setTimeout(() => pop.remove(), POP_MS);
}

export function flyArt(
  layer: HTMLElement,
  from: Element,
  to: Element | null,
  markup: string,
): void {
  if (!to || prefersReducedMotion()) return;
  const start = center(from.getBoundingClientRect());
  const end = center(to.getBoundingClientRect());
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const fly = document.createElement('span');
  fly.className = 'fly';
  fly.innerHTML = markup;
  fly.style.left = `${start.x}px`;
  fly.style.top = `${start.y}px`;
  layer.append(fly);
  const animation = fly.animate(
    [
      { transform: 'translate(-50%, -50%) scale(1)' },
      {
        transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 50}px)) scale(1.4)`,
        offset: 0.5,
      },
      {
        transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`,
        opacity: 0.3,
      },
    ],
    { duration: 420, easing: 'ease-in' },
  );
  animation.onfinish = () => fly.remove();
}

export function flashTile(button: HTMLElement): void {
  button.classList.remove('miss');
  void button.offsetWidth;
  button.classList.add('miss');
  window.setTimeout(() => button.classList.remove('miss'), 450);
}

export function buzz(ms: number): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Vibration is optional and unavailable in some frames.
  }
}

function center(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

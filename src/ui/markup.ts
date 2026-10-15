import { ingredientById, type IngredientId } from '../core/recipes';
import type { PlatformLeaderboard } from '../platform/types';
import { ingredientArt } from './art';
import type { Presentation } from './view';

export function playerRow(presentation: Presentation): string {
  const avatar = presentation.avatarUrl
    ? `<img class="avatar" alt="" src="${escapeHtml(presentation.avatarUrl)}" />`
    : '<span class="avatar" aria-hidden="true">👩🏾‍🍳</span>';
  const best =
    presentation.personalBest === null
      ? ''
      : `<p class="best-chip" data-testid="personal-best"><span aria-hidden="true">🏆</span> Best ${presentation.personalBest}</p>`;
  return `<div class="player">${avatar}<p class="player-name" data-testid="player-name">${escapeHtml(presentation.playerName)}</p>${best}</div>`;
}

export function noticeBlock(notice: string | null): string {
  if (!notice) return '';
  return `<p class="banner" data-testid="platform-notice">${escapeHtml(notice)}</p>`;
}

export function stepChip(id: IngredientId, picked: boolean, chopping: boolean): string {
  const state = chopping ? 'chopping' : picked ? 'done' : '';
  return `<li class="chip ${state}" data-ingredient="${id}">${ingredientArt(id, 'chip-art')}${ingredientById(id).label}</li>`;
}

export function purchaseButton(presentation: Presentation): string {
  if (!presentation.canPurchase) return '';
  const owned = presentation.theme === 'ankara';
  return `<button class="secondary" type="button" data-action="purchase" data-testid="purchase" ${owned ? 'disabled' : ''}>${owned ? 'Ankara counter owned' : 'Ankara counter'}</button>`;
}

export function leaderboardBlock(board: PlatformLeaderboard | null): string {
  if (!board || board.top.length === 0) return '';
  const rows = board.top
    .slice(0, 5)
    .map(
      (entry) =>
        `<li><span class="rank">#${entry.rank}</span><span class="name">${escapeHtml(entry.name)}</span><strong>${entry.score}</strong></li>`,
    )
    .join('');
  const me = board.me ? `<p class="me">Your place: ${escapeHtml(board.me.label)}</p>` : '';
  return `<section class="leaderboard" data-testid="leaderboard"><h3>Leaderboard</h3><ol>${rows}</ol>${me}</section>`;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return replacements[character] ?? character;
  });
}

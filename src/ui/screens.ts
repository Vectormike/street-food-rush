import type { RecipeId } from '../core/recipes';
import { accuracy } from '../core/shift';
import type { ShiftState } from '../core/state';
import { formatAccuracy } from '../core/time';
import { mealArt } from './art';
import { escapeHtml, leaderboardBlock, noticeBlock, playerRow, purchaseButton } from './markup';
import { cashChip, naira, shopButton } from './shop';
import type { Presentation } from './view';

const HERO_DISHES: RecipeId[] = ['jollof', 'egusi', 'puffpuff'];

export function menuCard(state: ShiftState, presentation: Presentation): string {
  const dishes = HERO_DISHES.map((id) => `<span>${mealArt(id, 'hero-art')}</span>`).join('');
  return `
    <section class="card menu" aria-labelledby="menu-title">
      <div class="hero" aria-hidden="true">${dishes}</div>
      <p class="eyebrow" data-testid="mode-label">${escapeHtml(presentation.modeLabel)}</p>
      <h2 id="menu-title" class="title">Street Food <em>Rush</em></h2>
      <p class="lede">Chop, cook and serve jollof, suya, egusi and more. Earn money to grow your kitchen.</p>
      ${playerRow(presentation)}
      ${cashChip(presentation.cash)}
      ${noticeBlock(presentation.notice)}
      ${purchaseButton(presentation)}
      <button class="primary" type="button" data-action="start" data-testid="start-shift">Start shift</button>
      <ol class="how">
        <li><b>1</b>Read the order ticket</li>
        <li><b>2</b>Pick the ingredients and chop the fresh ones</li>
        <li><b>3</b>Cook on a burner and serve before it burns</li>
      </ol>
      ${shopButton(state.kit, presentation.cash)}
      <p class="links"><a href="/privacy.html">Privacy</a><a href="/support.html">Support</a></p>
    </section>
  `;
}

export function pausedCard(): string {
  return `
    <section class="card compact" aria-labelledby="paused-title">
      <div class="hero small" aria-hidden="true"><span>⏸️</span></div>
      <h2 id="paused-title">Paused</h2>
      <p class="lede">The pot is off the heat. The timer and sound are stopped.</p>
      <button class="primary" type="button" data-action="resume" data-testid="resume">Resume</button>
    </section>
  `;
}

export function resultsCard(state: ShiftState, presentation: Presentation): string {
  const badge = presentation.newBest ? '<p class="badge">New personal best</p>' : '';
  return `
    <section class="card" aria-labelledby="results-title" data-testid="results">
      <p class="eyebrow">Shift complete</p>
      <h2 id="results-title" class="score-total">${state.score}<small>points</small></h2>
      ${badge}
      <p class="earned" data-testid="earned">+${naira(presentation.earned ?? 0)} earned · ${naira(presentation.cash)} saved</p>
      <dl class="stats">
        ${stat('🍽️', 'Orders served', String(state.served), 'orders-served')}
        ${stat('🎯', 'Accuracy', formatAccuracy(accuracy(state)), 'accuracy')}
        ${stat('🔥', 'Best combo', String(state.bestCombo), 'best-combo')}
        ${stat('🏆', 'Personal best', String(presentation.personalBest ?? '—'), 'personal-best')}
      </dl>
      ${leaderboardBlock(presentation.leaderboard)}
      ${noticeBlock(presentation.notice)}
      <button class="primary" type="button" data-action="retry" data-testid="retry">Play again</button>
      ${shopButton(state.kit, presentation.cash)}
    </section>
  `;
}

function stat(icon: string, label: string, value: string, testId: string): string {
  return `<div><dt><span aria-hidden="true">${icon}</span>${label}</dt><dd data-testid="${testId}">${value}</dd></div>`;
}

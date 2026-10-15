import { GameController } from './app';
import { readDuration, readServerUrl } from './config';
import './ui/styles/base.css';
import './ui/styles/screens.css';
import './ui/styles/hud.css';
import './ui/styles/pantry.css';
import './ui/styles/tray.css';
import './ui/styles/stove.css';
import './ui/styles/kitchen.css';
import './ui/styles/shop.css';
import { AudioBus } from './game/audio';
import { createPlatform } from './platform/create';
import { browserSaveStore } from './platform/save';
import { GameView } from './ui/view';

async function main(): Promise<void> {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('Missing app root');
  const view = new GameView(root);
  const startup = await createPlatform();
  const controller = new GameController(
    view,
    startup.platform,
    new AudioBus(),
    browserSaveStore(),
    readServerUrl(),
    readDuration(),
    startup.player,
    startup.notice,
    startup.personalBest,
  );
  await controller.start();
}

void main();

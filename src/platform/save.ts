import { parseSave, type KitchenSave } from '../core/kit';

export interface SaveStore {
  read(): KitchenSave;
  write(save: KitchenSave): void;
}

export function browserSaveStore(): SaveStore {
  const key = 'street-food-rush-kitchen';
  return {
    read() {
      try {
        return parseSave(JSON.parse(localStorage.getItem(key) ?? 'null'));
      } catch {
        return parseSave(null);
      }
    },
    write(save: KitchenSave) {
      try {
        localStorage.setItem(key, JSON.stringify(save));
      } catch {
        // Progress stays in memory when storage is unavailable.
      }
    },
  };
}

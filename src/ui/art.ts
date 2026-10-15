import ingredientsUrl from '../assets/ingredients.webp';
import mealsUrl from '../assets/meals.webp';
import { INGREDIENTS, RECIPES, type IngredientId, type RecipeId } from '../core/recipes';

export const MEAL_SHEET = { url: mealsUrl, cols: 4, rows: 3, frame: 160 };
const INGREDIENT_SHEET = { url: ingredientsUrl, cols: 6, rows: 4, frame: 96 };

export function mealIndex(id: RecipeId): number {
  return RECIPES.findIndex((recipe) => recipe.id === id);
}

export function mealArt(id: RecipeId, className: string): string {
  return art(MEAL_SHEET, mealIndex(id), className);
}

export function ingredientArt(id: IngredientId, className: string): string {
  const index = INGREDIENTS.findIndex((ingredient) => ingredient.id === id);
  return art(INGREDIENT_SHEET, index, className);
}

function art(sheet: typeof INGREDIENT_SHEET, index: number, className: string): string {
  const x = ((index % sheet.cols) / (sheet.cols - 1)) * 100;
  const y = (Math.floor(index / sheet.cols) / (sheet.rows - 1)) * 100;
  const style = [
    `background-image:url(${sheet.url})`,
    `background-size:${sheet.cols * 100}% ${sheet.rows * 100}%`,
    `background-position:${x}% ${y}%`,
  ].join(';');
  return `<span class="art ${className}" aria-hidden="true" style="${style}"></span>`;
}

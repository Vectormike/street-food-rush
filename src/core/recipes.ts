export type IngredientId =
  | 'rice'
  | 'ofada'
  | 'yamflour'
  | 'poundo'
  | 'flour'
  | 'bread'
  | 'chicken'
  | 'beef'
  | 'goat'
  | 'egg'
  | 'beans'
  | 'egusi'
  | 'tomato'
  | 'pepper'
  | 'onion'
  | 'ewedu'
  | 'veggies'
  | 'plantain'
  | 'yaji'
  | 'palmoil'
  | 'oil'
  | 'sugar';

export type RecipeId =
  | 'jollof'
  | 'suya'
  | 'amala'
  | 'egusi'
  | 'puffpuff'
  | 'moimoi'
  | 'friedrice'
  | 'dodo'
  | 'peppersoup'
  | 'akara'
  | 'ofada';

export interface Recipe {
  id: RecipeId;
  name: string;
  basePoints: number;
  ingredients: IngredientId[];
}

export interface Ingredient {
  id: IngredientId;
  label: string;
  chop?: true;
}

export const INGREDIENTS: Ingredient[] = [
  { id: 'rice', label: 'Rice' },
  { id: 'ofada', label: 'Ofada rice' },
  { id: 'yamflour', label: 'Yam flour' },
  { id: 'poundo', label: 'Pounded yam' },
  { id: 'flour', label: 'Flour' },
  { id: 'bread', label: 'Agege bread' },
  { id: 'chicken', label: 'Chicken' },
  { id: 'beef', label: 'Beef' },
  { id: 'goat', label: 'Goat meat' },
  { id: 'egg', label: 'Egg' },
  { id: 'beans', label: 'Beans' },
  { id: 'egusi', label: 'Egusi' },
  { id: 'tomato', label: 'Tomato', chop: true },
  { id: 'pepper', label: 'Pepper', chop: true },
  { id: 'onion', label: 'Onion', chop: true },
  { id: 'ewedu', label: 'Ewedu', chop: true },
  { id: 'veggies', label: 'Carrot & peas', chop: true },
  { id: 'plantain', label: 'Plantain', chop: true },
  { id: 'yaji', label: 'Yaji spice' },
  { id: 'palmoil', label: 'Palm oil' },
  { id: 'oil', label: 'Frying oil' },
  { id: 'sugar', label: 'Sugar' },
];

export const PANTRY_SHELVES: { label: string; tab: string; items: IngredientId[] }[] = [
  {
    label: 'Dry goods',
    tab: '🌾 Dry',
    items: ['rice', 'ofada', 'beans', 'egusi', 'flour', 'bread'],
  },
  {
    label: 'Swallow & protein',
    tab: '🍗 Protein',
    items: ['yamflour', 'poundo', 'chicken', 'beef', 'goat', 'egg'],
  },
  {
    label: 'Fresh · chop on the board',
    tab: '🍅 Fresh',
    items: ['tomato', 'pepper', 'onion', 'ewedu', 'veggies', 'plantain'],
  },
  { label: 'Oil & spice', tab: '🌶️ Spice', items: ['palmoil', 'oil', 'yaji', 'sugar'] },
];

export const RECIPES: Recipe[] = [
  {
    id: 'jollof',
    name: 'Jollof rice & chicken',
    basePoints: 130,
    ingredients: ['rice', 'tomato', 'pepper', 'chicken'],
  },
  { id: 'suya', name: 'Suya & onions', basePoints: 100, ingredients: ['beef', 'yaji', 'onion'] },
  {
    id: 'amala',
    name: 'Amala & ewedu',
    basePoints: 100,
    ingredients: ['yamflour', 'ewedu', 'pepper'],
  },
  {
    id: 'egusi',
    name: 'Egusi soup & pounded yam',
    basePoints: 130,
    ingredients: ['egusi', 'palmoil', 'beef', 'poundo'],
  },
  { id: 'puffpuff', name: 'Puff-puff', basePoints: 100, ingredients: ['flour', 'sugar', 'oil'] },
  {
    id: 'moimoi',
    name: 'Moi moi',
    basePoints: 130,
    ingredients: ['beans', 'pepper', 'onion', 'egg'],
  },
  {
    id: 'friedrice',
    name: 'Fried rice & chicken',
    basePoints: 100,
    ingredients: ['rice', 'veggies', 'chicken'],
  },
  { id: 'dodo', name: 'Dodo & egg', basePoints: 100, ingredients: ['plantain', 'egg', 'oil'] },
  {
    id: 'peppersoup',
    name: 'Goat meat pepper soup',
    basePoints: 100,
    ingredients: ['goat', 'pepper', 'onion'],
  },
  {
    id: 'akara',
    name: 'Akara & bread',
    basePoints: 130,
    ingredients: ['beans', 'onion', 'oil', 'bread'],
  },
  {
    id: 'ofada',
    name: 'Ofada rice & ayamase',
    basePoints: 130,
    ingredients: ['ofada', 'pepper', 'palmoil', 'beef'],
  },
];

export function recipeById(id: RecipeId): Recipe {
  const recipe = RECIPES.find((item) => item.id === id);
  if (!recipe) throw new Error(`Unknown recipe: ${id}`);
  return recipe;
}

export function ingredientById(id: IngredientId): Ingredient {
  const ingredient = INGREDIENTS.find((item) => item.id === id);
  if (!ingredient) throw new Error(`Unknown ingredient: ${id}`);
  return ingredient;
}

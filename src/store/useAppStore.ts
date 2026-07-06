/**
 * Global app state, persisted to AsyncStorage. Holds every logged entity plus
 * user calibration and AI settings, and exposes typed actions. Derived numbers
 * (daily calories, spend summaries, weight trend) are computed on demand from
 * the pure domain functions — never stored — so they can't drift out of sync.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  Drink,
  Expense,
  HandReference,
  Meal,
  Recipe,
  WeightEntry,
} from '../domain/types';
import { AiSettings } from '../services/ai';

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface AppState {
  hand: HandReference | null;
  meals: Meal[];
  weights: WeightEntry[];
  expenses: Expense[];
  drinks: Drink[];
  recipes: Recipe[];
  ai: AiSettings;

  // calibration
  setHand: (hand: HandReference) => void;

  // meals
  addMeal: (meal: Omit<Meal, 'id'>) => Meal;
  removeMeal: (id: string) => void;

  // weight
  addWeight: (entry: Omit<WeightEntry, 'id'>) => void;
  addWeightBatch: (entries: WeightEntry[]) => void;

  // spend + alcohol
  addExpense: (e: Omit<Expense, 'id'>) => void;
  removeExpense: (id: string) => void;
  addDrink: (d: Omit<Drink, 'id'>) => void;

  // recipes
  addRecipe: (r: Omit<Recipe, 'id'>) => Recipe;

  // settings
  setAiSettings: (ai: AiSettings) => void;

  resetAll: () => void;
}

const DEFAULT_AI: AiSettings = { provider: 'mock' };

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hand: null,
      meals: [],
      weights: [],
      expenses: [],
      drinks: [],
      recipes: [],
      ai: DEFAULT_AI,

      setHand: (hand) => set({ hand }),

      addMeal: (meal) => {
        const withId: Meal = { ...meal, id: id('meal') };
        set({ meals: [withId, ...get().meals] });
        return withId;
      },
      removeMeal: (mealId) =>
        set({ meals: get().meals.filter((m) => m.id !== mealId) }),

      addWeight: (entry) =>
        set({ weights: [{ ...entry, id: id('wt') }, ...get().weights] }),
      addWeightBatch: (entries) => {
        // De-dupe by timestamp+source so re-importing the same export is safe.
        const existing = get().weights;
        const seen = new Set(existing.map((w) => `${w.at}|${w.source}`));
        const fresh = entries.filter((e) => !seen.has(`${e.at}|${e.source}`));
        set({ weights: [...fresh, ...existing] });
      },

      addExpense: (e) =>
        set({ expenses: [{ ...e, id: id('exp') }, ...get().expenses] }),
      removeExpense: (expId) =>
        set({ expenses: get().expenses.filter((e) => e.id !== expId) }),
      addDrink: (d) => set({ drinks: [{ ...d, id: id('drk') }, ...get().drinks] }),

      addRecipe: (r) => {
        const withId: Recipe = { ...r, id: id('rcp') };
        set({ recipes: [withId, ...get().recipes] });
        return withId;
      },

      setAiSettings: (ai) => set({ ai }),

      resetAll: () =>
        set({
          hand: null,
          meals: [],
          weights: [],
          expenses: [],
          drinks: [],
          recipes: [],
          ai: DEFAULT_AI,
        }),
    }),
    {
      name: 'ultimate-health-tracker',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

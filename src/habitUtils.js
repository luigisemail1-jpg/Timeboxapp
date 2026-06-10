import { fmtKey, addDays, sameDay } from './timeUtils.js';

const HABITS_KEY = 'habits:list';

const SEED_HABITS = [
  '10 min silence walk',
  'Workout',
  'No caffeine after noon',
];

const newId = () => `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const makeHabit = (name) => ({ id: newId(), name });

// Load the habit list; seed example habits the very first time only
// (an empty array means the user deleted them all — don't re-seed).
export const loadHabits = () => {
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { /* fall through to seed */ }
  const seeded = SEED_HABITS.map(makeHabit);
  try {
    localStorage.setItem(HABITS_KEY, JSON.stringify(seeded));
  } catch (e) { console.error('Habit seed failed', e); }
  return seeded;
};

export const saveHabits = (habits) => {
  try {
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  } catch (e) { console.error('Habit save failed', e); }
};

const checkedOn = (allData, habitId, d) =>
  !!allData[fmtKey(d)]?.habitChecks?.[habitId];

// Current streak counts back from `today` (forgiving: if today isn't
// checked yet, the streak ending yesterday still counts as current).
export const computeStreaks = (allData, habitId, today) => {
  let current = 0;
  let d = checkedOn(allData, habitId, today) ? today : addDays(today, -1);
  while (checkedOn(allData, habitId, d)) {
    current++;
    d = addDays(d, -1);
  }

  let best = 0;
  let run = 0;
  let prev = null;
  const days = Object.keys(allData)
    .filter(k => allData[k]?.habitChecks?.[habitId])
    .sort()
    .map(k => {
      const [y, m, da] = k.split('-').map(Number);
      return new Date(y, m - 1, da);
    });
  for (const dt of days) {
    run = prev && sameDay(addDays(prev, 1), dt) ? run + 1 : 1;
    if (run > best) best = run;
    prev = dt;
  }
  return { current, best: Math.max(best, current) };
};

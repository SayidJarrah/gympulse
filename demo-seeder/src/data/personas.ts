export const FITNESS_GOALS = [
  'Build strength',
  'Lose weight',
  'Improve flexibility',
  'Increase endurance',
  'Reduce stress',
  'Improve posture',
  'Build muscle',
  'Improve balance',
  'Increase energy',
  'Stay consistent',
  'Recover from injury',
  'Improve mobility',
  'Build core strength',
  'Improve athleticism',
];

export const CLASS_TYPE_PREFERENCES = [
  'Strength',
  'Cardio',
  'Flexibility',
  'Mind & Body',
  'Functional',
  'Cycling',
  'Dance',
  'Combat',
  'Wellness',
  'Aqua',
];

export function pickRandom<T>(arr: T[], min: number, max: number): T[] {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

export function randomBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

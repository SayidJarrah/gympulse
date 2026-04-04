// Daily time slots as [hour, minute] in UTC — must satisfy the DB constraint
// that EXTRACT(MINUTE FROM scheduled_at AT TIME ZONE 'UTC') IN (0, 30)
export const DAILY_SLOTS: [number, number][] = [
  [7, 0],   // 7:00am UTC
  [12, 0],  // 12:00pm UTC
  [17, 30], // 5:30pm UTC
  [19, 0],  // 7:00pm UTC
];

// Mon–Sat (0=Sun excluded)
const DEMO_DAYS = [1, 2, 3, 4, 5, 6];

// Time-of-day name qualifiers keyed by slot hour
export const SLOT_QUALIFIERS: Record<number, string> = {
  7: 'Morning',
  12: 'Lunchtime',
  17: 'Evening',
  19: 'Night',
};

/**
 * Returns the most recent Monday (UTC) on or before today.
 */
function currentMonday(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = (day === 0 ? 6 : day - 1);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
}

/**
 * Build a list of Date objects for class instance slots.
 * @param weekCount  how many weeks of schedule to generate (starting this Monday)
 * @param densityPct what fraction (0–100) of Mon–Sat × 4-slot grid to materialise
 */
export function buildSlotDates(weekCount: number, densityPct: number): Date[] {
  const monday = currentMonday();
  const allSlots: Date[] = [];

  for (let w = 0; w < weekCount; w++) {
    for (const dayOfWeek of DEMO_DAYS) {
      // dayOfWeek: 1=Mon ... 6=Sat; monday is always day 1
      const dayOffset = (w * 7) + (dayOfWeek - 1);
      for (const [hour, minute] of DAILY_SLOTS) {
        const d = new Date(monday.getTime());
        d.setUTCDate(monday.getUTCDate() + dayOffset);
        d.setUTCHours(hour, minute, 0, 0);
        allSlots.push(d);
      }
    }
  }

  // Apply density: shuffle and take densityPct%
  const count = Math.max(1, Math.round(allSlots.length * densityPct / 100));
  const shuffled = allSlots.sort(() => Math.random() - 0.5);
  // Re-sort by date after sampling so schedule is chronological
  return shuffled.slice(0, count).sort((a, b) => a.getTime() - b.getTime());
}

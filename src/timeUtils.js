// Shared date/time helpers for the planner.
// The time grid runs 5 AM – 11 PM in 30-minute slots (slot indices 0..37).

export const HOURS = [5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// AM for 5-11 (first), 12 PM, then 1-11 PM
export const hourMeta = (idx) => {
  if (idx <= 6) return { ampm: 'AM' }; // 5-11 AM
  return { ampm: 'PM' }; // 12 PM and 1-11 PM
};

export const fmtKey = (d) => {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
};

export const addDays = (d, n) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const monthName = (d) =>
  d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const longDate = (d) =>
  d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

export const shortDate = (d) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// Start-of-slot label, e.g. slot 0 -> "5:00 AM"
export const slotLabel = (slotIdx) => {
  const hourIdx = Math.floor(slotIdx / 2);
  const h = HOURS[hourIdx];
  const m = slotIdx % 2 === 0 ? '00' : '30';
  return `${h}:${m} ${hourMeta(hourIdx).ampm}`;
};

// "7:00 AM – 8:30 AM" for a block { start, end } (end slot is inclusive)
export const blockRangeLabel = (block) => {
  const endIdx = block.end + 1;
  const end = endIdx >= HOURS.length * 2 ? '12:00 AM' : slotLabel(endIdx);
  return `${slotLabel(block.start)} – ${end}`;
};

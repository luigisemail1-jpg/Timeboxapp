import { fmtKey } from './timeUtils.js';

// ----- JSON backup (export / import) -----
// Backup file shape: { app, version, exportedAt, days: { 'YYYY-MM-DD': dayData }, habits: [...] }

export const downloadBackup = (allData, habits) => {
  const payload = {
    app: 'timebox-planner',
    version: 1,
    exportedAt: new Date().toISOString(),
    days: allData,
    habits,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timebox-backup-${fmtKey(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const parseBackup = (text) => {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== 'object' || !obj.days || typeof obj.days !== 'object') {
    throw new Error('Not a planner backup file');
  }
  return obj;
};

// Merge a parsed backup into current state. Imported days overwrite
// same-date days; days that exist only locally are always kept.
export const mergeBackup = (backup, currentDays, currentHabits) => {
  const days = { ...currentDays };
  let importedDays = 0;
  for (const [k, v] of Object.entries(backup.days)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && typeof v === 'object') {
      days[k] = v;
      importedDays++;
    }
  }
  const habits = [...currentHabits];
  for (const h of Array.isArray(backup.habits) ? backup.habits : []) {
    if (!h || typeof h.id !== 'string' || typeof h.name !== 'string') continue;
    const idx = habits.findIndex(x => x.id === h.id);
    if (idx >= 0) habits[idx] = { ...habits[idx], name: h.name };
    else habits.push({ id: h.id, name: h.name });
  }
  return { days, habits, importedDays };
};

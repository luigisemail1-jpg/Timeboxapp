import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { computeStreaks, makeHabit } from './habitUtils.js';

export default function Habits({ habits, onChangeHabits, habitChecks, onToggleCheck, allData, selectedDate }) {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('ui:habitsOpen') !== '0'; } catch (e) { return true; }
  });
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem('ui:habitsOpen', next ? '1' : '0'); } catch (e) { /* ignore */ }
  };

  const addHabit = () => {
    const name = newName.trim();
    if (!name) return;
    onChangeHabits([...habits, makeHabit(name)]);
    setNewName('');
  };

  const renameHabit = (id, name) => {
    onChangeHabits(habits.map(h => h.id === id ? { ...h, name } : h));
  };

  const deleteHabit = (id) => {
    onChangeHabits(habits.filter(h => h.id !== id));
  };

  const doneToday = habits.filter(h => habitChecks?.[h.id]).length;

  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: open ? 10 : 0 }}>
        <button
          onClick={toggleOpen}
          className="display-font"
          style={{
            fontSize: 20,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: '#0a0a0a',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            letterSpacing: '-0.02em',
          }}
        >
          Habits
          {habits.length > 0 && (
            <span className="mono" style={{ fontSize: 11, fontWeight: 600, opacity: 0.55, letterSpacing: '0.05em' }}>
              {doneToday}/{habits.length}
            </span>
          )}
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {open && (
          <button
            onClick={() => { setEditing(!editing); setNewName(''); }}
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              border: '1.5px solid #0a0a0a',
              background: editing ? '#0a0a0a' : 'rgba(255,255,255,0.4)',
              color: editing ? '#EAC289' : '#0a0a0a',
              padding: '5px 10px',
              cursor: 'pointer',
            }}
          >
            {editing ? 'DONE' : 'EDIT'}
          </button>
        )}
      </div>

      {open && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {habits.length === 0 && !editing && (
            <div className="mono" style={{ fontSize: 11, opacity: 0.55, border: '1.5px dashed rgba(10,10,10,0.4)', padding: '12px 14px', textAlign: 'center' }}>
              No habits yet — tap EDIT to add one.
            </div>
          )}

          {habits.map(h => {
            const checked = !!habitChecks?.[h.id];
            const { current, best } = computeStreaks(allData, h.id, selectedDate);

            if (editing) {
              return (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    className="planner-input"
                    value={h.name}
                    onChange={(e) => renameHabit(h.id, e.target.value)}
                    style={{ padding: '8px 10px', fontSize: 13 }}
                  />
                  <button
                    onClick={() => deleteHabit(h.id)}
                    title="Remove habit"
                    aria-label={`Remove ${h.name}`}
                    style={{
                      width: 34,
                      height: 34,
                      border: '1.5px solid #0a0a0a',
                      background: 'rgba(10,10,10,0.08)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0a0a0a',
                      flexShrink: 0,
                      padding: 0,
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={h.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: '1.5px solid #0a0a0a',
                  background: checked ? 'rgba(176,106,51,0.18)' : 'rgba(255,255,255,0.55)',
                  padding: '8px 10px',
                  transition: 'background 0.15s',
                }}
              >
                <button
                  onClick={() => onToggleCheck(h.id)}
                  aria-label={`${checked ? 'Uncheck' : 'Check'} ${h.name}`}
                  style={{
                    width: 26,
                    height: 26,
                    border: '1.5px solid #0a0a0a',
                    background: checked ? '#B06A33' : 'rgba(255,255,255,0.7)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    padding: 0,
                    transition: 'background 0.15s',
                  }}
                >
                  {checked && <Check size={15} strokeWidth={3} />}
                </button>
                <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>
                  {h.name}
                </div>
                <div className="mono" style={{ fontSize: 10, opacity: 0.6, letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {current}D · BEST {best}D
                </div>
              </div>
            );
          })}

          {editing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="planner-input"
                placeholder="New habit…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addHabit(); }}
                style={{ padding: '8px 10px', fontSize: 13 }}
              />
              <button
                onClick={addHabit}
                title="Add habit"
                aria-label="Add habit"
                style={{
                  width: 34,
                  height: 34,
                  border: '1.5px solid #0a0a0a',
                  background: '#0a0a0a',
                  color: '#EAC289',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  padding: 0,
                }}
              >
                <Plus size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

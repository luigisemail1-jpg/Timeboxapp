import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Moon, Pin, X } from 'lucide-react';
import EveningRitual from './EveningRitual.jsx';
import Habits from './Habits.jsx';
import WeeklyReview from './WeeklyReview.jsx';
import { HOURS, hourMeta, fmtKey, addDays, sameDay, monthName, longDate } from './timeUtils.js';
import { loadHabits, saveHabits } from './habitUtils.js';
import { downloadBackup, parseBackup, mergeBackup } from './backup.js';

export default function TimeboxPlanner() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [allData, setAllData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Selection state for multi-slot highlighting
  const [selection, setSelection] = useState(null); // { start: slotIdx, end: slotIdx } - sorted on apply
  const [dragAnchor, setDragAnchor] = useState(null); // slotIdx where drag began
  const [activeBlockId, setActiveBlockId] = useState(null); // currently editing block

  const [ritualOpen, setRitualOpen] = useState(false);
  const [habits, setHabits] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const importInputRef = React.useRef(null);

  const dateKey = fmtKey(selectedDate);
  const dayData = allData[dateKey] || {
    priorities: ['', '', ''],
    brainDump: '',
    slots: {},
    blocks: [],
  };

  // Migrate old days that don't have blocks / newer optional fields
  if (!dayData.blocks) dayData.blocks = [];
  if (dayData.worryDump === undefined) dayData.worryDump = '';
  if (dayData.firstTask === undefined) dayData.firstTask = '';

  // Load all data on mount
  useEffect(() => {
    try {
      const loaded = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('day:')) {
          try {
            loaded[key.replace('day:', '')] = JSON.parse(localStorage.getItem(key));
          } catch (e) { /* skip corrupt */ }
        }
      }
      setAllData(loaded);
      setHabits(loadHabits());
    } catch (e) {
      console.error('Load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save current day on change (debounced)
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      setSaving(true);
      try {
        localStorage.setItem(`day:${dateKey}`, JSON.stringify(dayData));
      } catch (e) {
        console.error('Save failed', e);
      } finally {
        setTimeout(() => setSaving(false), 400);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [allData, dateKey, loading]);

  const updateDay = (patch) => {
    setAllData(prev => ({
      ...prev,
      [dateKey]: { ...dayData, ...patch },
    }));
  };

  // Patch any date (not just the selected one) and write through to
  // localStorage immediately — the debounced save effect only covers dateKey.
  const patchDate = (key, patch) => {
    setAllData(prev => {
      const base = prev[key] || { priorities: ['', '', ''], brainDump: '', slots: {}, blocks: [] };
      const next = { ...base, ...patch };
      try {
        localStorage.setItem(`day:${key}`, JSON.stringify(next));
      } catch (e) {
        console.error('Save failed', e);
      }
      return { ...prev, [key]: next };
    });
  };

  // ----- EVENING RITUAL -----
  const tomorrowKey = fmtKey(addDays(selectedDate, 1));

  const saveTomorrowFirstTask = (text) => {
    patchDate(tomorrowKey, { firstTask: text });
  };

  const toggleBlockWorth = (id) => {
    const next = (dayData.blocks || []).map(b =>
      b.id === id ? { ...b, notWorth: !b.notWorth } : b
    );
    updateDay({ blocks: next });
  };

  const finishRitual = () => {
    updateDay({ ritualDone: true });
    setRitualOpen(false);
  };
  // ----- END EVENING RITUAL -----

  // ----- HABITS -----
  const changeHabits = (next) => {
    setHabits(next);
    saveHabits(next);
  };

  const toggleHabitCheck = (habitId) => {
    const checks = { ...(dayData.habitChecks || {}) };
    if (checks[habitId]) delete checks[habitId];
    else checks[habitId] = true;
    updateDay({ habitChecks: checks });
  };
  // ----- END HABITS -----

  // ----- BACKUP -----
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = parseBackup(reader.result);
        const { days, habits: mergedHabits, importedDays } = mergeBackup(backup, allData, habits);
        const ok = window.confirm(
          `Import ${importedDays} day${importedDays === 1 ? '' : 's'} from this backup? ` +
          'Days with the same date will be replaced by the backup; everything else is kept.'
        );
        if (!ok) return;
        for (const [k, v] of Object.entries(days)) {
          localStorage.setItem(`day:${k}`, JSON.stringify(v));
        }
        setAllData(days);
        changeHabits(mergedHabits);
        alert('Backup imported.');
      } catch (err) {
        alert(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };
  // ----- END BACKUP -----

  const setPriority = (i, val) => {
    const next = [...dayData.priorities];
    next[i] = val;
    updateDay({ priorities: next });
  };

  const setSlot = (slotKey, val) => {
    updateDay({ slots: { ...dayData.slots, [slotKey]: val } });
  };

  // ----- BLOCK MANAGEMENT -----
  // A "slot index" is a number 0..37 representing each half-hour cell in order.
  // Hour idx i, column 0/30 -> slotIdx = i*2 + (col === '00' ? 0 : 1)
  const slotIdxToKey = (slotIdx) => {
    const hourIdx = Math.floor(slotIdx / 2);
    const half = slotIdx % 2 === 0 ? '00' : '30';
    return `${hourIdx}-${half}`;
  };

  // Find block containing this slot (or null)
  const blockForSlot = (slotIdx) => {
    return (dayData.blocks || []).find(b => slotIdx >= b.start && slotIdx <= b.end) || null;
  };

  // Remove any blocks that overlap a [start, end] range
  const removeBlocksInRange = (blocks, start, end) => {
    return blocks.filter(b => b.end < start || b.start > end);
  };

  // Apply selection: create a block from start..end, replacing any overlapping blocks
  const applySelection = () => {
    if (!selection) return;
    const start = Math.min(selection.start, selection.end);
    const end = Math.max(selection.start, selection.end);
    const id = `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const cleaned = removeBlocksInRange(dayData.blocks || [], start, end);
    // Also clear any individual slot text in that range (block takes precedence)
    const newSlots = { ...dayData.slots };
    for (let i = start; i <= end; i++) delete newSlots[slotIdxToKey(i)];
    const newBlock = { id, start, end, text: '' };
    updateDay({
      blocks: [...cleaned, newBlock],
      slots: newSlots,
    });
    setActiveBlockId(id);
    setSelection(null);
  };

  const updateBlockText = (id, text) => {
    const next = (dayData.blocks || []).map(b => b.id === id ? { ...b, text } : b);
    updateDay({ blocks: next });
  };

  const deleteBlock = (id) => {
    updateDay({ blocks: (dayData.blocks || []).filter(b => b.id !== id) });
    if (activeBlockId === id) setActiveBlockId(null);
  };

  // Drag handlers — press-and-hold to enter selection mode
  const HOLD_MS = 400;
  const holdTimerRef = React.useRef(null);
  const gridRef = React.useRef(null);
  const touchStartRef = React.useRef(null); // where the finger went down
  const [holdingSlot, setHoldingSlot] = React.useState(null); // visual cue while holding

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldingSlot(null);
  };

  const handleSlotPointerDown = (slotIdx, e) => {
    // If pressing inside an existing block, just activate it for editing - no hold needed
    const existing = blockForSlot(slotIdx);
    if (existing) {
      setActiveBlockId(existing.id);
      setSelection(null);
      return;
    }

    // Start a hold timer. If the user releases before HOLD_MS, the click passes through
    // to the input (so they can just type). If they hold long enough, drag mode arms.
    if (e.touches && e.touches[0]) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    setHoldingSlot(slotIdx);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setHoldingSlot(null);
      setActiveBlockId(null);
      setDragAnchor(slotIdx);
      setSelection({ start: slotIdx, end: slotIdx });
      // Haptic feedback on mobile if available
      if (navigator.vibrate) navigator.vibrate(30);
    }, HOLD_MS);
  };

  const handleSlotPointerEnter = (slotIdx) => {
    if (dragAnchor === null) return;
    setSelection({ start: dragAnchor, end: slotIdx });
  };

  // If the pointer moves before the hold timer fires, cancel the hold (user is scrolling/typing)
  const handleSlotPointerMove = () => {
    if (holdTimerRef.current && dragAnchor === null) {
      cancelHold();
    }
  };

  // End drag globally
  useEffect(() => {
    const onUp = () => {
      cancelHold();
      if (dragAnchor !== null) {
        setDragAnchor(null);
        setTimeout(() => applySelection(), 0);
      }
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);
    };
  }, [dragAnchor, selection, dayData]);

  // Touch support. This must be a NATIVE listener with passive: false —
  // React delegates touchmove as passive, so preventDefault() there is
  // ignored and the page scrolls underneath the selection.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const onTouchMove = (e) => {
      const touch = e.touches[0];
      if (dragAnchor !== null) {
        // Drag armed: selection owns the gesture, the page must not scroll
        e.preventDefault();
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && target.dataset && target.dataset.slotIdx !== undefined) {
          setSelection({ start: dragAnchor, end: parseInt(target.dataset.slotIdx, 10) });
        }
      } else if (holdTimerRef.current && touchStartRef.current) {
        // Still waiting for the hold: real movement means the user is
        // scrolling, so give up the hold (small jitter is tolerated)
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        if (Math.hypot(dx, dy) > 10) cancelHold();
      }
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [dragAnchor]);

  const isSlotSelected = (slotIdx) => {
    if (!selection) return false;
    const s = Math.min(selection.start, selection.end);
    const e = Math.max(selection.start, selection.end);
    return slotIdx >= s && slotIdx <= e;
  };
  // ----- END BLOCK MANAGEMENT -----

  // Calendar grid
  const buildMonthDays = () => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    }
    return cells;
  };

  const dayHasContent = (d) => {
    const key = fmtKey(d);
    const data = allData[key];
    if (!data) return false;
    if (data.priorities?.some(p => p?.trim())) return true;
    if (data.brainDump?.trim()) return true;
    if (Object.values(data.slots || {}).some(v => v?.trim())) return true;
    if ((data.blocks || []).some(b => b.text?.trim())) return true;
    if (data.worryDump?.trim()) return true;
    if (data.firstTask?.trim()) return true;
    if (Object.values(data.habitChecks || {}).some(Boolean)) return true;
    return false;
  };

  const shiftMonth = (delta) => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#EAC289',
        fontFamily: '"Inter", system-ui, sans-serif',
        padding: '24px 16px 60px',
        color: '#0a0a0a',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

        * { box-sizing: border-box; }

        .display-font { font-family: 'Archivo Black', sans-serif; letter-spacing: -0.02em; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        .planner-input {
          background: rgba(255,255,255,0.55);
          border: 1.5px solid #0a0a0a;
          padding: 10px 12px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #0a0a0a;
          width: 100%;
          outline: none;
          transition: background 0.15s;
        }
        .planner-input:focus { background: rgba(255,255,255,0.9); }
        .planner-input::placeholder { color: rgba(10,10,10,0.35); }

        .slot-input {
          background: transparent;
          border: none;
          padding: 6px 8px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          color: #0a0a0a;
          width: 100%;
          outline: none;
          height: 100%;
        }
        .slot-input:focus { background: rgba(255,255,255,0.7); }

        .cal-day {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: 1.5px solid transparent;
          background: transparent;
          color: #0a0a0a;
          position: relative;
          transition: all 0.12s;
          padding: 0;
          margin: 0;
          width: 100%;
          box-sizing: border-box;
          font-variant-numeric: tabular-nums;
        }
        .cal-day:hover { background: rgba(255,255,255,0.5); }
        .cal-day.selected { background: #0a0a0a; color: #EAC289; border-color: #0a0a0a; }
        .cal-day.today { border-color: #0a0a0a; }
        .cal-day.has-content::after {
          content: '';
          position: absolute;
          bottom: 4px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #B06A33;
        }
        .cal-day.selected.has-content::after { background: #EAC289; }

        .row-stripe:nth-child(even) { background: rgba(255,255,255,0.18); }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.25s ease-out; }

        @keyframes holdPulse {
          0% { opacity: 0; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <header style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 className="display-font" style={{ fontSize: 'clamp(40px, 6vw, 68px)', margin: 0, lineHeight: 0.95 }}>
                Daily Timeboxing
              </h1>
              <div className="display-font" style={{ fontSize: 'clamp(22px, 3vw, 32px)', marginTop: 2, opacity: 0.85 }}>
                Planner
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.6 }}>
                Date
              </div>
              <div style={{ fontWeight: 600, fontSize: 18, borderBottom: '1.5px solid #0a0a0a', paddingBottom: 2, minWidth: 240 }}>
                {longDate(selectedDate)}
              </div>
              <div className="mono" style={{ fontSize: 10, opacity: 0.5, marginTop: 6, height: 12 }}>
                {saving ? 'saving…' : loading ? 'loading…' : 'saved ✓'}
              </div>
            </div>
          </div>
          <div style={{ height: 2, background: '#0a0a0a', marginTop: 14 }} />
        </header>

        <div
          className="timebox-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)',
            gap: 28,
          }}
        >
          {/* LEFT COLUMN */}
          <div>
            {/* Calendar */}
            <section style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, height: 30 }}>
                <h2 className="display-font" style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarIcon size={16} /> {monthName(viewMonth)}
                </h2>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => shiftMonth(-1)} style={navBtn}><ChevronLeft size={16} /></button>
                  <button
                    onClick={() => { setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(today); }}
                    style={{ ...navBtn, width: 'auto', padding: '0 10px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}
                  >
                    TODAY
                  </button>
                  <button onClick={() => shiftMonth(1)} style={navBtn}><ChevronRight size={16} /></button>
                </div>
              </div>

              <div style={{ border: '2px solid #0a0a0a', background: 'rgba(255,255,255,0.25)', padding: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, marginBottom: 4 }}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div
                      key={i}
                      className="mono"
                      style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, opacity: 0.55, padding: '4px 0', letterSpacing: '0.1em', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
                  {buildMonthDays().map((d, i) => {
                    if (!d) return <div key={i} style={{ aspectRatio: '1' }} />;
                    const isSelected = sameDay(d, selectedDate);
                    const isToday = sameDay(d, today);
                    const filled = dayHasContent(d);
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(d)}
                        className={`cal-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${filled ? 'has-content' : ''}`}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mono" style={{ fontSize: 10, opacity: 0.55, marginTop: 8, display: 'flex', gap: 14 }}>
                <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#B06A33', marginRight: 5 }} />HAS ENTRIES</span>
                <span style={{ border: '1.5px solid #0a0a0a', padding: '0 4px' }}>TODAY</span>
              </div>

              <button
                onClick={() => setReviewOpen(true)}
                className="mono"
                style={{
                  width: '100%',
                  marginTop: 12,
                  height: 38,
                  background: 'rgba(255,255,255,0.4)',
                  color: '#0a0a0a',
                  border: '1.5px solid #0a0a0a',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.15em',
                  cursor: 'pointer',
                }}
              >
                WEEKLY REVIEW
              </button>
            </section>

            {/* Top Priorities */}
            <section style={{ marginBottom: 24 }}>
              <h2 className="display-font" style={{ fontSize: 20, margin: '0 0 10px' }}>Top Priorities</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="mono" style={{ fontSize: 14, fontWeight: 600, width: 18, opacity: 0.6 }}>0{i + 1}</div>
                    <input
                      className="planner-input"
                      placeholder={`Priority ${i + 1}`}
                      value={dayData.priorities[i] || ''}
                      onChange={(e) => setPriority(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Habits */}
            <Habits
              habits={habits}
              onChangeHabits={changeHabits}
              habitChecks={dayData.habitChecks || {}}
              onToggleCheck={toggleHabitCheck}
              allData={allData}
              selectedDate={selectedDate}
            />

            {/* Brain Dump */}
            <section>
              <h2 className="display-font" style={{ fontSize: 20, margin: '0 0 10px' }}>Brain Dump</h2>
              <textarea
                className="planner-input"
                placeholder="Notes, ideas, anything on your mind…"
                value={dayData.brainDump}
                onChange={(e) => updateDay({ brainDump: e.target.value })}
                style={{
                  minHeight: 220,
                  resize: 'vertical',
                  fontFamily: 'Inter, sans-serif',
                  lineHeight: 1.7,
                  background:
                    'repeating-linear-gradient(transparent, transparent 27px, rgba(10,10,10,0.18) 27px, rgba(10,10,10,0.18) 28px) rgba(255,255,255,0.55)',
                }}
              />
            </section>
          </div>

          {/* RIGHT COLUMN — TIMEBOX */}
          <div>
            {/* Pinned first task (set during the previous evening's ritual) */}
            {dayData.firstTask?.trim() && (
              <div
                className="fade-in"
                style={{
                  border: '2px solid #0a0a0a',
                  background: '#FFFDF6',
                  padding: '10px 12px',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 2px 0 #0a0a0a',
                }}
              >
                <Pin size={15} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 9, letterSpacing: '0.15em', opacity: 0.6, marginBottom: 1 }}>
                    FIRST TASK
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{dayData.firstTask}</div>
                </div>
                <button
                  onClick={() => updateDay({ firstTask: '' })}
                  title="Dismiss"
                  aria-label="Dismiss first task"
                  style={{
                    background: 'rgba(10,10,10,0.1)',
                    border: '1px solid rgba(10,10,10,0.4)',
                    color: '#0a0a0a',
                    width: 22,
                    height: 22,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    padding: 0,
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 10, height: 30 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', opacity: 0.6 }}>
                5 AM → 11 PM
              </div>
            </div>

            <div
              ref={gridRef}
              style={{ border: '2px solid #0a0a0a', background: 'rgba(255,255,255,0.25)', position: 'relative', userSelect: 'none' }}
            >
              {/* Header row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '54px 1fr 1fr',
                  borderBottom: '2px solid #0a0a0a',
                  background: '#0a0a0a',
                  color: '#EAC289',
                }}
              >
                <div className="mono" style={{ fontSize: 10, fontWeight: 600, padding: '8px 6px', textAlign: 'center', letterSpacing: '0.1em' }}>HR</div>
                <div className="mono" style={{ fontSize: 10, fontWeight: 600, padding: '8px 10px', borderLeft: '1px solid #EAC289', letterSpacing: '0.1em' }}>:00</div>
                <div className="mono" style={{ fontSize: 10, fontWeight: 600, padding: '8px 10px', borderLeft: '1px solid #EAC289', letterSpacing: '0.1em' }}>:30</div>
              </div>

              {/* Slot grid container — each row is 2 slots (col 00, col 30) */}
              <div style={{ position: 'relative' }}>
                {HOURS.map((h, idx) => {
                  const meta = hourMeta(idx);
                  const slot00 = idx * 2;
                  const slot30 = idx * 2 + 1;
                  const block00 = blockForSlot(slot00);
                  const block30 = blockForSlot(slot30);

                  const renderSlot = (slotIdx, block, isRight) => {
                    const sel = isSlotSelected(slotIdx);
                    const isHolding = holdingSlot === slotIdx;
                    const slotKey = slotIdxToKey(slotIdx);

                    let bg = 'transparent';
                    if (sel) bg = 'rgba(176, 106, 51, 0.4)';
                    else if (isHolding) bg = 'rgba(176, 106, 51, 0.2)';

                    return (
                      <div
                        data-slot-idx={slotIdx}
                        onMouseDown={(e) => handleSlotPointerDown(slotIdx, e)}
                        onMouseEnter={() => handleSlotPointerEnter(slotIdx)}
                        onMouseMove={handleSlotPointerMove}
                        onMouseLeave={() => { if (dragAnchor === null) cancelHold(); }}
                        onTouchStart={(e) => handleSlotPointerDown(slotIdx, e)}
                        style={{
                          borderRight: isRight ? 'none' : '1px solid rgba(10,10,10,0.35)',
                          background: bg,
                          cursor: 'text',
                          position: 'relative',
                          minHeight: 38,
                          display: 'flex',
                          alignItems: 'center',
                          padding: block ? 0 : '6px 8px',
                          fontSize: 13,
                          color: '#0a0a0a',
                          touchAction: dragAnchor !== null ? 'none' : 'auto',
                          transition: 'background 0.15s',
                        }}
                      >
                        {/* Pulse ring while holding */}
                        {isHolding && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 2,
                              border: '1.5px dashed #B06A33',
                              pointerEvents: 'none',
                              animation: 'holdPulse 0.4s ease-out forwards',
                            }}
                          />
                        )}
                        {!block && (
                          <input
                            className="slot-input"
                            style={{ padding: 0, height: 'auto', position: 'relative', zIndex: 1 }}
                            value={dayData.slots[slotKey] || ''}
                            onChange={(e) => setSlot(slotKey, e.target.value)}
                            onFocus={cancelHold}
                            onKeyDown={cancelHold}
                          />
                        )}
                      </div>
                    );
                  };

                  return (
                    <div
                      key={idx}
                      className="row-stripe"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '54px 1fr 1fr',
                        borderBottom: idx === HOURS.length - 1 ? 'none' : '1px solid rgba(10,10,10,0.35)',
                        minHeight: 38,
                      }}
                    >
                      <div
                        className="mono"
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 3,
                          borderRight: '1.5px solid #0a0a0a',
                          background: 'rgba(10,10,10,0.05)',
                        }}
                      >
                        <span>{h}</span>
                        <span style={{ fontSize: 8, opacity: 0.5, fontWeight: 400 }}>{meta.ampm}</span>
                      </div>
                      {renderSlot(slot00, block00, false)}
                      {renderSlot(slot30, block30, true)}
                    </div>
                  );
                })}

                {/* BLOCK OVERLAYS — rendered as absolutely-positioned cards on top of slots */}
                {(dayData.blocks || []).map((block) => {
                  const startRow = Math.floor(block.start / 2); // hour row index
                  const startCol = block.start % 2; // 0 or 1 (00 or 30)
                  const endRow = Math.floor(block.end / 2);
                  const endCol = block.end % 2;
                  const ROW_H = 38;

                  // Each row is 38px. Block spans from (startRow + startCol*0.5) to (endRow + endCol*0.5 + 0.5)
                  const topUnits = startRow + startCol * 0.5;
                  const heightUnits = (endRow + endCol * 0.5 + 0.5) - topUnits;

                  const top = topUnits * ROW_H;
                  const height = heightUnits * ROW_H;

                  // Horizontal: hour col is 54px, then two equal columns for :00 and :30
                  // For simplicity using percentage of remaining width
                  // If block starts at col 0 (00) and ends at col 1 (30) of any row → spans full width after hour col
                  // If block is single slot in col 0 → first half of remaining
                  // If block is single slot in col 1 → second half of remaining
                  // For multi-row blocks, always span full width after hour col
                  let leftStyle, widthStyle;
                  if (startRow === endRow) {
                    // Single row
                    if (startCol === 0 && endCol === 0) {
                      leftStyle = '54px';
                      widthStyle = 'calc((100% - 54px) / 2)';
                    } else if (startCol === 1 && endCol === 1) {
                      leftStyle = 'calc(54px + (100% - 54px) / 2)';
                      widthStyle = 'calc((100% - 54px) / 2)';
                    } else {
                      // 0 to 1 in same row
                      leftStyle = '54px';
                      widthStyle = 'calc(100% - 54px)';
                    }
                  } else {
                    leftStyle = '54px';
                    widthStyle = 'calc(100% - 54px)';
                  }

                  const isActive = activeBlockId === block.id;
                  const flagged = !!block.notWorth;

                  return (
                    <div
                      key={block.id}
                      style={{
                        position: 'absolute',
                        top: `${top}px`,
                        left: leftStyle,
                        width: widthStyle,
                        height: `${height}px`,
                        background: flagged
                          ? 'repeating-linear-gradient(-45deg, rgba(10,10,10,0.05), rgba(10,10,10,0.05) 4px, transparent 4px, transparent 9px) rgba(238,226,206,0.9)'
                          : isActive ? '#F4E3C2' : '#FFFDF6',
                        border: flagged ? '1.5px solid rgba(10,10,10,0.55)' : '1.5px solid #0a0a0a',
                        boxShadow: isActive ? '0 2px 0 #0a0a0a, 0 4px 12px rgba(0,0,0,0.18)' : '0 1px 0 rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '6px 10px 6px 12px',
                        gap: 6,
                        zIndex: 2,
                        transition: 'box-shadow 0.15s, background 0.15s',
                      }}
                      onClick={() => setActiveBlockId(block.id)}
                    >
                      <textarea
                        className="block-input"
                        placeholder="Activity…"
                        value={block.text}
                        onChange={(e) => updateBlockText(block.id, e.target.value)}
                        onFocus={() => setActiveBlockId(block.id)}
                        autoFocus={isActive && !block.text}
                        style={{
                          flex: 1,
                          background: 'transparent',
                          border: 'none',
                          color: '#0a0a0a',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: height < 50 ? 13 : 14,
                          fontWeight: 600,
                          outline: 'none',
                          resize: 'none',
                          padding: 0,
                          height: '100%',
                          lineHeight: 1.3,
                          letterSpacing: '-0.01em',
                          textDecoration: flagged ? 'line-through' : 'none',
                          opacity: flagged ? 0.55 : 1,
                        }}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                        title="Remove block"
                        style={{
                          background: 'rgba(10,10,10,0.1)',
                          border: '1px solid rgba(10,10,10,0.4)',
                          color: '#0a0a0a',
                          width: 22,
                          height: 22,
                          borderRadius: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: 600,
                          flexShrink: 0,
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mono" style={{ fontSize: 10, opacity: 0.55, marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span>
                {(dayData.blocks || []).length > 0 && `${(dayData.blocks || []).length} BLOCK${(dayData.blocks || []).length === 1 ? '' : 'S'} · `}
                {Object.values(dayData.slots).filter(v => v?.trim()).length} INDIVIDUAL SLOT{Object.values(dayData.slots).filter(v => v?.trim()).length === 1 ? '' : 'S'}
              </span>
            </div>

            {/* End the Day — opens the evening ritual */}
            <button
              onClick={() => setRitualOpen(true)}
              className="mono"
              style={{
                width: '100%',
                marginTop: 18,
                height: 52,
                background: dayData.ritualDone ? '#B06A33' : '#0a0a0a',
                color: dayData.ritualDone ? '#fff' : '#EAC289',
                border: '2px solid #0a0a0a',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.15em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 2px 0 #0a0a0a',
              }}
            >
              {dayData.ritualDone ? <Check size={16} /> : <Moon size={16} />}
              {dayData.ritualDone ? 'DAY CLOSED' : 'END THE DAY'}
            </button>
          </div>
        </div>

        {/* Backup footer */}
        <footer style={{ marginTop: 40 }}>
          <div style={{ height: 2, background: '#0a0a0a', marginBottom: 12 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span className="mono" style={{ fontSize: 10, opacity: 0.55, letterSpacing: '0.1em' }}>
              DATA LIVES IN THIS BROWSER — BACK IT UP NOW AND THEN
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => downloadBackup(allData, habits)} className="mono" style={backupBtn}>
                EXPORT BACKUP
              </button>
              <button onClick={() => importInputRef.current?.click()} className="mono" style={backupBtn}>
                IMPORT BACKUP
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </footer>

        {/* Mobile responsive */}
        <style>{`
          @media (max-width: 880px) {
            .timebox-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>

      {reviewOpen && (
        <WeeklyReview
          allData={allData}
          habits={habits}
          endDate={selectedDate}
          onClose={() => setReviewOpen(false)}
        />
      )}

      {ritualOpen && (
        <EveningRitual
          dateLabel={longDate(selectedDate)}
          blocks={dayData.blocks || []}
          onToggleBlockWorth={toggleBlockWorth}
          worryDump={dayData.worryDump || ''}
          onWorryChange={(text) => updateDay({ worryDump: text })}
          initialFirstTask={(allData[tomorrowKey] || {}).firstTask || ''}
          onSaveFirstTask={saveTomorrowFirstTask}
          onFinish={finishRitual}
          onClose={() => setRitualOpen(false)}
        />
      )}
    </div>
  );
}

const navBtn = {
  width: 30,
  height: 30,
  border: '1.5px solid #0a0a0a',
  background: 'rgba(255,255,255,0.4)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#0a0a0a',
  fontFamily: 'inherit',
};

const backupBtn = {
  border: '1.5px solid #0a0a0a',
  background: 'rgba(255,255,255,0.4)',
  color: '#0a0a0a',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.12em',
  padding: '7px 12px',
  cursor: 'pointer',
};

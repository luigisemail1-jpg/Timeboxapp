import React from 'react';
import { ArrowLeft, Check, Flag } from 'lucide-react';
import { fmtKey, addDays, shortDate, blockRangeLabel } from './timeUtils.js';
import { computeStreaks } from './habitUtils.js';

// Read-only summary of the 7 days ending on endDate.
export default function WeeklyReview({ allData, habits, endDate, onClose }) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(endDate, -i);
    days.push({ date: d, key: fmtKey(d), data: allData[fmtKey(d)] || null });
  }
  const rangeLabel = `${shortDate(days[0].date)} – ${shortDate(days[6].date)}`;

  // "Wasn't worth it" blocks, grouped by label so repeat offenders stand out
  const groups = {};
  for (const day of days) {
    for (const b of day.data?.blocks || []) {
      if (!b.notWorth) continue;
      const label = b.text?.trim() || 'Untitled block';
      const k = label.toLowerCase();
      if (!groups[k]) groups[k] = { label, hits: [] };
      groups[k].hits.push({ date: day.date, range: blockRangeLabel(b) });
    }
  }
  const flaggedGroups = Object.values(groups).sort((a, b) => b.hits.length - a.hits.length);

  const worries = days.filter(d => d.data?.worryDump?.trim());

  // Calibration: reviewed predictions in the 7-day window
  const reviewed = days.flatMap(d =>
    (d.data?.predictions || [])
      .filter(p => p?.outcome)
      .map(p => ({ ...p, date: d.date }))
  );
  const rightCount = reviewed.filter(p => p.outcome === 'right').length;
  const hasConfidence = reviewed.some(p => p.confidence);
  const buckets = ['high', 'med', 'low'].map(c => {
    const inBucket = reviewed.filter(p => p.confidence === c);
    return { c, right: inBucket.filter(p => p.outcome === 'right').length, total: inBucket.length };
  }).filter(b => b.total > 0);
  const wastedNotes = reviewed.filter(p => p.effortWasted?.trim());

  return (
    <div
      className="fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#EAC289',
        zIndex: 50,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        color: '#0a0a0a',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 60px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <button onClick={onClose} aria-label="Back to planner" style={reviewNavBtn}>
            <ArrowLeft size={16} />
          </button>
          <h1 className="display-font" style={{ fontSize: 28, margin: 0, lineHeight: 1 }}>Weekly Review</h1>
        </div>
        <div className="mono" style={{ fontSize: 11, opacity: 0.6, letterSpacing: '0.1em', textTransform: 'uppercase', marginLeft: 46 }}>
          {rangeLabel}
        </div>
        <div style={{ height: 2, background: '#0a0a0a', margin: '16px 0 24px' }} />

        {/* Not worth repeating */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="display-font" style={{ fontSize: 20, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flag size={15} /> Not worth repeating
          </h2>
          <p style={{ fontSize: 13, opacity: 0.65, margin: '0 0 12px', lineHeight: 1.5 }}>
            Blocks you flagged in the evening ritual. Repeat offenders rise to the top.
          </p>
          {flaggedGroups.length === 0 ? (
            <div className="mono" style={emptyBox}>Nothing flagged this week.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {flaggedGroups.map(g => (
                <div key={g.label} style={{ border: '1.5px solid #0a0a0a', background: 'rgba(255,255,255,0.55)', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, fontSize: 15, fontWeight: 700, textDecoration: 'line-through', opacity: 0.75 }}>
                      {g.label}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        background: g.hits.length > 1 ? '#0a0a0a' : 'rgba(10,10,10,0.08)',
                        color: g.hits.length > 1 ? '#EAC289' : '#0a0a0a',
                        border: '1.5px solid #0a0a0a',
                        flexShrink: 0,
                      }}
                    >
                      ×{g.hits.length}
                    </div>
                  </div>
                  <div className="mono" style={{ fontSize: 10, opacity: 0.55, marginTop: 4, lineHeight: 1.6 }}>
                    {g.hits.map((h, i) => (
                      <div key={i}>{shortDate(h.date)} · {h.range}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Habits */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="display-font" style={{ fontSize: 20, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={16} /> Habits
          </h2>
          <p style={{ fontSize: 13, opacity: 0.65, margin: '0 0 12px', lineHeight: 1.5 }}>
            Completion over the last 7 days.
          </p>
          {habits.length === 0 ? (
            <div className="mono" style={emptyBox}>No habits defined.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {habits.map(h => {
                const checks = days.map(d => !!d.data?.habitChecks?.[h.id]);
                const done = checks.filter(Boolean).length;
                const { current, best } = computeStreaks(allData, h.id, endDate);
                return (
                  <div key={h.id} style={{ border: '1.5px solid #0a0a0a', background: 'rgba(255,255,255,0.55)', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ flex: 1, fontSize: 14, fontWeight: 700, minWidth: 0 }}>{h.name}</div>
                      <div className="mono" style={{ fontSize: 10, opacity: 0.6, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {done}/7 · {current}D · BEST {best}D
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {checks.map((c, i) => (
                        <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                          <div
                            style={{
                              height: 22,
                              border: '1.5px solid #0a0a0a',
                              background: c ? '#B06A33' : 'rgba(255,255,255,0.5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                            }}
                          >
                            {c && <Check size={13} strokeWidth={3} />}
                          </div>
                          <div className="mono" style={{ fontSize: 8, opacity: 0.5, marginTop: 2, letterSpacing: '0.05em' }}>
                            {days[i].date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Calibration */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="display-font" style={{ fontSize: 20, margin: '0 0 4px' }}>Calibration</h2>
          <p style={{ fontSize: 13, opacity: 0.65, margin: '0 0 12px', lineHeight: 1.5 }}>
            How your predictions held up this week.
          </p>
          {reviewed.length === 0 ? (
            <div className="mono" style={emptyBox}>No reviewed predictions this week.</div>
          ) : (
            <div style={{ border: '1.5px solid #0a0a0a', background: 'rgba(255,255,255,0.55)', padding: '12px 14px' }}>
              <div className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.08em' }}>
                {rightCount} OF {reviewed.length} RIGHT
              </div>
              {hasConfidence && (
                <div className="mono" style={{ fontSize: 10, opacity: 0.65, letterSpacing: '0.08em', marginTop: 8, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {buckets.map(b => (
                    <span key={b.c}>{b.c.toUpperCase()}: {b.right}/{b.total} RIGHT</span>
                  ))}
                </div>
              )}
              {wastedNotes.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid rgba(10,10,10,0.25)', paddingTop: 10 }}>
                  <div className="mono" style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.15em', opacity: 0.55, marginBottom: 6 }}>
                    EFFORT WASTED
                  </div>
                  {wastedNotes.map(p => (
                    <div key={p.id} style={{ fontSize: 13, lineHeight: 1.6 }}>
                      <span className="mono" style={{ fontSize: 10, opacity: 0.5 }}>{shortDate(p.date).toUpperCase()}</span>
                      {' — '}{p.effortWasted}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Worry dumps */}
        <section>
          <h2 className="display-font" style={{ fontSize: 20, margin: '0 0 4px' }}>Worries of the week</h2>
          <p style={{ fontSize: 13, opacity: 0.65, margin: '0 0 12px', lineHeight: 1.5 }}>
            Everything you set down at night. Notice what kept coming back — and what never happened.
          </p>
          {worries.length === 0 ? (
            <div className="mono" style={emptyBox}>No worry dumps this week.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {worries.map(d => (
                <div key={d.key}>
                  <div className="mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', opacity: 0.6, marginBottom: 4, textTransform: 'uppercase' }}>
                    {shortDate(d.date)}
                  </div>
                  <div
                    style={{
                      border: '1.5px solid #0a0a0a',
                      padding: '4px 12px',
                      fontSize: 14,
                      lineHeight: '28px',
                      whiteSpace: 'pre-wrap',
                      background:
                        'repeating-linear-gradient(transparent, transparent 27px, rgba(10,10,10,0.18) 27px, rgba(10,10,10,0.18) 28px) rgba(255,255,255,0.55)',
                    }}
                  >
                    {d.data.worryDump}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const reviewNavBtn = {
  width: 34,
  height: 34,
  border: '1.5px solid #0a0a0a',
  background: 'rgba(255,255,255,0.4)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#0a0a0a',
  padding: 0,
  flexShrink: 0,
};

const emptyBox = {
  fontSize: 11,
  opacity: 0.55,
  border: '1.5px dashed rgba(10,10,10,0.4)',
  padding: '14px',
  textAlign: 'center',
};

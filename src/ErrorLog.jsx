import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { fmtKey, addDays, shortDate } from './timeUtils.js';

// Daily Error Log — a calibration journal. Predictions live on the day
// records as day.predictions[]; "today" follows the selected planner date.

const newId = () => `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const CONFIDENCES = ['low', 'med', 'high'];

const Stamp = ({ outcome }) => {
  if (!outcome) return null;
  const styles = {
    right: { background: '#0a0a0a', color: '#F5EEDF', border: '1.5px solid #0a0a0a', mark: '✓' },
    wrong: { background: '#B5532A', color: '#F5EEDF', border: '1.5px solid #0a0a0a', mark: '✗' },
    partial: { background: '#F5EEDF', color: '#B5532A', border: '1.5px solid #B5532A', mark: '~' },
  }[outcome];
  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        fontSize: 13,
        fontWeight: 600,
        flexShrink: 0,
        background: styles.background,
        color: styles.color,
        border: styles.border,
      }}
    >
      {styles.mark}
    </span>
  );
};

export default function ErrorLog({ allData, selectedDate, patchDate, onClose }) {
  const todayKey = fmtKey(selectedDate);
  const yesterday = addDays(selectedDate, -1);
  const yKey = fmtKey(yesterday);

  const todayPreds = (allData[todayKey]?.predictions || []).filter(p => p);
  const yPreds = (allData[yKey]?.predictions || []).filter(p => p?.text?.trim());

  const [archiveFilter, setArchiveFilter] = useState('all');

  // --- Today's assumptions: three lines mapped to a compact array ---
  const setAssumption = (i, text) => {
    const rows = [...todayPreds];
    if (rows[i]) rows[i] = { ...rows[i], text };
    else if (text.trim() !== '' || text !== '') rows[i] = { id: newId(), text };
    const next = rows.filter(r => r && r.text !== '');
    patchDate(todayKey, { predictions: next });
  };

  const setConfidence = (i, conf) => {
    const rows = [...todayPreds];
    if (!rows[i]) return;
    const cur = rows[i].confidence;
    rows[i] = { ...rows[i] };
    if (cur === conf) delete rows[i].confidence; // tap again to clear
    else rows[i].confidence = conf;
    patchDate(todayKey, { predictions: rows });
  };

  // --- Review yesterday ---
  const patchYesterdayPred = (id, patch) => {
    const next = (allData[yKey]?.predictions || []).map(p => {
      if (p.id !== id) return p;
      const merged = { ...p, ...patch };
      // toggling the same outcome off un-reviews the prediction
      if (patch.outcome && p.outcome === patch.outcome) {
        delete merged.outcome;
        delete merged.reviewedAt;
      } else if (patch.outcome) {
        merged.reviewedAt = new Date().toISOString();
      }
      return merged;
    });
    patchDate(yKey, { predictions: next });
  };

  // --- Archive: every reviewed prediction across all loaded days ---
  const archive = Object.keys(allData)
    .sort()
    .reverse()
    .flatMap(k =>
      (allData[k]?.predictions || [])
        .filter(p => p?.outcome)
        .map(p => ({ ...p, dateKey: k }))
    )
    .filter(p => {
      if (archiveFilter === 'right') return p.outcome === 'right';
      if (archiveFilter === 'wrong') return p.outcome === 'wrong' || p.outcome === 'partial';
      return true;
    });

  const parseKey = (k) => {
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

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
        <button
          onClick={onClose}
          className="mono"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: '#0a0a0a',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.15em',
            marginBottom: 14,
          }}
        >
          <ArrowLeft size={14} /> BACK TO PLANNER
        </button>
        <h1 className="display-font" style={{ fontSize: 28, margin: 0, lineHeight: 1 }}>Prediction Log</h1>
        <div className="mono" style={{ fontSize: 11, opacity: 0.6, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
          {shortDate(selectedDate)} · CALIBRATION JOURNAL
        </div>
        <div style={{ height: 2, background: '#0a0a0a', margin: '16px 0 24px' }} />

        {/* 1. TODAY'S ASSUMPTIONS */}
        <section style={{ marginBottom: 34 }}>
          <h2 className="mono" style={sectionHead}>TODAY I'M ASSUMING</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2].map(i => {
              const pred = todayPreds[i];
              return (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 600, opacity: 0.5, width: 16 }}>
                      0{i + 1}
                    </span>
                    <input
                      className="planner-input priority"
                      placeholder="What are you betting on?"
                      value={pred?.text || ''}
                      onChange={(e) => setAssumption(i, e.target.value)}
                      style={{ fontSize: 14 }}
                    />
                  </div>
                  {pred?.text?.trim() && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, marginLeft: 26 }}>
                      <span className="mono" style={{ fontSize: 9, opacity: 0.5, letterSpacing: '0.1em', alignSelf: 'center' }}>
                        CONFIDENCE
                      </span>
                      {CONFIDENCES.map(c => (
                        <button
                          key={c}
                          onClick={() => setConfidence(i, c)}
                          className="mono"
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: '0.1em',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            border: '1.5px solid #0a0a0a',
                            background: pred.confidence === c ? '#0a0a0a' : 'transparent',
                            color: pred.confidence === c ? '#F5EEDF' : '#0a0a0a',
                          }}
                        >
                          {c.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. REVIEW YESTERDAY */}
        <section style={{ marginBottom: 34 }}>
          <h2 className="mono" style={sectionHead}>REVIEW YESTERDAY — {shortDate(yesterday).toUpperCase()}</h2>
          {yPreds.length === 0 ? (
            <div className="mono" style={emptyBox}>NOTHING TO REVIEW — LOG ASSUMPTIONS TODAY</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {yPreds.map(p => (
                <div key={p.id} style={{ border: '1.5px solid #0a0a0a', background: '#F5EEDF', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Stamp outcome={p.outcome} />
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{p.text}</div>
                    {p.confidence && (
                      <span className="mono" style={{ fontSize: 9, opacity: 0.5, letterSpacing: '0.1em', flexShrink: 0 }}>
                        {p.confidence.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    {['right', 'wrong', 'partial'].map(o => (
                      <button
                        key={o}
                        onClick={() => patchYesterdayPred(p.id, { outcome: o })}
                        className="mono"
                        style={{
                          flex: 1,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.12em',
                          padding: '7px 0',
                          cursor: 'pointer',
                          border: '1.5px solid #0a0a0a',
                          background: p.outcome === o ? '#0a0a0a' : 'rgba(255,255,255,0.5)',
                          color: p.outcome === o ? '#F5EEDF' : '#0a0a0a',
                        }}
                      >
                        {o.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {(p.outcome === 'wrong' || p.outcome === 'partial') && (
                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                      <input
                        className="planner-input"
                        placeholder="Why was I off?"
                        value={p.whyOff || ''}
                        onChange={(e) => patchYesterdayPred(p.id, { whyOff: e.target.value })}
                        style={{ fontSize: 13, padding: '8px 10px' }}
                      />
                      <input
                        className="planner-input"
                        placeholder="Effort wasted? (optional, e.g. 2h on the wrong fix)"
                        value={p.effortWasted || ''}
                        onChange={(e) => patchYesterdayPred(p.id, { effortWasted: e.target.value })}
                        style={{ fontSize: 13, padding: '8px 10px' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3. ARCHIVE */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 className="mono" style={{ ...sectionHead, margin: 0 }}>ARCHIVE</h2>
            <div style={{ display: 'flex', gap: 4 }}>
              {['all', 'right', 'wrong'].map(f => (
                <button
                  key={f}
                  onClick={() => setArchiveFilter(f)}
                  className="mono"
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    padding: '5px 9px',
                    cursor: 'pointer',
                    border: '1.5px solid #0a0a0a',
                    background: archiveFilter === f ? '#0a0a0a' : 'transparent',
                    color: archiveFilter === f ? '#F5EEDF' : '#0a0a0a',
                  }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {archive.length === 0 ? (
            <div className="mono" style={emptyBox}>NO REVIEWED PREDICTIONS YET</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {archive.map(p => (
                <div key={p.id} style={{ border: '1.5px solid #0a0a0a', background: '#F5EEDF', padding: '9px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Stamp outcome={p.outcome} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: 9, opacity: 0.5, letterSpacing: '0.1em', marginBottom: 2 }}>
                        {shortDate(parseKey(p.dateKey)).toUpperCase()}
                        {p.confidence ? ` · ${p.confidence.toUpperCase()}` : ''}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{p.text}</div>
                      {(p.outcome === 'wrong' || p.outcome === 'partial') && (
                        <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>
                          {p.whyOff?.trim() && <div style={{ opacity: 0.8 }}>{p.whyOff}</div>}
                          {p.effortWasted?.trim() && (
                            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', opacity: 0.6, marginTop: 2 }}>
                              WASTED: {p.effortWasted}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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

const sectionHead = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.18em',
  margin: '0 0 10px',
};

const emptyBox = {
  fontSize: 10,
  letterSpacing: '0.1em',
  opacity: 0.55,
  border: '1.5px dashed rgba(10,10,10,0.4)',
  padding: '16px 14px',
  textAlign: 'center',
};

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Moon, X } from 'lucide-react';
import { blockRangeLabel } from './timeUtils.js';

const STEPS = ['first-task', 'worry-dump', 'flags', 'done'];

export default function EveningRitual({
  dateLabel,
  blocks,
  onToggleBlockWorth,
  worryDump,
  onWorryChange,
  initialFirstTask,
  onSaveFirstTask,
  onFinish,
  onClose,
}) {
  const [step, setStep] = useState(0);
  const [firstTask, setFirstTask] = useState(initialFirstTask || '');

  const saveFirstTask = () => onSaveFirstTask(firstTask.trim());

  const next = () => {
    if (STEPS[step] === 'first-task') saveFirstTask();
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  const back = () => { if (step > 0) setStep(step - 1); };

  const close = () => {
    saveFirstTask();
    onClose();
  };

  const finish = () => {
    saveFirstTask();
    onFinish();
  };

  const labeledBlocks = (blocks || []).slice().sort((a, b) => a.start - b.start);

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
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px 60px', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="display-font" style={{ fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Moon size={18} /> Evening Ritual
          </div>
          <button onClick={close} aria-label="Close" style={ritualNavBtn}><X size={16} /></button>
        </div>
        <div className="mono" style={{ fontSize: 11, opacity: 0.6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {dateLabel}
        </div>

        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, margin: '18px 0 26px' }}>
          {STEPS.slice(0, 3).map((s, i) => (
            <div
              key={s}
              style={{
                width: 28,
                height: 4,
                background: i <= Math.min(step, 2) ? '#0a0a0a' : 'rgba(10,10,10,0.2)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div style={{ flex: 1 }} className="fade-in" key={step}>
          {STEPS[step] === 'first-task' && (
            <div>
              <h2 className="display-font" style={{ fontSize: 28, margin: '0 0 6px', lineHeight: 1.1 }}>
                Tomorrow's first task
              </h2>
              <p style={{ fontSize: 14, opacity: 0.7, margin: '0 0 18px', lineHeight: 1.5 }}>
                One thing. It will be waiting, pinned at the top of tomorrow's page.
              </p>
              <input
                className="planner-input"
                autoFocus
                placeholder="e.g. Write the project outline"
                value={firstTask}
                onChange={(e) => setFirstTask(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') next(); }}
                style={{ fontSize: 16, padding: '14px 14px' }}
              />
            </div>
          )}

          {STEPS[step] === 'worry-dump' && (
            <div>
              <h2 className="display-font" style={{ fontSize: 28, margin: '0 0 6px', lineHeight: 1.1 }}>
                What's on your mind?
              </h2>
              <p style={{ fontSize: 14, opacity: 0.7, margin: '0 0 18px', lineHeight: 1.5 }}>
                Leave it here so it doesn't follow you to bed.
              </p>
              <textarea
                className="planner-input"
                autoFocus
                placeholder="Worries, loose ends, unfinished thoughts…"
                value={worryDump}
                onChange={(e) => onWorryChange(e.target.value)}
                style={{
                  minHeight: 240,
                  resize: 'vertical',
                  fontFamily: 'Inter, sans-serif',
                  lineHeight: 1.7,
                  fontSize: 15,
                  background:
                    'repeating-linear-gradient(transparent, transparent 27px, rgba(10,10,10,0.18) 27px, rgba(10,10,10,0.18) 28px) rgba(255,255,255,0.55)',
                }}
              />
            </div>
          )}

          {STEPS[step] === 'flags' && (
            <div>
              <h2 className="display-font" style={{ fontSize: 28, margin: '0 0 6px', lineHeight: 1.1 }}>
                Worth repeating?
              </h2>
              <p style={{ fontSize: 14, opacity: 0.7, margin: '0 0 18px', lineHeight: 1.5 }}>
                Tap anything that wasn't worth the time. No judgment — just data for future you.
              </p>
              {labeledBlocks.length === 0 && (
                <div className="mono" style={{ fontSize: 12, opacity: 0.55, border: '1.5px dashed rgba(10,10,10,0.4)', padding: '18px 14px', textAlign: 'center' }}>
                  No time blocks today.
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {labeledBlocks.map((b) => {
                  const flagged = !!b.notWorth;
                  return (
                    <button
                      key={b.id}
                      onClick={() => onToggleBlockWorth(b.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        textAlign: 'left',
                        border: '1.5px solid #0a0a0a',
                        background: flagged ? 'rgba(10,10,10,0.07)' : 'rgba(255,255,255,0.55)',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        color: '#0a0a0a',
                        opacity: flagged ? 0.65 : 1,
                        transition: 'all 0.15s',
                        width: '100%',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="mono" style={{ fontSize: 10, opacity: 0.55, letterSpacing: '0.08em', marginBottom: 2 }}>
                          {blockRangeLabel(b)}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, textDecoration: flagged ? 'line-through' : 'none' }}>
                          {b.text?.trim() || 'Untitled block'}
                        </div>
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 9,
                          letterSpacing: '0.08em',
                          padding: '4px 7px',
                          border: '1.5px solid',
                          borderColor: flagged ? '#0a0a0a' : 'rgba(10,10,10,0.3)',
                          background: flagged ? '#0a0a0a' : 'transparent',
                          color: flagged ? '#EAC289' : 'rgba(10,10,10,0.5)',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {flagged ? 'NOT WORTH IT' : 'WORTH IT'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {STEPS[step] === 'done' && (
            <div style={{ textAlign: 'center', paddingTop: 24 }}>
              <img
                src="/goodnight.jpg"
                alt="A corgi, fast asleep"
                style={{
                  width: 'min(220px, 60vw)',
                  aspectRatio: '1',
                  border: '2px solid #0a0a0a',
                  boxShadow: '0 2px 0 #0a0a0a',
                  display: 'block',
                  margin: '0 auto 20px',
                  objectFit: 'cover',
                }}
              />
              <h2 className="display-font" style={{ fontSize: 28, margin: '0 0 8px' }}>Day closed.</h2>
              <p style={{ fontSize: 14, opacity: 0.7, margin: 0, lineHeight: 1.5 }}>
                Tomorrow knows what to do first.<br />Rest well.
              </p>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div style={{ display: 'flex', gap: 10, marginTop: 30 }}>
          {step > 0 && STEPS[step] !== 'done' && (
            <button onClick={back} style={{ ...ritualNavBtn, width: 48, height: 48 }} aria-label="Back">
              <ArrowLeft size={18} />
            </button>
          )}
          {STEPS[step] !== 'done' ? (
            <button
              onClick={next}
              className="mono"
              style={{
                flex: 1,
                height: 48,
                background: '#0a0a0a',
                color: '#EAC289',
                border: '2px solid #0a0a0a',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.12em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {STEPS[step] === 'flags' ? 'CLOSE THE DAY' : 'NEXT'} <ArrowRight size={15} />
            </button>
          ) : (
            <button
              onClick={finish}
              className="mono"
              style={{
                flex: 1,
                height: 48,
                background: '#B06A33',
                color: '#fff',
                border: '2px solid #0a0a0a',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.12em',
                cursor: 'pointer',
              }}
            >
              GOODNIGHT
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const ritualNavBtn = {
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
};

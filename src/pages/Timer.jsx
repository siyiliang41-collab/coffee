import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, SkipForward, Check, Flag } from 'lucide-react';
import { getMethods, calculateCaffeine } from '../db/api';
import { DEFAULT_METHODS } from '../db/seedData';

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // audio not available
  }
}

export default function Timer() {
  const navigate = useNavigate();
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedAtRef = useRef(null);
  const vibratedRef = useRef(new Set());

  const [methods, setMethods] = useState(DEFAULT_METHODS);
  const [selected, setSelected] = useState(null); // method object
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0); // total seconds
  const [stageElapsed, setStageElapsed] = useState(0); // current stage seconds
  const [completed, setCompleted] = useState(false);
  const [totalActual, setTotalActual] = useState(0);
  const [grindFeedback, setGrindFeedback] = useState('');

  // Load methods from DB on mount
  useEffect(() => {
    getMethods().then(data => {
      if (data.length > 0) setMethods(data);
      else setMethods(DEFAULT_METHODS);
      if (data.length > 0) setSelected(data[0]);
      else if (DEFAULT_METHODS.length > 0) setSelected(DEFAULT_METHODS[0]);
    });
  }, []);

  const stages = selected?.stages || [];
  const totalDuration = selected?.total_duration || 0;

  // Main timer tick
  const tick = useCallback(() => {
    if (!startTimeRef.current || !selected) return;
    const now = performance.now();
    const totalMs = now - startTimeRef.current;
    const totalSec = Math.floor(totalMs / 1000);
    setElapsed(totalSec);

    // Calculate current stage progress
    let cumulative = 0;
    let curStage = 0;
    let curStageElapsed = 0;
    for (let i = 0; i < stages.length; i++) {
      const stageDur = stages[i].duration || 0;
      if (stageDur === 0) {
        // Infinite stage (like moka pot), stay on it
        curStage = i;
        curStageElapsed = Math.max(0, totalSec - cumulative);
        break;
      }
      if (totalSec >= cumulative && totalSec < cumulative + stageDur) {
        curStage = i;
        curStageElapsed = totalSec - cumulative;
        break;
      }
      cumulative += stageDur;
      if (i === stages.length - 1) {
        curStage = i;
        curStageElapsed = totalSec - cumulative;
      }
    }
    setStageIdx(curStage);
    setStageElapsed(Math.max(0, curStageElapsed));

    // Vibrate on stage transitions
    if (!vibratedRef.current.has(curStage) && curStage > 0) {
      vibratedRef.current.add(curStage);
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {}
      beep();
    }

    // Check completion
    if (totalDuration > 0 && totalSec >= totalDuration) {
      setRunning(false);
      setCompleted(true);
      setTotalActual(totalSec);
      setGrindFeedback(grindTip(totalSec));
      try {
        navigator.vibrate?.([300, 200, 300, 200, 600]);
      } catch {}
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [selected, stages, totalDuration]);

  // Start / resume timer
  function handleStart() {
    if (paused) {
      const pausedDuration = performance.now() - pausedAtRef.current;
      startTimeRef.current += pausedDuration;
      setPaused(false);
    } else {
      startTimeRef.current = performance.now();
      setStageIdx(0);
      setElapsed(0);
      setStageElapsed(0);
      setCompleted(false);
      vibratedRef.current = new Set();
    }
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }

  function handlePause() {
    setRunning(false);
    setPaused(true);
    pausedAtRef.current = performance.now();
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function handleReset() {
    setRunning(false);
    setPaused(false);
    setElapsed(0);
    setStageElapsed(0);
    setStageIdx(0);
    setCompleted(false);
    vibratedRef.current = new Set();
    startTimeRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function handleSkipStage() {
    if (!selected || stageIdx >= stages.length - 1) return;
    // Advance time to the end of current stage
    let cumulative = 0;
    for (let i = 0; i <= stageIdx; i++) {
      cumulative += stages[i]?.duration || 0;
    }
    startTimeRef.current = performance.now() - cumulative * 1000;
    if (!running && !paused) {
      // manually recalc
      setElapsed(cumulative);
      setStageIdx(stageIdx + 1);
      setStageElapsed(0);
    }
  }

  function grindTip(sec) {
    const range = selected?.ideal_range;
    if (!range) return '';
    if (sec < range[0]) return '粉可能偏粗，水流偏快 → 下次调细一点 · 咖啡因可能偏低';
    if (sec > range[1]) return '粉可能偏细，水流偏慢 → 下次调粗一点 · 咖啡因可能偏高';
    return '研磨度刚好，时间在理想范围内 · 咖啡因正常';
  }

  function handleComplete() {
    if (!startTimeRef.current) return;
    const now = performance.now();
    const totalSec = Math.floor((now - startTimeRef.current) / 1000);
    setRunning(false);
    setPaused(false);
    setCompleted(true);
    setTotalActual(totalSec);
    setGrindFeedback(grindTip(totalSec));
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    try { navigator.vibrate?.([300, 200, 300]); } catch {}
  }

  function handleRecordIntake() {
    const caffeine = calculateCaffeine(selected?.coffee_g || 15, selected?.category || '手冲');
    navigate(`/record?method=${selected?.name || ''}&grams=${selected?.coffee_g || 15}&caffeine=${caffeine}`);
  }

  // Stage progress ring
  const ringR = 70;
  const ringCirc = 2 * Math.PI * ringR;
  const curStage = stages[stageIdx] || {};
  const curStageDur = curStage.duration || 0;
  const curProgress = curStageDur > 0 ? Math.min(stageElapsed / curStageDur, 1) : 0;
  const ringDash = ringCirc * curProgress;

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4">
      <h1 className="text-xl font-sketch text-coffee-700 text-center mb-4">⏳ 冲煮计时器</h1>

      {/* Method selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {methods.filter(m => m.key !== 'cold_brew').map(m => (
          <button
            key={m.id || m.key}
            onClick={() => {
              if (running) return;
              setSelected(m);
              handleReset();
            }}
            className={`sketch-btn px-4 py-2 text-sm whitespace-nowrap border-2 transition-all ${
              selected?.key === m.key
                ? 'border-coffee-600 bg-coffee-600 text-white'
                : 'border-coffee-200 bg-white text-coffee-600'
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div className="flex flex-col items-center mb-5">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
            <circle
              cx="80" cy="80" r={ringR}
              fill="none" stroke="#F5E6D3" strokeWidth="10" strokeLinecap="round"
            />
            <circle
              cx="80" cy="80" r={ringR}
              fill="none" stroke="#6B3A2A" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${ringDash} ${ringCirc - ringDash}`}
              style={{ transition: 'stroke-dasharray 0.2s linear' }}
            />
            {/* Wobble overlay */}
            <circle
              cx="80" cy="80" r={ringR}
              fill="none" stroke="#D4844A" strokeWidth="1"
              strokeDasharray="3 10" opacity="0.4"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {completed ? (
              <Check size={36} className="text-green-500 mb-1" />
            ) : (
              <span className="text-4xl font-bold text-coffee-700 font-mono tracking-tight">
                {formatTime(elapsed)}
              </span>
            )}
            <span className="text-xs text-coffee-400 mt-1 text-center px-2">
              {completed ? '完成!' : curStage.name || '准备开始'}
            </span>
            {running && curStageDur > 0 && (
              <span className="text-xs text-coffee-300">
                目标 {formatTime(curStageDur)}
              </span>
            )}
          </div>
        </div>

        {/* Overall progress bar */}
        {totalDuration > 0 && (
          <div className="w-full h-1.5 bg-coffee-100 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-coffee-400 rounded-full transition-all duration-200"
              style={{ width: `${Math.min(elapsed / totalDuration * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Stage list */}
      <div className="flex flex-col gap-2 mb-5">
        {stages.map((s, i) => {
          const isActive = i === stageIdx && running;
          const isDone = i < stageIdx || completed;
          return (
            <div
              key={i}
              className={`sketch-card flex items-center gap-3 py-2 px-3 transition-all ${
                isActive ? 'border-coffee-500 border-solid shadow-md' : ''
              } ${isDone ? 'opacity-70' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  isDone
                    ? 'bg-green-400 border-green-500 text-white line-through'
                    : isActive
                    ? 'bg-coffee-600 border-coffee-600 text-white'
                    : 'border-coffee-200 text-coffee-300'
                }`}
              >
                {isDone ? <Check size={14} /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm ${isDone ? 'text-coffee-400 line-through' : 'text-coffee-700'}`}>
                  {s.name}
                </div>
                {s.action && (
                  <div className="text-xs text-coffee-400 truncate">{s.action}</div>
                )}
              </div>
              <div className="text-right text-sm">
                {s.duration > 0 ? (
                  <span className={`font-mono ${isDone ? 'text-coffee-300' : 'text-coffee-500'}`}>
                    {isActive ? formatTime(stageElapsed) : formatTime(0)} / {formatTime(s.duration)}
                  </span>
                ) : (
                  <span className="text-coffee-300">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 mb-4">
        {!running && !paused && !completed && (
          <button
            onClick={handleStart}
            className="w-16 h-16 rounded-full bg-coffee-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          >
            <Play size={28} className="ml-1" />
          </button>
        )}
        {(running || paused) && !completed && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex justify-center gap-4">
              <button
                onClick={handleReset}
                className="w-12 h-12 rounded-full border-2 border-coffee-300 text-coffee-500 flex items-center justify-center active:scale-90 transition-transform"
              >
                <RotateCcw size={20} />
              </button>
              <button
                onClick={running ? handlePause : handleStart}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform ${
                  running ? 'bg-coffee-400 text-white' : 'bg-coffee-600 text-white'
                }`}
              >
                {running ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </button>
              <button
                onClick={handleSkipStage}
                disabled={stageIdx >= stages.length - 1 || (stages[stageIdx + 1]?.duration === 0 && stages.length > 1)}
                className="w-12 h-12 rounded-full border-2 border-coffee-300 text-coffee-500 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
              >
                <SkipForward size={20} />
              </button>
            </div>
            <button
              onClick={handleComplete}
              className="sketch-btn flex items-center gap-1.5 px-6 py-2.5 border-2 border-coffee-400 text-coffee-500 bg-white font-sketch active:scale-95 transition-all"
            >
              <Flag size={16} />
              已完成
            </button>
          </div>
        )}
        {completed && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-coffee-600 font-sketch">
              总用时 {formatTime(totalActual)}
            </p>
            {grindFeedback && (
              <p className={`text-sm px-3 py-1.5 rounded-sketch-sm ${
                grindFeedback.includes('刚好')
                  ? 'bg-green-100 text-green-700'
                  : grindFeedback.includes('偏粗')
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {grindFeedback}
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={handleReset} className="sketch-btn-secondary">
                再来一次
              </button>
              <button onClick={handleRecordIntake} className="sketch-btn-primary">
                记录摄入
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

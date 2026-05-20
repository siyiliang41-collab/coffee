import { useState, useEffect } from 'react';
import { Timer, Thermometer, Droplets, Gauge, Clock } from 'lucide-react';
import { getMethods } from '../db/api';
import { DEFAULT_METHODS } from '../db/seedData';

function formatDuration(sec) {
  if (!sec) return '—';
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return m > 0 ? `${h}~${Math.ceil(sec / 3600)}小时` : `${h}小时`;
  }
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
}

const CATEGORIES = ['手冲', '摩卡壶', '冷萃'];
const CATEGORY_ICONS = {
  '手冲': '☕',
  '摩卡壶': '🫖',
  '冷萃': '🧊',
};

export default function Methods() {
  const [methods, setMethods] = useState([]);
  const [activeCat, setActiveCat] = useState('手冲');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    getMethods().then(data => {
      if (data.length > 0) setMethods(data);
      else setMethods(DEFAULT_METHODS);
    });
  }, []);

  const filtered = methods.filter(m => m.category === activeCat);

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4">
      <h1 className="text-xl font-sketch text-coffee-700 text-center mb-4">
        🧪 冲煮方法库
      </h1>

      {/* Category tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 justify-center">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCat(cat); setExpanded(null); }}
            className={`sketch-btn px-4 py-2 text-sm whitespace-nowrap border-2 transition-all ${
              activeCat === cat
                ? 'border-coffee-600 bg-coffee-600 text-white'
                : 'border-coffee-200 bg-white text-coffee-600'
            }`}
          >
            {CATEGORY_ICONS[cat]} {cat}
          </button>
        ))}
      </div>

      {/* Method cards */}
      <div className="flex flex-col gap-4">
        {filtered.map(m => {
          const isOpen = expanded === (m.id || m.key);
          const waterMl = m.coffee_g * (m.water_ratio || 15);

          return (
            <div
              key={m.id || m.key}
              className={`sketch-card cursor-pointer transition-all ${
                isOpen ? 'border-coffee-500 border-solid' : ''
              }`}
              onClick={() => setExpanded(isOpen ? null : (m.id || m.key))}
            >
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-sketch text-coffee-700 text-lg">
                    {m.name}
                  </h3>
                  <p className="text-xs text-coffee-400 mt-0.5">{m.description}</p>
                </div>
                <span className="text-coffee-300 text-lg transition-transform duration-200"
                  style={{ transform: isOpen ? 'rotate(180deg)' : '' }}
                >
                  ▼
                </span>
              </div>

              {/* Quick stats row (always visible) */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1 text-xs bg-coffee-100 text-coffee-600 px-2 py-1 rounded">
                  <Timer size={12} /> {m.coffee_g}g 粉
                </span>
                <span className="inline-flex items-center gap-1 text-xs bg-coffee-100 text-coffee-600 px-2 py-1 rounded">
                  <Droplets size={12} /> 1:{m.water_ratio} → {waterMl}ml
                </span>
                {m.grind_size && (
                  <span className="inline-flex items-center gap-1 text-xs bg-coffee-100 text-coffee-600 px-2 py-1 rounded">
                    <Gauge size={12} /> {m.grind_size}
                  </span>
                )}
                {m.total_duration && (
                  <span className="inline-flex items-center gap-1 text-xs bg-coffee-100 text-coffee-600 px-2 py-1 rounded">
                    <Clock size={12} /> {formatDuration(m.total_duration)}
                  </span>
                )}
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="mt-4 pt-4 border-t-2 border-dashed border-coffee-200">
                  {/* Water temp */}
                  {m.water_temp && (
                    <div className="mb-3">
                      <span className="text-xs text-coffee-400 flex items-center gap-1 mb-1">
                        <Thermometer size={12} /> 水温
                      </span>
                      {typeof m.water_temp === 'object' ? (
                        <div className="flex gap-2 text-xs">
                          <span className="bg-[#D4A574] bg-opacity-20 text-[#8B5E3C] px-2 py-0.5 rounded">
                            浅烘 {m.water_temp.light}°C
                          </span>
                          <span className="bg-[#8B5E3C] bg-opacity-20 text-[#5A2E1F] px-2 py-0.5 rounded">
                            中烘 {m.water_temp.medium}°C
                          </span>
                          <span className="bg-[#492418] bg-opacity-20 text-[#3C2415] px-2 py-0.5 rounded">
                            深烘 {m.water_temp.dark}°C
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-coffee-600">{m.water_temp}</span>
                      )}
                    </div>
                  )}

                  {/* Stages */}
                  {m.stages && m.stages.length > 0 && (
                    <div>
                      <span className="text-xs text-coffee-400 mb-2 block">分段步骤</span>
                      <div className="relative pl-5">
                        {/* Timeline line */}
                        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-coffee-200" />
                        {m.stages.map((s, i) => (
                          <div key={i} className="relative pb-3 last:pb-0">
                            {/* Dot */}
                            <div
                              className={`absolute -left-5 top-1 w-[10px] h-[10px] rounded-full border-2 ${
                                i === 0
                                  ? 'bg-coffee-600 border-coffee-600'
                                  : 'bg-white border-coffee-300'
                              }`}
                            />
                            <div className="text-sm font-medium text-coffee-700">
                              {i + 1}. {s.name}
                              {s.duration > 0 && (
                                <span className="text-coffee-400 font-normal ml-1">
                                  ({formatDuration(s.duration)})
                                </span>
                              )}
                            </div>
                            {s.action && (
                              <div className="text-xs text-coffee-400 mt-0.5">
                                {s.action}
                              </div>
                            )}
                            {s.water_ml > 0 && (
                              <div className="text-xs text-coffee-300 mt-0.5">
                                注水 {s.water_ml}ml
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  {m.grind_tips && (
                    <div className="mt-3 text-xs text-coffee-400 bg-coffee-50 p-2 rounded italic">
                      💡 {m.grind_tips}
                    </div>
                  )}
                  {m.ideal_range && (
                    <div className="mt-2 text-xs text-coffee-400">
                      理想总时间: {formatDuration(m.ideal_range[0])} ~ {formatDuration(m.ideal_range[1])}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

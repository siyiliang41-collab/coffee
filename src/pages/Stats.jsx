import { useState, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, Calendar, TrendingUp } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { getWeeklyStats, getMonthlyRecords, getYearlyRecords, getRecordsInRange } from '../db/api';
import { pad } from '../utils/time';

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
const NOW = new Date();

function localDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const glassOption = (data, labels, color) => ({
  tooltip: { trigger: 'axis' },
  grid: { top: 8, right: 8, bottom: 24, left: 40 },
  xAxis: {
    type: 'category', data: labels,
    axisLabel: { color: '#8B5E3C', fontSize: 10, interval: 0 },
    axisTick: { show: false },
    axisLine: { lineStyle: { color: '#E8D5B8' } },
  },
  yAxis: {
    type: 'value', name: 'mg',
    axisLabel: { color: '#8B5E3C', fontSize: 10 },
    splitLine: { lineStyle: { color: '#F5E6D3', type: 'dashed' } },
    nameTextStyle: { color: '#8B5E3C', fontSize: 10 },
  },
  series: [{
    data, type: 'bar',
    itemStyle: {
      color,
      borderRadius: [8, 8, 0, 0],
    },
    barWidth: '55%',
    emphasis: { itemStyle: { color: '#3C2415' } },
  }],
});

export default function Stats() {
  const [view, setView] = useState('week');
  const [weekData, setWeekData] = useState({});
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthYear, setMonthYear] = useState({ year: NOW.getFullYear(), month: NOW.getMonth() + 1 });
  const [exportYear, setExportYear] = useState(NOW.getFullYear());
  const [monthRecords, setMonthRecords] = useState([]);
  const [yearRecords, setYearRecords] = useState([]);

  // ── Week ──
  useEffect(() => { loadWeek(); }, [weekOffset]);

  function weekRange() {
    const end = new Date();
    end.setDate(end.getDate() - weekOffset * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return [start, end];
  }

  function loadWeek() {
    const [s, e] = weekRange();
    const startStr = localISO(new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0));
    const endStr = localISO(new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59));
    getWeeklyStats(startStr, endStr).then(setWeekData);
  }

  function changeWeek(delta) {
    setWeekOffset(o => Math.max(0, o + delta));
  }

  // ── Month ──
  useEffect(() => {
    if (view === 'month') getMonthlyRecords(monthYear.year, monthYear.month).then(setMonthRecords);
  }, [view, monthYear]);

  // ── Year ──
  useEffect(() => {
    if (view === 'year') getYearlyRecords(exportYear).then(setYearRecords);
  }, [view, exportYear]);

  // ── Export ──
  const COFFEE_G_BRAND = { '冷萃': 25, '生椰拿铁': 18 }; // espresso-based default 18g

  function sourceText(r) {
    const bn = r.brandName || '';
    if (!bn) return r.source || '';
    // "星巴克 · 美式 · 中杯" → "星巴克 · 美式"
    const parts = bn.split(' · ');
    if (parts.length >= 3) return `${parts[0]} · ${parts[1]}`;
    return bn;
  }

  function coffeeGrams(r) {
    if (r.coffee_g) return r.coffee_g;
    // brand mode: guess from drink type
    const bn = r.brandName || '';
    const drink = bn.split(' · ')[1] || '';
    return COFFEE_G_BRAND[drink] || 18;
  }

  function timeStr(r) {
    const t = r.drankAt?.split('T')[1];
    return t ? t.slice(0, 5) : '';
  }

  function doExport(records, filename) {
    if (records.length === 0) { alert('没有数据可导出'); return; }
    const header = '日期,时间,来源,咖啡因(mg),粉量(g),备注';
    const rows = records.map(r => [
      r.drankAt?.split('T')[0] || '',
      timeStr(r),
      sourceText(r),
      r.caffeine_mg || 0,
      coffeeGrams(r),
      r.notes || '',
    ].join(','));
    const csv = '﻿' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportWeek() {
    const [s, e] = weekRange();
    const startStr = localISO(new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0));
    const endStr = localISO(new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59));
    const records = await getRecordsInRange(startStr, endStr);
    doExport(records, `咖啡记录_${localDateStr(s)}_${localDateStr(e)}.csv`);
  }

  function exportMonth() {
    doExport(monthRecords, `咖啡记录_${monthYear.year}-${pad(monthYear.month)}.csv`);
  }

  function exportYearCSV() {
    doExport(yearRecords, `咖啡记录_${exportYear}.csv`);
  }

  // ── Week chart data ──
  const [wS, wE] = weekRange();
  const weekLabel = `${wS.getMonth() + 1}/${wS.getDate()} - ${wE.getMonth() + 1}/${wE.getDate()}`;
  const weekDates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(wE);
    d.setDate(d.getDate() - i);
    weekDates.push(localDateStr(d));
  }
  const weekValues = weekDates.map(d => weekData[d] || 0);
  const weekTotal = weekValues.reduce((a, b) => a + b, 0);
  const weekDays = weekValues.filter(v => v > 0).length;
  const weekAvg = weekDays > 0 ? Math.round(weekTotal / weekDays) : 0;
  const weekLabels = weekDates.map(d => `${d.slice(5)} ${DAY_NAMES[new Date(d).getDay()]}`);

  // ── Month chart data ──
  const daysInMonth = new Date(monthYear.year, monthYear.month, 0).getDate();
  const monthDayMap = {};
  monthRecords.forEach(r => {
    const day = r.drankAt?.split('T')[0]?.slice(8);
    if (day) monthDayMap[day] = (monthDayMap[day] || 0) + (r.caffeine_mg || 0);
  });
  const monthValues = Array.from({ length: daysInMonth }, (_, i) => monthDayMap[pad(i + 1)] || 0);
  const monthTotal = monthValues.reduce((a, b) => a + b, 0);
  const monthDays = monthValues.filter(v => v > 0).length;
  const monthAvg = monthDays > 0 ? Math.round(monthTotal / monthDays) : 0;
  const monthLabels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);

  // ── Year chart data ──
  const yearMonthMap = {};
  yearRecords.forEach(r => {
    const m = r.drankAt?.slice(5, 7);
    if (m) yearMonthMap[m] = (yearMonthMap[m] || 0) + (r.caffeine_mg || 0);
  });
  const yearValues = Array.from({ length: 12 }, (_, i) => yearMonthMap[pad(i + 1)] || 0);
  const yearTotal = yearValues.reduce((a, b) => a + b, 0);
  const yearMonths = yearValues.filter(v => v > 0).length;
  const yearAvg = yearMonths > 0 ? Math.round(yearTotal / yearMonths) : 0;

  // ── Summary card ──
  const Summary = ({ total, avg, days, unit }) => (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <div className="sketch-card text-center py-3 px-1">
        <div className="text-2xl font-bold text-coffee-700">{total}</div>
        <div className="text-[11px] text-coffee-400 mt-0.5">{unit}总量 mg</div>
      </div>
      <div className="sketch-card text-center py-3 px-1">
        <div className="text-2xl font-bold text-coffee-700">{avg}</div>
        <div className="text-[11px] text-coffee-400 mt-0.5">日均 mg</div>
      </div>
      <div className="sketch-card text-center py-3 px-1">
        <div className="text-2xl font-bold text-coffee-700">{days}</div>
        <div className="text-[11px] text-coffee-400 mt-0.5">饮用天数</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-sketch text-coffee-700">📊 数据中心</h1>
        {/* view switch */}
        <div className="flex bg-coffee-100 rounded-sketch p-1 gap-0.5">
          {[
            ['week', '周'],
            ['month', '月'],
            ['year', '年'],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3.5 py-1.5 text-xs rounded-sketch-sm font-sketch transition-all ${
                view === v ? 'bg-white text-coffee-700 shadow-sm' : 'text-coffee-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Week ── */}
      {view === 'week' && (
        <>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => changeWeek(1)} className="w-8 h-8 rounded-full border-2 border-coffee-200 flex items-center justify-center text-coffee-500 active:scale-90">
              <ChevronLeft size={16} />
            </button>
            <span className="font-sketch text-coffee-600 text-sm flex items-center gap-1.5">
              <Calendar size={14} /> {weekLabel}
            </span>
            <button
              onClick={() => changeWeek(-1)}
              disabled={weekOffset <= 0}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center active:scale-90 ${
                weekOffset <= 0 ? 'border-coffee-100 text-coffee-200' : 'border-coffee-200 text-coffee-500'
              }`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <Summary total={weekTotal} avg={weekAvg} days={weekDays} unit="周" />

          <div className="sketch-card mb-4">
            <ReactECharts option={glassOption(weekValues, weekLabels, '#6B3A2A')} style={{ height: 220 }} notMerge />
          </div>

          <button onClick={exportWeek} className="w-full py-3 rounded-sketch bg-coffee-600 text-white font-sketch font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Download size={18} />
            导出本周 CSV
          </button>
        </>
      )}

      {/* ── Month ── */}
      {view === 'month' && (
        <>
          <div className="flex gap-2 mb-4">
            <select
              value={monthYear.year}
              onChange={e => setMonthYear(p => ({ ...p, year: Number(e.target.value) }))}
              className="sketch-input flex-1 text-sm"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            <select
              value={monthYear.month}
              onChange={e => setMonthYear(p => ({ ...p, month: Number(e.target.value) }))}
              className="sketch-input flex-1 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}月</option>
              ))}
            </select>
          </div>

          <Summary total={monthTotal} avg={monthAvg} days={monthDays} unit="月" />

          <div className="sketch-card mb-4">
            {monthRecords.length === 0 ? (
              <div className="text-center py-12 text-coffee-300">
                <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
                <p className="font-sketch">这个月还没有记录</p>
              </div>
            ) : (
              <ReactECharts option={glassOption(monthValues, monthLabels, '#D4844A')} style={{ height: 240 }} notMerge />
            )}
          </div>

          <button onClick={exportMonth} className="w-full py-3 rounded-sketch bg-coffee-600 text-white font-sketch font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Download size={18} />
            导出 {monthYear.year}年{monthYear.month}月 CSV
          </button>
        </>
      )}

      {/* ── Year ── */}
      {view === 'year' && (
        <>
          <div className="flex gap-2 mb-4">
            <select
              value={exportYear}
              onChange={e => setExportYear(Number(e.target.value))}
              className="sketch-input flex-1 text-sm"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
          </div>

          <Summary total={yearTotal} avg={yearAvg} days={yearMonths} unit="年" />

          <div className="sketch-card mb-4">
            {yearRecords.length === 0 ? (
              <div className="text-center py-12 text-coffee-300">
                <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
                <p className="font-sketch">今年还没有记录</p>
              </div>
            ) : (
              <ReactECharts option={glassOption(yearValues, ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'], '#6B3A2A')} style={{ height: 240 }} notMerge />
            )}
          </div>

          <button onClick={exportYearCSV} className="w-full py-3 rounded-sketch bg-coffee-600 text-white font-sketch font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Download size={18} />
            导出 {exportYear}年 CSV
          </button>
        </>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Clock, Coffee } from 'lucide-react';
import { getDailyCaffeine, getRecords, deleteRecord } from '../db/api';
import { todayStr } from '../utils/time';
import useLongPress from '../utils/useLongPress';

const DAILY_LIMIT = 400;

function RecordCard({ record, onDelete }) {
  const { handlers } = useLongPress(onDelete);
  return (
    <div
      {...handlers}
      className="sketch-card flex justify-between items-center select-none"
      style={{ userSelect: 'none' }}
    >
      <div>
        <div className="font-medium text-coffee-700">
          {record.brandName || record.source || '自制'}
        </div>
        <div className="text-xs text-coffee-400">
          {record.brewMethod || record.drinkType}
          {record.coffee_g ? ` · ${record.coffee_g}g` : ''}
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold text-coffee-600">
          {record.caffeine_mg ?? '?'} mg
        </div>
        <div className="text-xs text-coffee-300">
          {record.drankAt
            ? new Date(record.drankAt).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [caffeine, setCaffeine] = useState(0);
  const [recent, setRecent] = useState([]);
  const location = useLocation();
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  useEffect(() => {
    loadData();
  }, [location]);

  useEffect(() => {
    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  function loadData() {
    getDailyCaffeine(todayStr()).then(setCaffeine);
    getRecords().then(r => setRecent(r.slice(0, 5)));
  }

  async function handleDeleteRecord(id) {
    if (!window.confirm('确定删除这条记录吗？')) return;
    await deleteRecord(id);
    loadData();
  }

  const pct = Math.min(caffeine / DAILY_LIMIT, 1);
  const remaining = Math.max(DAILY_LIMIT - caffeine, 0);
  const circumference = 2 * Math.PI * 54;
  const dash = circumference * pct;

  const statusColor =
    pct >= 1 ? '#D4844A' : pct >= 0.7 ? '#C0743A' : '#6B3A2A';

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4">
      {/* Header */}
      <h1 className="text-xl font-sketch text-coffee-700 text-center mb-1">
        喝了吗
      </h1>
      <p className="text-sm text-coffee-300 text-center mb-6">{today}</p>

      {/* Caffeine Ring */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-36 h-36">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            {/* background ring */}
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="#F5E6D3"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* progress ring */}
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke={statusColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
            {/* hand-drawn wobble overlay — slight distortion */}
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke={statusColor}
              strokeWidth="1"
              strokeLinecap="round"
              strokeDasharray="4 12"
              opacity="0.3"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-coffee-700">{caffeine}</span>
            <span className="text-xs text-coffee-400">/ {DAILY_LIMIT} mg</span>
          </div>
        </div>
        <p className="text-sm text-coffee-400 mt-2">
          {remaining > 0 ? `还可以喝 ~${remaining}mg 咖啡因` : '今日已达推荐上限'}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-6">
        <Link
          to="/record"
          className="flex-1 sketch-card flex items-center justify-center gap-2 py-3 text-coffee-600 active:scale-95 transition-transform"
        >
          <Plus size={20} />
          <span className="font-medium font-sketch">记一杯</span>
        </Link>
        <Link
          to="/timer"
          className="flex-1 sketch-card flex items-center justify-center gap-2 py-3 text-coffee-600 active:scale-95 transition-transform"
        >
          <Clock size={20} />
          <span className="font-medium font-sketch">开始冲煮</span>
        </Link>
      </div>

      {/* Recent Records */}
      <div>
        <h2 className="text-lg font-sketch text-coffee-700 mb-1 flex items-center gap-2">
          <Coffee size={18} />
          最近记录
        </h2>
        <p className="text-xs text-coffee-300 mb-3">长按或右键卡片可删除</p>
        {recent.length === 0 ? (
          <div className="sketch-card text-center py-8 text-coffee-300">
            <p className="font-sketch text-lg mb-1">还没有记录</p>
            <p className="text-sm">点击「记一杯」开始吧 ☕</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map(r => (
              <RecordCard key={r.id} record={r} onDelete={() => handleDeleteRecord(r.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

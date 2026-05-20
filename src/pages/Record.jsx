import { useState, useEffect } from 'react';
import { addRecord, calculateCaffeine, BRAND_CAFFEINE, BEAN_TYPES, getBeans } from '../db/api';
import { nowLocal, toLocalISO } from '../utils/time';

const BRANDS = Object.keys(BRAND_CAFFEINE);
const BEAN_TYPE_KEYS = Object.keys(BEAN_TYPES);
const GENERIC_DRINKS = { '美式': 180, '拿铁': 130, '卡布奇诺': 130, '摩卡': 160, '冷萃': 200, '澳白': 150 };
const CUP_SIZES = { '小杯': 0.75, '中杯': 1, '大杯': 1.35 };
const SELF_METHODS = ['手冲', '摩卡壶', '冷萃', '法压壶', '意式', '其他'];

export default function Record() {
  const [mode, setMode] = useState('brand');
  const [brand, setBrand] = useState(BRANDS[0]);
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [drink, setDrink] = useState('');
  const [cupSize, setCupSize] = useState('中杯');
  const [method, setMethod] = useState('手冲');
  const [grams, setGrams] = useState(15);
  const [beanType, setBeanType] = useState('阿拉比卡');
  const [caffeine, setCaffeine] = useState(0);
  const [drankAt, setDrankAt] = useState(nowLocal);
  const [notes, setNotes] = useState('');
  const [beans, setBeans] = useState([]);
  const [beanId, setBeanId] = useState('');
  const [saved, setSaved] = useState(false);

  const beanMap = {};
  beans.forEach(b => { beanMap[b.id] = b; });

  useEffect(() => {
    getBeans().then(setBeans).catch(() => {});
  }, []);

  const currentDrinks = isCustom ? GENERIC_DRINKS : (BRAND_CAFFEINE[brand] || {});

  // Auto-calc caffeine when inputs change
  useEffect(() => {
    if (mode === 'brand') {
      if (!drink) { setCaffeine(0); return; }
      const base = (isCustom ? GENERIC_DRINKS : BRAND_CAFFEINE[brand])?.[drink] || 180;
      const scale = CUP_SIZES[cupSize] || 1;
      setCaffeine(Math.round(base * scale));
    } else {
      setCaffeine(calculateCaffeine(grams || 0, method, beanType));
    }
  }, [mode, brand, drink, cupSize, method, grams, isCustom, beanType]);

  function selectPresetBrand(b) {
    setBrand(b);
    setIsCustom(false);
    setCustomName('');
    setDrink('');
  }

  function selectCustom() {
    setIsCustom(true);
    setBrand('');
    setDrink('');
  }

  async function handleSave() {
    const displayName = isCustom ? (customName.trim() || '自定义品牌') : brand;
    const record = {
      drankAt: toLocalISO(new Date(drankAt)),
      caffeine_mg: caffeine,
      source: displayName,
      notes,
      beanId: beanId || undefined,
      beanType: mode === 'self' ? beanType : undefined,
      brandName: mode === 'brand' ? `${displayName} · ${drink} · ${cupSize}` : `自制 · ${method}`,
      brewMethod: mode === 'self' ? method : '',
      coffee_g: mode === 'self' ? grams : (drink === '冷萃' ? 25 : 18),
    };
    await addRecord(record);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setDrankAt(nowLocal());
    setNotes('');
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4">
      <h1 className="text-xl font-sketch text-coffee-700 text-center mb-6">
        ✏️ 记录咖啡
      </h1>

      {/* Mode Toggle */}
      <div className="flex mb-5 bg-coffee-100 rounded-sketch p-1">
        {[
          ['brand', '🏪 品牌'],
          ['self', '🏠 自制'],
        ].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setMode(v)}
            className={`flex-1 py-2 rounded-sketch-sm font-sketch transition-all ${
              mode === v
                ? 'bg-white text-coffee-700 shadow-sm'
                : 'text-coffee-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Brand Mode */}
      {mode === 'brand' && (
        <div className="flex flex-col gap-4">
          {/* Brand selector */}
          <div>
            <label className="text-sm text-coffee-500 mb-1 block font-sketch">品牌</label>
            <div className="grid grid-cols-3 gap-2">
              {BRANDS.map(b => (
                <button
                  key={b}
                  onClick={() => selectPresetBrand(b)}
                  className={`sketch-btn py-2 px-2 text-sm border-2 transition-all ${
                    !isCustom && brand === b
                      ? 'border-coffee-600 bg-coffee-600 text-white'
                      : 'border-coffee-200 bg-white text-coffee-600'
                  }`}
                >
                  {b}
                </button>
              ))}
              <button
                onClick={selectCustom}
                className={`sketch-btn py-2 px-2 text-sm border-2 transition-all ${
                  isCustom
                    ? 'border-coffee-600 bg-coffee-600 text-white'
                    : 'border-coffee-200 bg-white text-coffee-600'
                }`}
              >
                自定义
              </button>
            </div>
            {isCustom && (
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="输入品牌名称"
                className="sketch-input w-full mt-2"
                autoFocus
              />
            )}
          </div>

          {/* Drink type */}
          <div>
            <label className="text-sm text-coffee-500 mb-1 block font-sketch">饮品</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(currentDrinks).map(d => (
                <button
                  key={d}
                  onClick={() => setDrink(d)}
                  className={`sketch-btn py-2 px-2 text-sm border-2 transition-all ${
                    drink === d
                      ? 'border-coffee-600 bg-coffee-600 text-white'
                      : 'border-coffee-200 bg-white text-coffee-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Cup size */}
          <div>
            <label className="text-sm text-coffee-500 mb-1 block font-sketch">杯型</label>
            <div className="flex gap-2">
              {Object.entries(CUP_SIZES).map(([s, scale]) => (
                <button
                  key={s}
                  onClick={() => setCupSize(s)}
                  className={`flex-1 sketch-btn py-2 text-sm border-2 transition-all ${
                    cupSize === s
                      ? 'border-coffee-600 bg-coffee-600 text-white'
                      : 'border-coffee-200 bg-white text-coffee-600'
                  }`}
                >
                  {s} ({Math.round((currentDrinks[drink] || 180) * scale)}mg)
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Self Mode */}
      {mode === 'self' && (
        <div className="flex flex-col gap-4">
          {/* Method */}
          <div>
            <label className="text-sm text-coffee-500 mb-1 block font-sketch">冲煮方法</label>
            <div className="grid grid-cols-3 gap-2">
              {SELF_METHODS.map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`sketch-btn py-2 px-2 text-sm border-2 transition-all ${
                    method === m
                      ? 'border-coffee-600 bg-coffee-600 text-white'
                      : 'border-coffee-200 bg-white text-coffee-600'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Bean type (self mode) */}
          <div>
            <label className="text-sm text-coffee-500 mb-1 block font-sketch">豆种</label>
            <div className="flex gap-2">
              {BEAN_TYPE_KEYS.map(t => (
                <button
                  key={t}
                  onClick={() => setBeanType(t)}
                  className={`flex-1 sketch-btn py-2 text-sm border-2 transition-all ${
                    beanType === t
                      ? 'border-coffee-600 bg-coffee-600 text-white'
                      : 'border-coffee-200 bg-white text-coffee-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Grams */}
          <div>
            <label className="text-sm text-coffee-500 mb-1 block font-sketch">
              咖啡粉量 (g)
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setGrams(Math.max(5, grams - 1))}
                className="w-10 h-10 rounded-full border-2 border-coffee-300 text-coffee-500 text-xl font-bold active:scale-90 transition-transform"
              >
                −
              </button>
              <input
                type="number"
                value={grams}
                onChange={e => setGrams(Number(e.target.value) || 0)}
                className="sketch-input w-24 text-center text-xl font-bold text-coffee-700"
                min={5}
                max={100}
              />
              <button
                onClick={() => setGrams(Math.min(100, grams + 1))}
                className="w-10 h-10 rounded-full border-2 border-coffee-300 text-coffee-500 text-xl font-bold active:scale-90 transition-transform"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Caffeine display */}
      <div className="mt-5 p-4 sketch-card text-center">
        <span className="text-sm text-coffee-400">预估咖啡因</span>
        <div className="text-3xl font-bold text-coffee-700">{caffeine} mg</div>
      </div>

      {/* Bean selector (optional) */}
      {beans.length > 0 && (
        <div className="mt-4">
          <label className="text-sm text-coffee-500 mb-1 block font-sketch">使用豆子（可选）</label>
          <select
            value={beanId}
            onChange={e => {
              setBeanId(e.target.value);
              if (e.target.value && beanMap[e.target.value]?.beanType) {
                setBeanType(beanMap[e.target.value].beanType);
              }
            }}
            className="sketch-input w-full"
          >
            <option value="">不关联豆子</option>
            {beans.map(b => (
              <option key={b.id} value={b.id}>
                {b.brand} - {b.name || b.roastLevel}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Time picker */}
      <div className="mt-4">
        <label className="text-sm text-coffee-500 mb-1 block font-sketch">饮用时间</label>
        <input
          type="datetime-local"
          value={drankAt}
          onChange={e => setDrankAt(e.target.value)}
          className="sketch-input w-full"
        />
      </div>

      {/* Notes */}
      <div className="mt-4">
        <label className="text-sm text-coffee-500 mb-1 block font-sketch">备注</label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="风味、感受…"
          className="sketch-input w-full"
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saved || (mode === 'brand' && !drink)}
        className={`w-full mt-6 py-4 rounded-sketch text-lg font-sketch font-bold transition-all ${
          saved
            ? 'bg-green-500 text-white'
            : mode === 'brand' && !drink
            ? 'bg-coffee-100 text-coffee-300'
            : 'bg-coffee-600 text-white active:scale-95'
        }`}
      >
        {saved ? '✓ 已记录' : '记录这一杯'}
      </button>
    </div>
  );
}

import db from './database';

// ─── Brew Methods ────────────────────────────────────
export async function getMethods() {
  return db.brewMethods.toArray();
}

export async function getMethodByKey(key) {
  return db.brewMethods.where('key').equals(key).first();
}

// ─── Coffee Beans ────────────────────────────────────
export async function getBeans() {
  return db.coffeeBeans.orderBy('id').reverse().toArray();
}

export async function addBean(bean) {
  return db.coffeeBeans.add({ ...bean, createdAt: new Date().toISOString() });
}

export async function updateBean(id, updates) {
  return db.coffeeBeans.update(id, updates);
}

export async function deleteBean(id) {
  return db.coffeeBeans.delete(id);
}

// ─── Intake Records ──────────────────────────────────
export async function getRecords() {
  return db.intakeRecords.orderBy('drankAt').reverse().toArray();
}

export async function getRecordsByDate(dateStr) {
  // dateStr like '2026-05-20'
  const start = `${dateStr}T00:00:00`;
  const end = `${dateStr}T23:59:59`;
  return db.intakeRecords
    .where('drankAt')
    .between(start, end, true, true)
    .toArray();
}

export async function getRecordsInRange(startDate, endDate) {
  return db.intakeRecords
    .where('drankAt')
    .between(startDate, endDate, true, true)
    .toArray();
}

export async function addRecord(record) {
  const now = new Date().toISOString();
  return db.intakeRecords.add({ ...record, createdAt: now });
}

export async function deleteRecord(id) {
  return db.intakeRecords.delete(id);
}

// ─── Timer Presets ───────────────────────────────────
export async function getTimerPresets() {
  return db.timerPresets.toArray();
}

export async function addTimerPreset(preset) {
  return db.timerPresets.add(preset);
}

export async function deleteTimerPreset(id) {
  return db.timerPresets.delete(id);
}

// ─── Brew Sessions (timer history) ───────────────────
export async function getBrewSessions() {
  return db.brewSessions.orderBy('startedAt').reverse().toArray();
}

export async function addBrewSession(session) {
  return db.brewSessions.add(session);
}

// ─── Stats helpers ───────────────────────────────────
export async function getDailyCaffeine(dateStr) {
  const records = await getRecordsByDate(dateStr);
  return records.reduce((sum, r) => sum + (r.caffeine_mg || 0), 0);
}

export async function getWeeklyStats(startDate, endDate) {
  const records = await getRecordsInRange(startDate, endDate);
  const dayMap = {};
  records.forEach(r => {
    const day = r.drankAt?.split('T')[0];
    if (day) {
      dayMap[day] = (dayMap[day] || 0) + (r.caffeine_mg || 0);
    }
  });
  return dayMap;
}

export async function getMonthlyRecords(year, month) {
  const m = String(month).padStart(2, '0');
  const start = `${year}-${m}-01T00:00:00`;
  const end = `${year}-${m}-31T23:59:59`;
  return getRecordsInRange(start, end);
}

export async function getYearlyRecords(year) {
  const start = `${year}-01-01T00:00:00`;
  const end = `${year}-12-31T23:59:59`;
  return getRecordsInRange(start, end);
}

// ─── Bean types & caffeine constants ──────────────
// Formula: 粉量g × 豆种咖啡因% ÷ 2 (half extracted) × 1000 → mg
// Ref: 阿拉比卡平均 1.3%, 罗布斯塔 2-4%, 拼配取中间 ~1.5%
export const BEAN_TYPES = {
  '阿拉比卡': 1.3,
  '罗布斯塔': 3.0,
  '拼配': 1.5,
};

// Method extraction modifier — fine grind / pressure → slightly more extracted
const METHOD_MOD = {
  '手冲': 1.0,
  '摩卡壶': 1.1,
  '冷萃': 0.7,
  '法压壶': 1.0,
  '意式': 1.15,
  '其他': 1.0,
};

/**
 * @param {number} grams 咖啡粉克重
 * @param {string} method 冲煮方法
 * @param {string} beanType 豆种 key (阿拉比卡/罗布斯塔/拼配)
 */
export function calculateCaffeine(grams, method, beanType = '阿拉比卡') {
  const pct = BEAN_TYPES[beanType] ?? 1.3;
  const mod = METHOD_MOD[method] ?? 1.0;
  // grams × pct% ÷ 2 (half extracted) × 1000 → mg
  const base = grams * (pct / 100) * 0.5 * 1000;
  return Math.round(base * mod);
}

// Brand caffeine estimates (per serving, medium size).
// 同品牌浓缩类饮品 (美式/拿铁/卡布/澳白/摩卡) 都用一份浓缩,咖啡因一致。
export const BRAND_CAFFEINE = {
  '星巴克': { '美式': 150, '拿铁': 150, '卡布奇诺': 150, '馥芮白': 150, '摩卡': 150, '冷萃': 205 },
  '瑞幸': { '美式': 120, '拿铁': 120, '卡布奇诺': 120, '澳白': 120, '摩卡': 120, '生椰拿铁': 110 },
  'Costa': { '美式': 140, '拿铁': 140, '卡布奇诺': 140, '摩卡': 140 },
  'Tim Hortons': { '美式': 130, '拿铁': 130, '卡布奇诺': 130 },
  'Manner': { '美式': 120, '拿铁': 120, '卡布奇诺': 120, '澳白': 120, '摩卡': 120, '冷萃': 190 },
};

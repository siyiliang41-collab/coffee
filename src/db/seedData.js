import db from './database';

export const DEFAULT_METHODS = [
  {
    key: 'pour_over_3stage',
    name: '三段式注水',
    category: '手冲',
    coffee_g: 15,
    water_ratio: 15,
    water_temp: { light: 93, medium: 89, dark: 85 },
    grind_size: '中细（白砂糖粗细）',
    description: '经典三段式注水法，通过分阶段注水充分萃取咖啡风味。',
    stages: [
      { name: '闷蒸', action: '中心注水浸湿全部咖啡粉', water_ml: 30, duration: 30, total: 30 },
      { name: '主注水', action: '硬币大小画圈注水', water_ml: 120, duration: 40, total: 70 },
      { name: '收尾注水', action: '中心定点注水', water_ml: 75, duration: 30, total: 100 },
      { name: '滴滤等待', action: '静置等水完全滴完', water_ml: 0, duration: 40, total: 140 },
    ],
    total_duration: 140,
    ideal_range: [130, 150],
    grind_tips: '< 2:10 研磨太粗 → 偏酸； > 2:30 研磨太细 → 偏苦',
    is_builtin: true,
  },
  {
    key: 'pour_over_1pour',
    name: '一刀流',
    category: '手冲',
    coffee_g: 15,
    water_ratio: 15,
    water_temp: { light: 93, medium: 89, dark: 85 },
    grind_size: '中细（白砂糖粗细）',
    description: '一刀流一次性注水完成，口感干净清澈，适合中浅烘豆子。',
    stages: [
      { name: '闷蒸', action: '中心注水浸湿全部咖啡粉', water_ml: 30, duration: 35, total: 35 },
      { name: '一次性注水', action: '持续画圈一次性注完剩余水量', water_ml: 195, duration: 55, total: 90 },
      { name: '滴滤等待', action: '静置等水完全滴完', water_ml: 0, duration: 45, total: 135 },
    ],
    total_duration: 135,
    ideal_range: [120, 150],
    grind_tips: '< 2:00 研磨太粗 → 偏淡； > 2:30 研磨太细 → 偏苦',
    is_builtin: true,
  },
  {
    key: 'moka_pot',
    name: '摩卡壶',
    category: '摩卡壶',
    coffee_g: 20,
    water_ratio: 10,
    water_temp: null,
    grind_size: '细（比意式稍粗）',
    description: '下壶装水至安全阀下沿，中火加热，出液转小火，液到壶嘴底部离火。',
    stages: [
      { name: '加热等待', action: '中火加热等待出液', water_ml: 0, duration: 0, total: 0 },
      { name: '开始出液', action: '转小火，观察出液速度', water_ml: 0, duration: 0, total: 0 },
      { name: '液到壶嘴', action: '液体到达壶嘴底部，立即离火', water_ml: 0, duration: 0, total: 0 },
    ],
    total_duration: null,
    ideal_range: null,
    grind_tips: null,
    is_builtin: true,
  },
  {
    key: 'cold_brew',
    name: '冷萃',
    category: '冷萃',
    coffee_g: 50,
    water_ratio: 10,
    water_temp: '常温水 / 冷藏',
    grind_size: '粗（法压壶粗细，海盐颗粒大小）',
    description: '常温水混合咖啡粉，冷藏浸泡12-16小时后过滤饮用。',
    stages: [
      { name: '混合', action: '将咖啡粉与常温水混合均匀', water_ml: 500, duration: 0, total: 0 },
      { name: '冷藏浸泡', action: '放入冰箱冷藏浸泡12-16小时', water_ml: 0, duration: 43200, total: 43200 },
      { name: '过滤', action: '用滤纸或滤布过滤咖啡液', water_ml: 0, duration: 0, total: 43200 },
    ],
    total_duration: 43200,
    ideal_range: [43200, 57600],
    grind_tips: '浸泡超过16小时可能产生苦味',
    is_builtin: true,
  },
];

/** Idempotent seed — dedup + ensure all 4 defaults exist exactly once. */
export async function seedMethods() {
  const all = await db.brewMethods.toArray();

  // 1. Find and delete duplicates (keep lowest id per key)
  const byKey = new Map(); // key -> { id, ... }
  const dupIds = [];
  for (const m of all) {
    if (!m.key) continue;
    if (byKey.has(m.key)) {
      // Keep the one with lower id
      const existing = byKey.get(m.key);
      if (m.id < existing.id) {
        dupIds.push(existing.id);
        byKey.set(m.key, m);
      } else {
        dupIds.push(m.id);
      }
    } else {
      byKey.set(m.key, m);
    }
  }
  if (dupIds.length > 0) {
    await db.brewMethods.bulkDelete(dupIds);
  }

  // 2. Insert any missing built-in methods
  const existingKeys = new Set(byKey.keys());
  const toAdd = DEFAULT_METHODS.filter(m => !existingKeys.has(m.key));
  if (toAdd.length > 0) {
    await db.brewMethods.bulkAdd(toAdd);
  }

  const fresh = await db.brewMethods.toArray();
  return fresh.length > 0 ? fresh : DEFAULT_METHODS;
}

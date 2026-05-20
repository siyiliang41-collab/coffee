import Dexie from 'dexie';

const db = new Dexie('CoffeeTracker');

db.version(1).stores({
  brewMethods: '++id, category',
  coffeeBeans: '++id, brand, roastLevel, openedDate',
  intakeRecords: '++id, beanId, source, drankAt',
  timerPresets: '++id, brewMethodId',
  brewSessions: '++id, presetId, startedAt',
});

// v2: add key index on brewMethods, clean up duplicates from StrictMode race
db.version(2).stores({
  brewMethods: '++id, category, key',
  coffeeBeans: '++id, brand, roastLevel, openedDate',
  intakeRecords: '++id, beanId, source, drankAt',
  timerPresets: '++id, brewMethodId',
  brewSessions: '++id, presetId, startedAt',
}).upgrade(async tx => {
  const all = await tx.table('brewMethods').toArray();
  const seen = new Map(); // key -> lowest id entry
  const dupIds = [];
  for (const m of all) {
    if (!m.key) continue;
    if (seen.has(m.key)) {
      dupIds.push(m.id);
    } else {
      seen.set(m.key, m.id);
    }
  }
  if (dupIds.length > 0) {
    await tx.table('brewMethods').bulkDelete(dupIds);
  }
});

// v3: add beanType on coffeeBeans, beanType on intakeRecords
db.version(3).stores({
  brewMethods: '++id, category, key',
  coffeeBeans: '++id, brand, roastLevel, openedDate, beanType',
  intakeRecords: '++id, beanId, source, drankAt, beanType',
  timerPresets: '++id, brewMethodId',
  brewSessions: '++id, presetId, startedAt',
});

export default db;

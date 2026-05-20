import { useState, useEffect } from 'react';
import { Plus, X, Calendar, Trash2 } from 'lucide-react';
import { getBeans, addBean, updateBean, deleteBean, BEAN_TYPES } from '../db/api';
import useLongPress from '../utils/useLongPress';

const ROAST_LEVELS = ['浅烘', '中烘', '深烘'];
const BEAN_TYPE_KEYS = Object.keys(BEAN_TYPES);
const ROAST_COLORS = {
  '浅烘': '#D4A574',
  '中烘': '#8B5E3C',
  '深烘': '#492418',
};

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function BeanCard({ bean, onEdit, onDelete }) {
  const { handlers, wrapClick } = useLongPress(onDelete);
  const days = daysSince(bean.openedDate?.split('T')[0]);
  const isStale = days !== null && days > 30;

  return (
    <div
      {...handlers}
      onClick={wrapClick(onEdit)}
      className={`sketch-card ${isStale ? 'border-coffee-300 opacity-80' : ''} cursor-pointer select-none`}
      style={{ userSelect: 'none' }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: ROAST_COLORS[bean.roastLevel] || '#8B5E3C' }}
            />
            <span className="font-medium text-coffee-700 truncate">
              {bean.brand}
            </span>
            {bean.name && (
              <span className="text-coffee-400 truncate">· {bean.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-coffee-400 flex-wrap">
            <span className="bg-coffee-100 px-1.5 py-0.5 rounded">{bean.roastLevel}</span>
            {bean.beanType && (
              <span className="text-coffee-400">{bean.beanType}</span>
            )}
            {bean.openedDate && (
              <span className="flex items-center gap-0.5">
                <Calendar size={10} />
                开封 {days} 天
              </span>
            )}
            {bean.pricePerGram && (
              <span>¥{Number(bean.pricePerGram).toFixed(2)}/g</span>
            )}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="text-coffee-300 hover:text-red-400 transition-colors p-1"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {isStale && (
        <div className="mt-2 text-xs text-coffee-300 italic">
          已超过最佳赏味期 ({days}天)
        </div>
      )}
    </div>
  );
}

const emptyForm = () => ({
  brand: '',
  name: '',
  roastLevel: '中烘',
  beanType: '阿拉比卡',
  openedDate: todayStr(),
  pricePerGram: '',
});

export default function Beans() {
  const [beans, setBeans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [filter, setFilter] = useState('全部');

  useEffect(() => {
    loadBeans();
  }, []);

  function loadBeans() {
    getBeans().then(b => setBeans(b.sort((a, b) => b.id - a.id))).catch(() => {});
  }

  function openAdd() {
    setEditId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(bean) {
    setEditId(bean.id);
    setForm({
      brand: bean.brand || '',
      name: bean.name || '',
      roastLevel: bean.roastLevel || '中烘',
      beanType: bean.beanType || '阿拉比卡',
      openedDate: bean.openedDate?.split('T')[0] || todayStr(),
      pricePerGram: bean.pricePerGram || '',
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.brand.trim()) return;
    const data = {
      brand: form.brand.trim(),
      name: form.name.trim(),
      roastLevel: form.roastLevel,
      beanType: form.beanType || '阿拉比卡',
      openedDate: new Date(form.openedDate).toISOString(),
      pricePerGram: form.pricePerGram ? Number(form.pricePerGram) : null,
    };
    if (editId) {
      await updateBean(editId, data);
    } else {
      await addBean(data);
    }
    setShowForm(false);
    loadBeans();
  }

  async function handleDelete(id) {
    if (!window.confirm('确定删除这包豆子吗？')) return;
    await deleteBean(id);
    loadBeans();
  }

  const filtered = filter === '全部'
    ? beans
    : beans.filter(b => b.roastLevel === filter);

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-sketch text-coffee-700">🫘 豆库</h1>
        <button
          onClick={openAdd}
          className="sketch-btn-primary flex items-center gap-1.5 py-2 px-4"
        >
          <Plus size={16} />
          <span className="font-sketch text-sm">新豆子</span>
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {['全部', ...ROAST_LEVELS].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`sketch-btn px-3 py-1.5 text-xs whitespace-nowrap border-2 transition-all ${
              filter === f
                ? 'border-coffee-600 bg-coffee-600 text-white'
                : 'border-coffee-200 bg-white text-coffee-600'
            }`}
          >
            {f}
            {f !== '全部' && (
              <span className="ml-1">
                ({beans.filter(b => b.roastLevel === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-coffee-300 mb-2">点击编辑 · 长按或右侧按钮删除</p>

      {/* Bean cards */}
      {filtered.length === 0 ? (
        <div className="sketch-card text-center py-12 text-coffee-300">
          <p className="font-sketch text-lg mb-1">豆库空空</p>
          <p className="text-sm">添加你的第一包咖啡豆吧 ☕</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(bean => (
            <BeanCard
              key={bean.id}
              bean={bean}
              onEdit={() => openEdit(bean)}
              onDelete={() => handleDelete(bean.id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-sketch w-full max-w-md p-5 shadow-xl max-h-[85vh] overflow-y-auto safe-area-pb">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-sketch text-coffee-700 text-lg">
                {editId ? '编辑豆子' : '新豆子'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-coffee-300 hover:text-coffee-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Brand */}
            <label className="text-sm text-coffee-500 mb-1 block font-sketch">品牌 *</label>
            <input
              type="text"
              value={form.brand}
              onChange={e => setForm({ ...form, brand: e.target.value })}
              placeholder="如：三顿半、Manner、星巴克"
              className="sketch-input w-full mb-3"
              autoFocus
            />

            {/* Name */}
            <label className="text-sm text-coffee-500 mb-1 block font-sketch">名称/产地</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="如：埃塞俄比亚 耶加雪菲"
              className="sketch-input w-full mb-3"
            />

            {/* Roast level */}
            <label className="text-sm text-coffee-500 mb-1 block font-sketch">烘焙度</label>
            <div className="flex gap-2 mb-3">
              {ROAST_LEVELS.map(r => (
                <button
                  key={r}
                  onClick={() => setForm({ ...form, roastLevel: r })}
                  className={`flex-1 sketch-btn py-2 text-sm border-2 transition-all ${
                    form.roastLevel === r
                      ? 'border-coffee-600 bg-coffee-600 text-white'
                      : 'border-coffee-200 bg-white text-coffee-600'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Bean type */}
            <label className="text-sm text-coffee-500 mb-1 block font-sketch">豆种</label>
            <div className="flex gap-2 mb-3">
              {BEAN_TYPE_KEYS.map(t => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, beanType: t })}
                  className={`flex-1 sketch-btn py-2 text-sm border-2 transition-all ${
                    form.beanType === t
                      ? 'border-coffee-600 bg-coffee-600 text-white'
                      : 'border-coffee-200 bg-white text-coffee-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Open date */}
            <label className="text-sm text-coffee-500 mb-1 block font-sketch">开封日期</label>
            <input
              type="date"
              value={form.openedDate}
              onChange={e => setForm({ ...form, openedDate: e.target.value })}
              className="sketch-input w-full mb-3"
            />

            {/* Price */}
            <label className="text-sm text-coffee-500 mb-1 block font-sketch">单价 (元/g)</label>
            <input
              type="number"
              value={form.pricePerGram}
              onChange={e => setForm({ ...form, pricePerGram: e.target.value })}
              placeholder="如：0.15"
              step="0.01"
              min="0"
              className="sketch-input w-full mb-5"
            />

            <button
              onClick={handleSave}
              disabled={!form.brand.trim()}
              className={`w-full py-3 rounded-sketch font-sketch font-bold transition-all ${
                form.brand.trim()
                  ? 'bg-coffee-600 text-white active:scale-95'
                  : 'bg-coffee-100 text-coffee-300'
              }`}
            >
              {editId ? '保存修改' : '添加豆子'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { NavLink, useLocation } from 'react-router-dom';
import { Home, Pen, Timer, BarChart3, Coffee, Beaker } from 'lucide-react';

const tabs = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/record', icon: Pen, label: '记录' },
  { to: '/timer', icon: Timer, label: '计时' },
  { to: '/data', icon: BarChart3, label: '数据' },
  { to: '/beans', icon: Coffee, label: '豆库' },
  { to: '/methods', icon: Beaker, label: '方法' },
];

export default function TabBar() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-t-2 border-dashed border-coffee-300 safe-area-pb">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-1">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-0.5 px-0 py-1 rounded-sketch-sm transition-all duration-200 ${
                active
                  ? 'text-coffee-600 scale-105'
                  : 'text-coffee-300 hover:text-coffee-500'
              }`}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <span
                className={`text-[11px] leading-none ${
                  active ? 'font-semibold font-sketch' : 'font-medium'
                }`}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

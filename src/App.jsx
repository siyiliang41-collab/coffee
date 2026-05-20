import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import TabBar from './components/TabBar';
import Home from './pages/Home';
import Record from './pages/Record';
import Timer from './pages/Timer';
import Stats from './pages/Stats';
import Beans from './pages/Beans';
import Methods from './pages/Methods';
import { seedMethods } from './db/seedData';

export default function App() {
  useEffect(() => {
    seedMethods();
  }, []);

  return (
    <HashRouter>
      <div className="min-h-screen pb-20 stain-bg">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/record" element={<Record />} />
          <Route path="/timer" element={<Timer />} />
          <Route path="/data" element={<Stats />} />
          <Route path="/beans" element={<Beans />} />
          <Route path="/methods" element={<Methods />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <TabBar />
      </div>
    </HashRouter>
  );
}

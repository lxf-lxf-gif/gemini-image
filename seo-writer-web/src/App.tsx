import { Routes, Route, Navigate } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { HistoryProvider } from './context/HistoryContext';
import { ToastProvider } from './context/ToastContext';
import { MemoryProvider } from './context/MemoryContext';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Writer from './pages/Writer';
import History from './pages/History';
import Settings from './pages/Settings';
import Gallery from './pages/Gallery';
import './App.css';

function App() {
  return (
    <SettingsProvider>
      <MemoryProvider>
        <HistoryProvider>
          <ToastProvider>
            <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="writer" element={<Writer />} />
              <Route path="history" element={<History />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          </ToastProvider>
        </HistoryProvider>
      </MemoryProvider>
    </SettingsProvider>
  );
}

export default App;

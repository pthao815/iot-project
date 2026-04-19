import { useState } from 'react';
import { Sidebar, type Tab } from './components/layout/Sidebar';
import { Header }            from './components/layout/Header';
import { Dashboard }         from './pages/Dashboard';
import { SensorDataPage }    from './pages/SensorData';
import { DeviceHistoryPage } from './pages/DeviceHistory';
import { Profile }           from './pages/Profile';


const PAGE_TITLES: Record<Tab, string> = {
  dashboard:  'Dashboard',
  datasensor: 'Dữ liệu cảm biến',
  history:    'Lịch sử thiết bị',
  profile:    'Trang cá nhân',
};

export default function App() {
  const [activeTab,   setActiveTab]   = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':  return <Dashboard />;
      case 'datasensor': return <SensorDataPage />;
      case 'history':    return <DeviceHistoryPage />;
      case 'profile':    return <Profile />;
    }
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-pink-50 via-white to-rose-50 font-sans text-slate-800 flex overflow-hidden selection:bg-pink-400 selection:text-white">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      <main className="flex-1 relative flex flex-col h-full overflow-hidden">
        <div className="p-4 md:p-8 flex-1 flex flex-col max-w-[1600px] mx-auto w-full h-full overflow-hidden">
          <Header
            title={PAGE_TITLES[activeTab]}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
}

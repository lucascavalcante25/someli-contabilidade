import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import MobileSidebar from './MobileSidebar';
import Toolbar from './Toolbar';
import NotificationsLoginModal from '@/components/NotificationsLoginModal';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { motion } from 'framer-motion';

export default function AppLayout() {
  const { isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const contentMargin = isMobile ? 0 : collapsed ? 72 : 240;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      </div>

      {/* Mobile Sidebar - Sheet drawer */}
      <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

      {/* Main content - responsive margin */}
      <motion.div
        animate={{ marginLeft: contentMargin }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col min-h-screen w-full max-w-full min-w-0 overflow-x-hidden"
      >
        <Toolbar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Outlet />
        </main>
      </motion.div>
      <NotificationsLoginModal />
    </div>
  );
}

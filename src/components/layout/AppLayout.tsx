import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
import { motion } from 'framer-motion';

export default function AppLayout() {
  const { isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <motion.div
        animate={{ marginLeft: collapsed ? 72 : 240 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col min-h-screen"
      >
        <Toolbar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </motion.div>
    </div>
  );
}

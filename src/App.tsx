import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ValoresVisibilidadeProvider } from "@/contexts/ValoresVisibilidadeContext";
import AppLayout from "@/components/layout/AppLayout";
import PermissionRoute from "@/components/PermissionRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import ClienteDetalhe from "./pages/ClienteDetalhe";
import Financeiro from "./pages/Financeiro";
import Despesas from "./pages/Despesas";
import ObrigacoesTipos from "./pages/ObrigacoesTipos";
import Usuarios from "./pages/Usuarios";
import Configuracoes from "./pages/Configuracoes";
import Consultas from "./pages/Consultas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={250}>
      <Sonner />
      <AuthProvider>
        <ValoresVisibilidadeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<PermissionRoute module="DASHBOARD"><Dashboard /></PermissionRoute>} />
              <Route path="/consultas" element={<PermissionRoute module="CONSULTAS"><Consultas /></PermissionRoute>} />
              <Route path="/clientes" element={<PermissionRoute module="CLIENTES"><Clientes /></PermissionRoute>} />
              <Route path="/clientes/:id" element={<PermissionRoute module="CLIENTES"><ClienteDetalhe /></PermissionRoute>} />
              <Route path="/financeiro" element={<PermissionRoute module="FINANCEIRO"><Financeiro /></PermissionRoute>} />
              <Route path="/despesas" element={<PermissionRoute module="DESPESAS"><Despesas /></PermissionRoute>} />
              <Route path="/obrigacoes-tipos" element={<PermissionRoute module="OBRIGACOES_TIPOS"><ObrigacoesTipos /></PermissionRoute>} />
              <Route path="/usuarios" element={<PermissionRoute module="USUARIOS"><Usuarios /></PermissionRoute>} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </ValoresVisibilidadeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

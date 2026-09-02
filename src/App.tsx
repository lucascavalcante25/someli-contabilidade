import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ValoresVisibilidadeProvider } from "@/contexts/ValoresVisibilidadeContext";
import AppLayout from "@/components/layout/AppLayout";
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
    <TooltipProvider>
      <Sonner />
      <AuthProvider>
        <ValoresVisibilidadeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/consultas" element={<Consultas />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/clientes/:id" element={<ClienteDetalhe />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/despesas" element={<Despesas />} />
              <Route path="/obrigacoes-tipos" element={<ObrigacoesTipos />} />
              <Route path="/usuarios" element={<Usuarios />} />
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

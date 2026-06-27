import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "./contexts/AuthContext";
import { MobileShell } from "./components/layout/MobileShell";

import { SplashScreen } from "./features/splash/SplashScreen";
import { LoginScreen } from "./features/auth/LoginScreen";
import { RegisterScreen } from "./features/auth/RegisterScreen";
import { HomeScreen } from "./features/home/HomeScreen";
import { FaceScreen } from "./features/punch/FaceScreen";
import { EnrollFaceScreen } from "./features/punch/EnrollFaceScreen";
import { HistoryScreen } from "./features/history/HistoryScreen";
import { ProfileScreen } from "./features/profile/ProfileScreen";
import { SettingsScreen } from "./features/settings/SettingsScreen";

import { AdminLayout } from "./features/admin/AdminLayout";
import { DashboardView } from "./features/admin/DashboardView";
import { EmployeesView } from "./features/admin/EmployeesView";
import { CompanyConfigView } from "./features/admin/CompanyConfigView";
import { NotificationsView } from "./features/admin/NotificationsView";
import { PlaceholderView } from "./features/admin/PlaceholderView";

function RequireAuth({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !user?.isAdmin) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function App() {
  const location = useLocation();
  const section = location.pathname.split("/")[1] || "root";

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={section}>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/cadastro" element={<RegisterScreen />} />

        {/* Fluxos fullscreen do funcionário */}
        <Route path="/app/bater-ponto" element={<RequireAuth><FaceScreen /></RequireAuth>} />
        <Route path="/app/cadastro-facial" element={<RequireAuth><EnrollFaceScreen /></RequireAuth>} />

        {/* App do funcionário */}
        <Route path="/app" element={<RequireAuth><MobileShell /></RequireAuth>}>
          <Route index element={<HomeScreen />} />
          <Route path="historico" element={<HistoryScreen />} />
          <Route path="perfil" element={<ProfileScreen />} />
          <Route path="configuracoes" element={<SettingsScreen />} />
        </Route>

        {/* Painel do gestor */}
        <Route path="/admin" element={<RequireAuth adminOnly><AdminLayout /></RequireAuth>}>
          <Route index element={<DashboardView />} />
          <Route path="funcionarios" element={<EmployeesView />} />
          <Route path="notificacoes" element={<NotificationsView />} />
          <Route path="configuracoes" element={<CompanyConfigView />} />
          <Route path="relatorios" element={<PlaceholderView title="Relatórios" />} />
          <Route path="registros" element={<PlaceholderView title="Registros" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

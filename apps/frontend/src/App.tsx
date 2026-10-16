import { Route, Routes, Navigate } from "react-router-dom";

import { Shell } from "./components/Shell";
import { LoginPage } from "./pages/LoginPage";
import { AttendancePage } from "./pages/AttendancePage";
import { DashboardPage } from "./pages/DashboardPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { RulesPage } from "./pages/RulesPage";
import { StudentsPage } from "./pages/StudentsPage";
import { WebcamPage } from "./pages/WebcamPage";
import { WeeklyReportPage } from "./pages/WeeklyReportPage";
import { MonthlyReportPage } from "./pages/MonthlyReportPage";
import { CamerasPage } from "./pages/CamerasPage";
import { AuditPage } from "./pages/AuditPage";
import { UsersPage } from "./pages/UsersPage";
import { ClassesPage } from "./pages/ClassesPage";
import { SetupPage } from "./pages/SetupPage";
import { ReviewQueuePage } from "./pages/ReviewQueuePage";
import { useAuth } from "./hooks/useAuth";

function App() {
  const { isAuthenticated, currentUser, login } = useAuth();

  if (isAuthenticated === null || (isAuthenticated && !currentUser)) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={login} />;
  }

  return (
    <Shell currentUser={currentUser!}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/webcam" element={<WebcamPage />} />
        <Route path="/reports/weekly" element={<WeeklyReportPage />} />
        <Route path="/reports/monthly" element={<MonthlyReportPage />} />
        <Route path="/cameras" element={currentUser!.role === "admin" ? <CamerasPage /> : <Navigate to="/" replace />} />
        <Route path="/audit" element={currentUser!.role === "admin" ? <AuditPage /> : <Navigate to="/" replace />} />
        <Route path="/rules" element={currentUser!.role === "admin" ? <RulesPage /> : <Navigate to="/" replace />} />
        <Route path="/notifications" element={currentUser!.role === "admin" ? <NotificationsPage /> : <Navigate to="/" replace />} />
        <Route path="/setup" element={currentUser!.role === "admin" ? <SetupPage /> : <Navigate to="/" replace />} />
        <Route path="/users" element={currentUser!.role === "admin" ? <UsersPage currentUserId={currentUser!.id} /> : <Navigate to="/" replace />} />
        <Route path="/classes" element={currentUser!.role === "admin" ? <ClassesPage /> : <Navigate to="/" replace />} />
        <Route path="/review-queue" element={<ReviewQueuePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

export default App;

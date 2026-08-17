import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Auth Pages
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { DepartmentList } from './pages/admin/DepartmentList';
import { HodList } from './pages/admin/HodList';

// HOD Pages
import { HodDashboard } from './pages/hod/HodDashboard';
import { TeacherList } from './pages/hod/TeacherList';
import { StudentList } from './pages/hod/StudentList';

// Portals
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { AttendancePortal } from './pages/teacher/AttendancePortal';
import { AttendanceSession } from './pages/teacher/AttendanceSession';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentAttendance } from './pages/student/StudentAttendance';
import { FaceRegistration } from './pages/student/FaceRegistration';
import { FaceRecognitionTest } from './pages/developer/FaceRecognitionTest';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
          </Route>

          {/* Protected Global Routes (Any authenticated user) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AuthLayout />}>
              <Route path="/change-password" element={<ChangePasswordPage />} />
            </Route>
          </Route>

          {/* Primary Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['primary_admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/departments" element={<DepartmentList />} />
              <Route path="/admin/hods" element={<HodList />} />
              <Route path="/admin/test-face" element={<FaceRecognitionTest />} />
            </Route>
          </Route>

          {/* HOD Routes */}
          <Route element={<ProtectedRoute allowedRoles={['hod']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/hod" element={<HodDashboard />} />
              <Route path="/hod/teachers" element={<TeacherList />} />
              <Route path="/hod/students" element={<StudentList />} />
            </Route>
          </Route>

          {/* Teacher Routes */}
          <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/attendance" element={<AttendancePortal />} />
              <Route path="/teacher/attendance/:sessionId" element={<AttendanceSession />} />
            </Route>
          </Route>

          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/attendance" element={<StudentAttendance />} />
              <Route path="/student/face-registration" element={<FaceRegistration />} />
            </Route>
          </Route>

          {/* Fallback routing */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;


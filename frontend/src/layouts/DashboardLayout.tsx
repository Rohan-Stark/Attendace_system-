import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ClipboardList, CalendarDays, ScanFace, BarChart3, LogOut, KeyRound } from 'lucide-react';
import { ThemeToggle } from '../components/ui/ThemeToggle';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getNavItems = (): NavItem[] => {
    if (!user) return [];
    switch (user.role) {
      case 'primary_admin':
        return [
          { name: 'Dashboard', href: '/admin', icon: <HomeIcon /> },
          { name: 'Departments', href: '/admin/departments', icon: <BuildingIcon /> },
          { name: 'HODs', href: '/admin/hods', icon: <UsersIcon /> },
          { name: 'Analytics', href: '/admin/analytics', icon: <BarChart3 className="w-5 h-5" /> },
        ];
      case 'hod':
        return [
          { name: 'Dashboard', href: '/hod', icon: <HomeIcon /> },
          { name: 'Teachers', href: '/hod/teachers', icon: <UsersIcon /> },
          { name: 'Students', href: '/hod/students', icon: <AcademicCapIcon /> },
          { name: 'Analytics', href: '/hod/analytics', icon: <BarChart3 className="w-5 h-5" /> },
        ];
      case 'teacher':
        return [
          { name: 'Dashboard', href: '/teacher', icon: <HomeIcon /> },
          { name: 'Attendance', href: '/teacher/attendance', icon: <ClipboardList className="w-5 h-5" /> },
          { name: 'Analytics', href: '/teacher/analytics', icon: <BarChart3 className="w-5 h-5" /> },
        ];
      case 'student':
        return [
          { name: 'Dashboard', href: '/student', icon: <HomeIcon /> },
          { name: 'My Attendance', href: '/student/attendance', icon: <CalendarDays className="w-5 h-5" /> },
          { name: 'Face ID', href: '/student/face-registration', icon: <ScanFace className="w-5 h-5" /> },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-200">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 dark:bg-slate-950 text-white flex flex-col shrink-0 dashboard-layout-sidebar border-r border-slate-800 dark:border-slate-800/50 transition-colors duration-200">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 dark:border-slate-800/50">
          <h1 className="text-xl font-bold tracking-tight">Smart<span className="text-blue-500">Attend</span></h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === (user?.role === 'hod' ? '/hod' : user?.role === 'teacher' ? '/teacher' : user?.role === 'student' ? '/student' : '/admin')}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-500 dark:text-blue-400'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 dark:text-slate-500 dark:hover:text-slate-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`flex-shrink-0 ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-slate-500 dark:text-slate-600'}`}>
                    {item.icon}
                  </div>
                  <span className="ml-3">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800 dark:border-slate-800/50">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center font-semibold text-sm">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
            <div className="ml-3 truncate">
              <p className="text-sm font-medium text-white truncate">{user?.email}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 dashboard-layout-main">
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 shadow-sm z-10 dashboard-layout-header transition-colors duration-200">
          <div className="flex items-center">
             {user?.department_id && (
               <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                 Dept ID: {user.department_id}
               </span>
             )}
          </div>
          <div className="flex items-center space-x-3">
             <ThemeToggle />
             <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
             <NavLink 
               to="/change-password" 
               className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
               title="Change Password"
             >
               <KeyRound className="w-5 h-5" />
             </NavLink>
             <button
               onClick={handleLogout}
               className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
               title="Logout"
             >
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8 text-slate-900 dark:text-slate-100 transition-colors duration-200">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

// Simple Icons
function HomeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function AcademicCapIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
    </svg>
  );
}

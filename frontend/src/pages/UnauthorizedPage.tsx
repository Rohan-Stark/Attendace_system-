import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function UnauthorizedPage() {
  const { user } = useAuth();
  
  let backLink = '/';
  if (user?.role === 'primary_admin') backLink = '/admin';
  else if (user?.role === 'hod') backLink = '/hod';
  else if (user?.role === 'teacher') backLink = '/teacher';
  else if (user?.role === 'student') backLink = '/student';

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Access Denied</h1>
      <p className="text-slate-600 max-w-md mb-8">
        You do not have permission to access this resource. Please contact your administrator if you believe this is an error.
      </p>
      <Link 
        to={backLink}
        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

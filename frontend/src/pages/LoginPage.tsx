import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ErrorMessage } from '../components/ui/ErrorMessage';

export function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await login(loginId, password);
      
      if (res.requires_password_change) {
        navigate('/change-password');
      } else {
        // Route based on role
        if (res.role === 'primary_admin') navigate('/admin');
        else if (res.role === 'hod') navigate('/hod');
        else if (res.role === 'teacher') navigate('/teacher');
        else if (res.role === 'student') navigate('/student');
        else navigate('/');
      }
    } catch (err: any) {
      setError(err.detail || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center transition-colors duration-200">Sign in to your account</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />
        
        <Input
          label="Login ID (Email or USN)"
          type="text"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          required
          autoComplete="username"
        />
        
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        
        <div className="flex items-center justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Sign in
        </Button>
      </form>
    </div>
  );
}

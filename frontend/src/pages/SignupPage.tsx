import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { firstTimeSignup } from '../services/auth.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ErrorMessage } from '../components/ui/ErrorMessage';

export function SignupPage() {
  const [loginId, setLoginId] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await firstTimeSignup({
        login_id: loginId,
        initial_password: initialPassword,
        new_password: newPassword
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.detail || 'Failed to sign up. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Account Registered</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Your account has been successfully registered with your new permanent password.
        </p>
        <Button onClick={() => navigate('/login')} className="w-full">
          Proceed to Login
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 transition-colors duration-200">First-Time Sign Up</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Register your provisioned account with a permanent password.
        </p>
      </div>
      
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
          label="Initial Temporary Password"
          type="password"
          value={initialPassword}
          onChange={(e) => setInitialPassword(e.target.value)}
          required
        />
        
        <Input
          label="New Permanent Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
        />

        <Input
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
        
        <Button type="submit" className="w-full mt-6" isLoading={isLoading}>
          Sign Up
        </Button>

        <div className="text-center mt-4 text-sm">
          <span className="text-slate-600 dark:text-slate-400">Already registered? </span>
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Log in here
          </Link>
        </div>
      </form>
    </div>
  );
}

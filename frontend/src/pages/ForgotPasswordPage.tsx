import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/auth.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ErrorMessage } from '../components/ui/ErrorMessage';

export function ForgotPasswordPage() {
  const [loginId, setLoginId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await forgotPassword(loginId);
      setSuccess(true);
    } catch (err: any) {
      setError(err.detail || 'Failed to process request.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 transition-colors duration-200">Request Received</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6 transition-colors duration-200">
          If the account exists, password reset instructions have been initiated.
        </p>
        <Link to="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-500 dark:hover:text-blue-300 transition-colors duration-200">
          Return to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center transition-colors duration-200">Reset your password</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6 text-center text-sm transition-colors duration-200">
        Enter your login ID and we'll process your request.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />
        
        <Input
          label="Login ID (Email or USN)"
          type="text"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          required
        />
        
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Reset Password
        </Button>
        
        <div className="text-center mt-4">
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Back to login
          </Link>
        </div>
      </form>
    </div>
  );
}

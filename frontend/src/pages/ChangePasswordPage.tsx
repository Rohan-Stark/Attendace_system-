import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { changePassword } from '../services/auth.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    
    setError('');
    setIsLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      await refreshUser();
      
      // Redirect based on role
      if (user?.role === 'primary_admin') navigate('/admin');
      else if (user?.role === 'hod') navigate('/hod');
      else if (user?.role === 'teacher') navigate('/teacher');
      else if (user?.role === 'student') navigate('/student');
      else navigate('/');
      
    } catch (err: any) {
      setError(err.detail || 'Failed to change password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={user?.must_change_password ? "" : "max-w-md mx-auto"}>
      {user?.must_change_password && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors duration-200">
          <h3 className="text-blue-800 dark:text-blue-300 font-medium">Password Change Required</h3>
          <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
            For security reasons, you must change your password before accessing the system.
          </p>
        </div>
      )}
      
      <Card>
        {!user?.must_change_password && (
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
        )}
        <CardContent className={user?.must_change_password ? "pt-6" : ""}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ErrorMessage message={error} />
            
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            
            <div className="pt-2">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import PasswordInput from '../../components/common/PasswordInput';
import AuthShell from './AuthShell';

const PASSWORD_POLICY_LABEL = 'Min 12 chars, with uppercase, lowercase, number, special character';
const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{12,}$/;

const apiError = (err, fallback) =>
  err?.response?.data?.error?.message || err?.response?.data?.message || fallback;

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!token) {
      toast.error('Invalid reset link');
      return;
    }
    try {
      await authAPI.resetPassword({ token, newPassword: data.newPassword });
      toast.success('Password reset. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(apiError(err, 'Reset failed'));
    }
  };

  if (!token) {
    return (
      <AuthShell title="Invalid link" subtitle="This password reset link is missing or expired.">
        <p className="text-center mt-6 text-sm text-white/80">
          <Link to="/forgot-password" className="text-white underline hover:text-white/90">
            Request a new reset link
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset password" subtitle="Choose a new password for your account.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/90 mb-1">New password</label>
          <PasswordInput
            className="login-input login-input--with-toggle"
            toggleClassName="text-white hover:text-white focus:ring-white/40"
            autoComplete="new-password"
            {...register('newPassword', {
              required: 'Password is required',
              pattern: { value: STRONG_PASSWORD_PATTERN, message: PASSWORD_POLICY_LABEL },
            })}
          />
          {errors.newPassword && (
            <p className="text-red-300 text-xs mt-1">{errors.newPassword.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-white/90 mb-1">Confirm password</label>
          <PasswordInput
            className="login-input login-input--with-toggle"
            toggleClassName="text-white hover:text-white focus:ring-white/40"
            autoComplete="new-password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (v) => v === watch('newPassword') || 'Passwords do not match',
            })}
          />
          {errors.confirmPassword && (
            <p className="text-red-300 text-xs mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>
        <button type="submit" disabled={isSubmitting} className="login-submit-btn">
          {isSubmitting ? 'Saving...' : 'Reset password'}
        </button>
      </form>
    </AuthShell>
  );
};

export default ResetPassword;

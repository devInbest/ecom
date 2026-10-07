import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import AuthShell from './AuthShell';

const apiError = (err, fallback) =>
  err?.response?.data?.error?.message || err?.response?.data?.message || fallback;

const ForgotPassword = () => {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      await authAPI.forgotPassword(data);
      setSent(true);
      toast.success('Check your email for reset instructions');
    } catch (err) {
      toast.error(apiError(err, 'Request failed'));
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we'll send a reset link if an account exists."
    >
      {sent ? (
        <div className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white" role="status">
          If an account exists for that email, a password reset link has been sent. Check your inbox.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">Email</label>
            <input
              type="email"
              className="login-input"
              placeholder="admin@nonsense.store"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && <p className="text-red-300 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="login-submit-btn">
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="text-center mt-6 text-sm text-white/80">
        <Link to="/login" className="text-white underline hover:text-white/90">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
};

export default ForgotPassword;

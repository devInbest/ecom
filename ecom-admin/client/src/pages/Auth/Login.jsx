import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../../features/auth/authSlice';
import toast from 'react-hot-toast';
import PasswordInput from '../../components/common/PasswordInput';
import AuthShell from './AuthShell';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
    return () => dispatch(clearError());
  }, [isAuthenticated, navigate, dispatch]);

  const onSubmit = async (data) => {
    const result = await dispatch(login(data));
    if (login.fulfilled.match(result)) {
      toast.success('Welcome back!');
      navigate('/');
    }
  };

  return (
    <AuthShell title="Sign In">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/90 mb-1">Email</label>
          <input
            type="email"
            className="login-input"
            placeholder="admin@nonsense.store"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-white/90">Password</label>
            <Link to="/forgot-password" className="text-xs text-white/80 hover:text-white underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            className="login-input login-input--with-toggle"
            toggleClassName="text-white hover:text-white focus:ring-white/40"
            placeholder="••••••••"
            autoComplete="current-password"
            {...register('password', { required: 'Password is required' })}
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="login-submit-btn">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </AuthShell>
  );
};

export default Login;

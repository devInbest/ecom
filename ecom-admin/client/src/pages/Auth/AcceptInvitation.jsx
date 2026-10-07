import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { acceptInvitation } from '../../features/auth/authSlice';
import PasswordInput from '../../components/common/PasswordInput';
import AuthShell from './AuthShell';

const PASSWORD_POLICY_LABEL = 'Min 12 chars, with uppercase, lowercase, number, special character';
const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{12,}$/;

const AcceptInvitation = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { firstName: '', lastName: '', name: '' },
  });

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!token) {
      toast.error('Invalid invitation link');
      return;
    }
    try {
      const result = await dispatch(acceptInvitation({
        token,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        name: data.name || undefined,
      }));
      if (acceptInvitation.fulfilled.match(result)) {
        toast.success('Account activated. Welcome!');
        navigate('/', { replace: true });
      } else if (acceptInvitation.rejected.match(result)) {
        toast.error(result.payload || 'Failed to accept invitation');
      }
    } catch {
      toast.error('Failed to accept invitation');
    }
  };

  if (!token) {
    return (
      <AuthShell title="Invalid invitation" subtitle="This invitation link is missing or has expired.">
        <p className="text-center mt-6 text-sm text-white/80">
          <Link to="/login" className="text-white underline hover:text-white/90">
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Accept invitation" subtitle="Set your password to activate your admin account.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">First name</label>
            <input
              className="login-input !py-3 !text-sm"
              {...register('firstName', { required: 'Required' })}
            />
            {errors.firstName && <p className="text-red-300 text-xs mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">Last name</label>
            <input
              className="login-input !py-3 !text-sm"
              {...register('lastName', { required: 'Required' })}
            />
            {errors.lastName && <p className="text-red-300 text-xs mt-1">{errors.lastName.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/90 mb-1">Password</label>
          <PasswordInput
            className="login-input login-input--with-toggle"
            toggleClassName="text-white hover:text-white focus:ring-white/40"
            autoComplete="new-password"
            {...register('password', {
              required: 'Password is required',
              pattern: { value: STRONG_PASSWORD_PATTERN, message: PASSWORD_POLICY_LABEL },
            })}
          />
          {errors.password && <p className="text-red-300 text-xs mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-white/90 mb-1">Confirm password</label>
          <PasswordInput
            className="login-input login-input--with-toggle"
            toggleClassName="text-white hover:text-white focus:ring-white/40"
            autoComplete="new-password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (v) => v === watch('password') || 'Passwords do not match',
            })}
          />
          {errors.confirmPassword && (
            <p className="text-red-300 text-xs mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>
        <button type="submit" disabled={isSubmitting} className="login-submit-btn">
          {isSubmitting ? 'Activating...' : 'Activate account'}
        </button>
      </form>
    </AuthShell>
  );
};

export default AcceptInvitation;

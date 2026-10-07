import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Requires auth (via parent PrivateRoute) and at least one of the given permissions.
 * SUPERADMIN / SUPER_ADMIN are treated as having all permissions server-side;
 * client checks the permissions array returned from /auth/me.
 */
const PermissionRoute = ({ anyOf = [] }) => {
  const { permissions, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!anyOf.length) return <Outlet />;
  const allowed = anyOf.some((p) => permissions.includes(p));
  return allowed ? <Outlet /> : <Navigate to="/" replace />;
};

export default PermissionRoute;

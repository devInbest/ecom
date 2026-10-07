import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout as logoutThunk, bootstrapAuth, fetchMe } from '../features/auth/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, permissions, isAuthenticated, isLoading, loading, error } = useSelector(
    (state) => state.auth
  );

  const hasPermission = useCallback(
    (permission) => {
      if (!permission) return true;
      if (permissions.includes(permission)) return true;
      const aliases = {
        'catalog.category.read': 'category:read',
        'catalog.category.create': 'category:create',
        'catalog.category.update': 'category:update',
        'catalog.category.delete': 'category:delete',
        'catalog.subcategory.read': 'subcategory:read',
        'catalog.subcategory.create': 'subcategory:create',
        'catalog.subcategory.update': 'subcategory:update',
        'catalog.subcategory.delete': 'subcategory:delete',
        'catalog.product.read': 'product:read',
        'catalog.product.create': 'product:create',
        'catalog.product.update': 'product:update',
        'catalog.product.delete': 'product:delete',
      };
      const resolved = aliases[permission];
      if (resolved && permissions.includes(resolved)) return true;
      const subcategoryFallback = {
        'subcategory:read': 'category:read',
        'subcategory:create': 'category:create',
        'subcategory:update': 'category:update',
        'subcategory:delete': 'category:delete',
        'catalog.subcategory.read': 'category:read',
        'catalog.subcategory.create': 'category:create',
        'catalog.subcategory.update': 'category:update',
        'catalog.subcategory.delete': 'category:delete',
      };
      const fallback = subcategoryFallback[permission];
      return fallback ? permissions.includes(fallback) : false;
    },
    [permissions]
  );

  const hasRole = useCallback(
    (role) => {
      if (!user?.role) return false;
      if (user.role === 'SUPERADMIN' && role === 'SUPER_ADMIN') return true;
      return user.role === role;
    },
    [user?.role]
  );

  const logout = useCallback(() => dispatch(logoutThunk()), [dispatch]);
  const refreshProfile = useCallback(() => dispatch(fetchMe()), [dispatch]);
  const bootstrap = useCallback(() => dispatch(bootstrapAuth()), [dispatch]);

  return useMemo(
    () => ({
      user,
      permissions,
      isAuthenticated,
      isLoading: isLoading || loading,
      error,
      hasPermission,
      hasRole,
      logout,
      refreshProfile,
      bootstrap,
    }),
    [
      user,
      permissions,
      isAuthenticated,
      isLoading,
      loading,
      error,
      hasPermission,
      hasRole,
      logout,
      refreshProfile,
      bootstrap,
    ]
  );
};

export default useAuth;

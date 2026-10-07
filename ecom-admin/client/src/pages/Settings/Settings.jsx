import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import ConfirmModal from '../../components/common/ConfirmModal';
import CustomSelect from '../../components/common/CustomSelect';
import PageBanner from '../../components/common/PageBanner';
import PasswordInput from '../../components/common/PasswordInput';
import ProfilePhotoModal from '../../components/common/ProfilePhotoModal';
import SessionsPanel from './SessionsPanel';
import Skeleton, { SkeletonText } from '../../components/common/Skeleton';
import { roleLabel } from '../../utils/helpers';

const EDIT_USER_STATUS_OPTIONS = [
  { value: true, label: 'Active' },
  { value: false, label: 'Inactive' },
];

const ROLE_OPTIONS = [
  { value: 'STAFF', label: 'Staff' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'PRODUCT_MANAGER', label: 'Product Manager' },
  { value: 'ORDER_MANAGER', label: 'Order Manager' },
  { value: 'CUSTOMER_SUPPORT', label: 'Customer Support' },
];

const ADMIN_ROLE_OPTIONS = [{ value: 'STAFF', label: 'Staff' }];

const PASSWORD_POLICY_LABEL = 'Min 12 chars, with uppercase, lowercase, number, special character';
const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{12,}$/;

const apiError = (err, fallback) =>
  err?.response?.data?.error?.message || err?.response?.data?.message || fallback;

const Settings = () => {
  const { user } = useSelector((state) => state.auth);
  const isSuperadmin = user?.role === 'SUPERADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const canManageUsers = isSuperadmin || isAdmin;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await authAPI.getUsers({ fresh: true });
      setUsers(res.users || []);
    } catch (err) {
      toast.error(apiError(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManageUsers) fetchUsers();
  }, [canManageUsers]);

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    watch: watchCreate,
    formState: { errors: createErrors, isSubmitting: createSubmitting },
  } = useForm({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', role: 'STAFF' },
  });

  const {
    register: registerInvite,
    handleSubmit: handleSubmitInvite,
    reset: resetInvite,
    formState: { errors: inviteErrors, isSubmitting: inviteSubmitting },
  } = useForm({
    defaultValues: { email: '', firstName: '', lastName: '', role: 'STAFF' },
  });

  const roleOptions = isSuperadmin ? ROLE_OPTIONS : ADMIN_ROLE_OPTIONS;

  const {
    register: registerPwd,
    handleSubmit: handleSubmitPwd,
    reset: resetPwd,
    watch: watchPwd,
    formState: { errors: pwdErrors, isSubmitting: pwdSubmitting },
  } = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    control: controlEdit,
    formState: { errors: editErrors, isSubmitting: editSubmitting },
  } = useForm({
    defaultValues: { name: '', email: '', isActive: true },
  });

  const {
    register: registerResetPwd,
    handleSubmit: handleSubmitResetPwd,
    reset: resetResetPwd,
    watch: watchResetPwd,
    formState: { errors: resetPwdErrors, isSubmitting: resetPwdSubmitting },
  } = useForm({
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onCreateUser = async (data) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await authAPI.createUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      });
      toast.success(`${roleLabel(data.role)} account created`);
      setShowCreateUser(false);
      resetCreate();
      fetchUsers();
    } catch (err) {
      toast.error(apiError(err, 'Failed to create user'));
    }
  };

  const onInviteUser = async (data) => {
    try {
      await authAPI.createInvitation(data);
      toast.success(`Invitation sent to ${data.email}`);
      setShowInviteUser(false);
      resetInvite();
      fetchUsers();
    } catch (err) {
      toast.error(apiError(err, 'Failed to send invitation'));
    }
  };

  const onChangePassword = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      await authAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password updated successfully');
      resetPwd();
      setShowPasswordModal(false);
    } catch (err) {
      toast.error(apiError(err, 'Failed to update password'));
    }
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    resetEdit({
      name: u.name || '',
      email: u.email || '',
      isActive: u.isActive !== false,
    });
  };

  const onUpdateUser = async (data) => {
    if (!editingUser) return;
    try {
      await authAPI.updateUser(editingUser._id, data);
      toast.success('User updated');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(apiError(err, 'Failed to update user'));
    }
  };

  const onDeleteUser = async () => {
    if (!confirmDelete) return;
    try {
      await authAPI.deleteUser(confirmDelete._id);
      toast.success('User deleted');
      setConfirmDelete(null);
      fetchUsers();
    } catch (err) {
      toast.error(apiError(err, 'Failed to delete user'));
    }
  };

  const onResetUserPassword = async (data) => {
    if (!resetPasswordUser) return;
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      await authAPI.resetUserPassword(resetPasswordUser._id, { newPassword: data.newPassword });
      toast.success(`Password reset for ${resetPasswordUser.name}`);
      setResetPasswordUser(null);
      resetResetPwd();
    } catch (err) {
      toast.error(apiError(err, 'Failed to reset password'));
    }
  };

  return (
    <div className="space-y-6">
      <PageBanner title="Settings" subtitle="Manage your profile, security, and team access." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Profile</h3>
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium text-gray-900">{user?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Role</p>
            <p className="font-medium text-gray-900">{roleLabel(user?.role)}</p>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowPhotoModal(true)}>
              Update photo
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowPasswordModal(true)}>
              Change password
            </button>
          </div>
        </div>

        {canManageUsers && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Team members</h3>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateUser(true)}>
                  Create user
                </button>
                <button type="button" className="btn-primary" onClick={() => setShowInviteUser(true)}>
                  Invite user
                </button>
              </div>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonText key={i} lines={2} />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {users.map((u) => (
                  <div key={u._id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-sm text-gray-500">{u.email} · {roleLabel(u.role)}</p>
                    </div>
                    {u.role !== 'SUPERADMIN' && (
                      <div className="flex gap-2">
                        {isSuperadmin && (
                          <button type="button" className="btn-secondary text-sm" onClick={() => setResetPasswordUser(u)}>
                            Reset pwd
                          </button>
                        )}
                        <button type="button" className="btn-secondary text-sm" onClick={() => openEditUser(u)}>
                          Edit
                        </button>
                        <button type="button" className="btn-danger text-sm" onClick={() => setConfirmDelete(u)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <SessionsPanel />

      {showPhotoModal && (
        <ProfilePhotoModal open={showPhotoModal} onClose={() => setShowPhotoModal(false)} />
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Change password</h2>
            <form onSubmit={handleSubmitPwd(onChangePassword)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
                <PasswordInput {...registerPwd('currentPassword', { required: 'Required' })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                <PasswordInput
                  {...registerPwd('newPassword', {
                    required: 'Required',
                    pattern: { value: STRONG_PASSWORD_PATTERN, message: PASSWORD_POLICY_LABEL },
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                <PasswordInput
                  {...registerPwd('confirmPassword', {
                    required: 'Required',
                    validate: (v) => v === watchPwd('newPassword') || 'Does not match',
                  })}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={pwdSubmitting}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Create user</h2>
            <p className="text-sm text-gray-500 mb-4">Create an account immediately with a password you set.</p>
            <form onSubmit={handleSubmitCreate(onCreateUser)} className="space-y-4">
              <div>
                <input
                  className="input-field"
                  placeholder="Full name"
                  {...registerCreate('name', { required: 'Name is required' })}
                />
                {createErrors.name && <p className="text-red-500 text-xs mt-1">{createErrors.name.message}</p>}
              </div>
              <div>
                <input
                  className="input-field"
                  type="email"
                  placeholder="Email"
                  {...registerCreate('email', { required: 'Email is required' })}
                />
                {createErrors.email && <p className="text-red-500 text-xs mt-1">{createErrors.email.message}</p>}
              </div>
              <div>
                <PasswordInput
                  placeholder="Password"
                  {...registerCreate('password', {
                    required: 'Password is required',
                    pattern: { value: STRONG_PASSWORD_PATTERN, message: PASSWORD_POLICY_LABEL },
                  })}
                />
                {createErrors.password && (
                  <p className="text-red-500 text-xs mt-1">{createErrors.password.message}</p>
                )}
              </div>
              <div>
                <PasswordInput
                  placeholder="Confirm password"
                  {...registerCreate('confirmPassword', {
                    required: 'Please confirm the password',
                    validate: (v) => v === watchCreate('password') || 'Passwords do not match',
                  })}
                />
                {createErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{createErrors.confirmPassword.message}</p>
                )}
              </div>
              <select className="input-field" {...registerCreate('role')}>
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateUser(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={createSubmitting}>Create user</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInviteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Invite team member</h2>
            <p className="text-sm text-gray-500 mb-4">An email invitation will be sent to set their password.</p>
            <form onSubmit={handleSubmitInvite(onInviteUser)} className="space-y-4">
              <input
                className="input-field"
                placeholder="Email"
                type="email"
                {...registerInvite('email', { required: 'Required' })}
              />
              {inviteErrors.email && <p className="text-red-500 text-xs">{inviteErrors.email.message}</p>}
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="input-field"
                  placeholder="First name"
                  {...registerInvite('firstName', { required: 'Required' })}
                />
                <input
                  className="input-field"
                  placeholder="Last name"
                  {...registerInvite('lastName', { required: 'Required' })}
                />
              </div>
              <select className="input-field" {...registerInvite('role')}>
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setShowInviteUser(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={inviteSubmitting}>Send invitation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Edit user</h2>
            <form onSubmit={handleSubmitEdit(onUpdateUser)} className="space-y-4">
              <input className="input-field" {...registerEdit('name', { required: 'Required' })} />
              <input className="input-field" type="email" {...registerEdit('email', { required: 'Required' })} />
              <Controller
                name="isActive"
                control={controlEdit}
                render={({ field }) => (
                  <CustomSelect
                    options={EDIT_USER_STATUS_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Status"
                  />
                )}
              />
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={editSubmitting}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Reset password for {resetPasswordUser.name}</h2>
            <form onSubmit={handleSubmitResetPwd(onResetUserPassword)} className="space-y-4">
              <PasswordInput
                {...registerResetPwd('newPassword', {
                  required: 'Required',
                  pattern: { value: STRONG_PASSWORD_PATTERN, message: PASSWORD_POLICY_LABEL },
                })}
              />
              <PasswordInput
                {...registerResetPwd('confirmPassword', {
                  required: 'Required',
                  validate: (v) => v === watchResetPwd('newPassword') || 'Does not match',
                })}
              />
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setResetPasswordUser(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={resetPwdSubmitting}>Reset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmDelete)}
        title="Delete user"
        message={`Delete ${confirmDelete?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={onDeleteUser}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default Settings;

import AccountShell from '@/components/account/AccountShell';

export const metadata = {
  title: 'Account | NONSENSE',
  description: 'Manage your NONSENSE profile, saved address, and orders.',
};

export default function AccountLayout({ children }) {
  return <AccountShell>{children}</AccountShell>;
}

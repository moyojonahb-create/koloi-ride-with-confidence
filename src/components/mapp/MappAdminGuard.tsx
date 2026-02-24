import { ReactNode } from 'react';
import AdminGuard from '@/components/admin/AdminGuard';

interface Props {
  children: ReactNode;
}

export default function MappAdminGuard({ children }: Props) {
  return <AdminGuard>{children}</AdminGuard>;
}

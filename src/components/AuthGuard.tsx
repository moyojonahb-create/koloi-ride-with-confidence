import { ReactNode, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  children: ReactNode;
}

export default function AuthGuard({ children }: Props) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const checkedOnce = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
    if (!loading) checkedOnce.current = true;
  }, [user, loading, navigate]);

  // After first auth check, never show spinner again — render instantly
  if (loading && !checkedOnce.current) return null;

  if (!user) return null;

  return <>{children}</>;
}

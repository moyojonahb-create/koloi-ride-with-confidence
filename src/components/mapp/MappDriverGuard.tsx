import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriverStatus } from '@/hooks/useDriverStatus';
import { Loader2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

export default function MappDriverGuard({ children }: Props) {
  const { isApproved, loading: isLoading } = useDriverStatus();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isApproved) {
      navigate('/mapp/ride', { replace: true });
    }
  }, [isApproved, isLoading, navigate]);

  return <>{children}</>;
}

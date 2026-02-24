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

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isApproved) return null;

  return <>{children}</>;
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useDriverApplication = () => {
  const { user } = useAuth();

  const { data: driverProfile, isLoading: isLoadingDriver, refetch: refetchDriver } = useQuery({
    queryKey: ['driver-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: documents = [], isLoading: isLoadingDocs } = useQuery({
    queryKey: ['driver-documents', driverProfile?.id],
    queryFn: async () => {
      if (!driverProfile) return [];

      const { data, error } = await supabase
        .from('driver_documents')
        .select('*')
        .eq('driver_id', driverProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!driverProfile,
  });

  const documentsStatus = {
    total: 4, // Required documents count
    approved: documents.filter((d) => d.status === 'approved').length,
    pending: documents.filter((d) => d.status === 'pending').length,
    rejected: documents.filter((d) => d.status === 'rejected').length,
  };

  return {
    driverProfile,
    documents,
    documentsStatus,
    isLoading: isLoadingDriver || isLoadingDocs,
    refetchDriver,
    hasApplied: !!driverProfile,
  };
};

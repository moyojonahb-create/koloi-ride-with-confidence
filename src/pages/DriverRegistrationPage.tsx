import DriverRegistrationWizard from '@/components/driver/DriverRegistrationWizard';
import { useNavigate } from 'react-router-dom';

export default function DriverRegistrationPage() {
  const navigate = useNavigate();

  return (
    <DriverRegistrationWizard
      onSuccess={() => navigate('/driver')}
      onClose={() => navigate('/driver')}
    />
  );
}

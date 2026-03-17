import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DriverRegistrationIntro from '@/components/driver/DriverRegistrationIntro';
import DriverPersonalForm from '@/components/driver/DriverPersonalForm';
import DriverVehicleForm from '@/components/driver/DriverVehicleForm';
import DriverDocumentsForm from '@/components/driver/DriverDocumentsForm';
import DriverReviewForm from '@/components/driver/DriverReviewForm';
import DriverSuccessScreen from '@/components/driver/DriverSuccessScreen';

type Step = 'intro' | 'personal' | 'vehicle' | 'documents' | 'review' | 'success';

export default function DriverRegistrationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('intro');
  const [formData, setFormData] = useState({
    personal: null as any,
    vehicle: null as any,
    files: {} as any,
  });

  const updateData = (stepName: string, data: any) => {
    setFormData(prev => ({ ...prev, [stepName]: data }));
  };

  const goToNext = (data: any) => {
    switch (step) {
      case 'intro':
        setStep('personal');
        break;
      case 'personal':
        updateData('personal', data);
        setStep('vehicle');
        break;
      case 'vehicle':
        updateData('vehicle', data);
        setStep('documents');
        break;
      case 'documents':
        updateData('files', data);
        setStep('review');
        break;
      case 'review':
        // Submit
        setStep('success');
        break;
    }
  };

  const goToStep = (newStep: Step) => setStep(newStep);

  const currentComponent = {
    intro: <DriverRegistrationIntro onNext={() => {}} />, // placeholder
    personal: <DriverPersonalForm onNext={goToNext} />,
    vehicle: <DriverVehicleForm onNext={goToNext} />,
    documents: <DriverDocumentsForm onNext={goToNext} />,
    review: <DriverReviewForm data={formData} onBack={() => setStep('documents')} />,
    success: <DriverSuccessScreen />,
  }[step];

  return currentComponent;
}


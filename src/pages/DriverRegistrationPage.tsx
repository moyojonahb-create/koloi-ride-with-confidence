import { useState } from 'react';
import DriverRegistrationIntro from '@/components/driver/DriverRegistrationIntro';
import DriverPersonalForm from '@/components/driver/DriverPersonalForm';
import DriverVehicleForm from '@/components/driver/DriverVehicleForm';
import DriverDocumentsForm from '@/components/driver/DriverDocumentsForm';
import DriverReviewForm from '@/components/driver/DriverReviewForm';
import DriverSuccessScreen from '@/components/driver/DriverSuccessScreen';

type Step = 'intro' | 'personal' | 'vehicle' | 'documents' | 'review' | 'success';

export default function DriverRegistrationPage() {
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

  const currentComponent = {
    intro: <DriverRegistrationIntro onNext={() => goToNext(null)} />,
    personal: <DriverPersonalForm onNext={goToNext} onBack={() => setStep('intro')} />,
    vehicle: <DriverVehicleForm onNext={goToNext} onBack={() => setStep('personal')} />,
    documents: <DriverDocumentsForm onNext={goToNext} onBack={() => setStep('vehicle')} />,
    review: <DriverReviewForm data={formData} onBack={() => setStep('documents')} />,
    success: <DriverSuccessScreen />,
  }[step];

  return currentComponent;
}





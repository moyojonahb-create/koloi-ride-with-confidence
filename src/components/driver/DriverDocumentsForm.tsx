import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, X } from 'lucide-react';

interface FileData {
  name: string;
  url: string;
  type: string;
}

export default function DriverDocumentsForm({ onNext, onBack }: { onNext: (files: Record<string, FileData | null>) => void; onBack?: () => void }) {
  const navigate = useNavigate();
  const [files, setFiles] = useState<Record<string, File | null>>({
    license: null,
    nationalId: null,
    vehicleRegistration: null,
    profilePhoto: null,
  });
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'idle' | 'uploading' | 'success' | 'error'>>({
    license: 'idle',
    nationalId: 'idle',
    vehicleRegistration: 'idle',
    profilePhoto: 'idle',
  });

  const handleFileChange = (type: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [type]: file }));
    if (file) {
      setUploadStatus(prev => ({ ...prev, [type]: 'uploading' }));
      // Simulate upload
      setTimeout(() => {
        setUploadStatus(prev => ({ ...prev, [type]: 'success' }));
      }, 1000);
    }
  };

  const documents = [
    { key: 'license', label: 'Driver\'s license', icon: CheckCircle },
    { key: 'nationalId', label: 'National ID', icon: CheckCircle },
    { key: 'vehicleRegistration', label: 'Vehicle registration book', icon: CheckCircle },
    { key: 'profilePhoto', label: 'Profile photo', icon: CheckCircle },
  ];

  const isComplete = Object.values(files).every(f => f !== null);

  return (
    <div className="p-4 space-y-4">
      <div className="text-center mb-8">
        <div className="flex items-center gap-2 justify-center mb-2 text-xs text-muted-foreground">
          <div className="w-24 h-1 bg-accent rounded-full" />
          <div className="flex-1 h-1 bg-muted rounded-full" />
          <div className="flex-1 h-1 bg-muted rounded-full" />
        </div>
        <div className="text-sm font-medium text-muted-foreground">Step 4 of 6</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {documents.map(({ key, label, icon: Icon }) => (
          <div key={key} className="space-y-2 text-center">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-border mx-auto flex flex-col items-center justify-center p-4 group hover:border-accent transition-colors">
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                id={key}
                onChange={(e) => handleFileChange(key, e.target.files?.[0] || null)}
              />
              <label htmlFor={key} className="cursor-pointer w-full h-full flex flex-col items-center justify-center group-hover:scale-105 transition-transform">
                {files[key as keyof typeof files] ? (
                  <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                ) : (
                  <Upload className="w-8 h-8 text-muted-foreground group-hover:text-accent" />
                )}
                <div className="text-xs mt-2 font-medium text-foreground">{label}</div>
                {uploadStatus[key as keyof typeof uploadStatus] === 'uploading' && (
                  <div className="text-xs text-accent mt-1">Uploading...</div>
                )}
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" className="flex-1 h-14 rounded-xl" onClick={() => onBack ? onBack() : navigate('/driver/register')}>
          Back
        </Button>
        <Button 
          type="button" 
          className="flex-1 h-14 rounded-xl bg-primary text-primary-foreground" 
          onClick={() => onNext(files as any)}
          disabled={!isComplete}
        >
          Next
        </Button>
      </div>
    </div>
  );
}




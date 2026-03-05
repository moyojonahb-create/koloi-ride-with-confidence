import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useLandmarks } from '@/hooks/useLandmarks';

interface ZWPlacesAutocompleteProps {
  placeholder: string;
  defaultValue: string;
  onPick: (place: { lat: number; lng: number; label: string }) => void;
}

const ZWPlacesAutocomplete: React.FC<ZWPlacesAutocompleteProps> = ({
  placeholder,
  defaultValue,
  onPick,
}) => {
  const [value, setValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const { landmarks } = useLandmarks({ searchQuery: value, limit: 5 });

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-3 border border-gray-300 rounded-lg">
        <MapPin className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="flex-1 outline-none text-sm"
        />
      </div>

      {isOpen && landmarks.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
          {landmarks.map((landmark, idx) => (
            <div
              key={idx}
              onClick={() => {
                onPick({
                  lat: landmark.latitude,
                  lng: landmark.longitude,
                  label: landmark.name,
                });
                setValue(landmark.name);
                setIsOpen(false);
              }}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b last:border-b-0 text-sm"
            >
              {landmark.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ZWPlacesAutocomplete;

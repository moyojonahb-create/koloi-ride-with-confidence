import { z } from 'zod';

export const landmarkSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(200, 'Name must be 200 characters or less'),
  category: z.string()
    .min(1, 'Category is required')
    .max(100, 'Category must be 100 characters or less'),
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional()
    .nullable(),
  keywords: z.array(z.string().max(50, 'Each keyword must be 50 characters or less'))
    .max(20, 'Maximum 20 keywords allowed')
    .optional(),
});

export interface ValidatedLandmark {
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  description: string | null;
  keywords: string[];
}

export const validateLandmarkForm = (form: {
  name: string;
  category: string;
  latitude: string;
  longitude: string;
  description: string;
  keywords: string;
}): { success: true; data: ValidatedLandmark } | { success: false; error: string } => {
  // Check required fields first
  if (!form.name || form.name.trim().length === 0) {
    return { success: false, error: 'Name is required' };
  }
  if (!form.latitude || form.latitude.trim().length === 0) {
    return { success: false, error: 'Latitude is required' };
  }
  if (!form.longitude || form.longitude.trim().length === 0) {
    return { success: false, error: 'Longitude is required' };
  }

  // Parse numeric values
  const latNum = parseFloat(form.latitude);
  const lngNum = parseFloat(form.longitude);

  // Check for NaN
  if (isNaN(latNum)) {
    return { success: false, error: 'Latitude must be a valid number' };
  }
  if (isNaN(lngNum)) {
    return { success: false, error: 'Longitude must be a valid number' };
  }

  // Parse keywords
  const keywordsArray = form.keywords
    ? form.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
    : [];

  const data = {
    name: form.name.trim(),
    category: form.category || 'Other',
    latitude: latNum,
    longitude: lngNum,
    description: form.description?.trim() || null,
    keywords: keywordsArray,
  };

  const result = landmarkSchema.safeParse(data);
  
  if (!result.success) {
    const firstError = result.error.errors[0];
    return { success: false, error: firstError.message };
  }

  return { success: true, data };
};


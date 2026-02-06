import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import geojsonData from '@/data/gwanda-osm-places.json';

export default function ImportOsmPlaces() {
  const [status, setStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{ imported?: number; message?: string; error?: string } | null>(null);

  const handleImport = async () => {
    setStatus('importing');
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('import-osm-places', {
        body: { geojson: geojsonData },
      });

      if (error) throw error;

      setStatus('success');
      setResult(data);
    } catch (err: any) {
      setStatus('error');
      setResult({ error: err.message || 'Import failed' });
    }
  };

  return (
    <div className="container max-w-lg mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import OSM Places
          </CardTitle>
          <CardDescription>
            Import Gwanda locations from OpenStreetMap data into the landmarks database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will replace all existing landmarks with {(geojsonData as any).features?.length || 0} places from the OSM export.
          </p>

          <Button 
            onClick={handleImport} 
            disabled={status === 'importing'}
            className="w-full"
          >
            {status === 'importing' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import All Places
              </>
            )}
          </Button>

          {status === 'success' && result && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/10 text-accent-foreground">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-accent" />
              <div>
                <p className="font-medium">Import Successful!</p>
                <p className="text-sm">{result.message}</p>
              </div>
            </div>
          )}

          {status === 'error' && result && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Import Failed</p>
                <p className="text-sm">{result.error}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

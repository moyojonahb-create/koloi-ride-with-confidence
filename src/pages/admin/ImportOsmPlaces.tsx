import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, CheckCircle, AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import geojsonData from '@/data/gwanda-osm-places.json';

export default function ImportOsmPlaces() {
  const [status, setStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{ imported?: number; message?: string; error?: string } | null>(null);
  const [fileData, setFileData] = useState<unknown>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        setFileData(JSON.parse(ev.target?.result as string));
      } catch {
        setResult({ error: 'Invalid JSON file' });
        setStatus('error');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async (mode: 'replace' | 'append', data: unknown) => {
    setStatus('importing');
    setResult(null);

    try {
      const { data: res, error } = await supabase.functions.invoke('import-osm-places', {
        body: { geojson: data, mode },
      });

      if (error) throw error;
      setStatus('success');
      setResult(res);
    } catch (err: unknown) {
      setStatus('error');
      setResult({ error: err.message || 'Import failed' });
    }
  };

  return (
    <div className="container max-w-lg mx-auto py-12 px-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import OSM Places
          </CardTitle>
          <CardDescription>
            Import Gwanda & Beitbridge locations from OpenStreetMap data into the landmarks database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Built-in dataset: {(geojsonData as unknown).features?.length || 0} Gwanda places from the OSM export.
          </p>

          <div className="flex gap-2">
            <Button onClick={() => handleImport('replace', geojsonData)} disabled={status === 'importing'} variant="destructive" className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Replace All
            </Button>
            <Button onClick={() => handleImport('append', geojsonData)} disabled={status === 'importing'} variant="outline" className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              Append
            </Button>
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Or upload a GeoJSON file (e.g. Beitbridge export)</p>
            <input type="file" accept=".json,.geojson" onChange={handleFileUpload} className="text-sm" />
            {fileData && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{fileName}: {fileData.features?.length || 0} features</p>
                <div className="flex gap-2">
                  <Button onClick={() => handleImport('replace', fileData)} disabled={status === 'importing'} variant="destructive" size="sm" className="flex-1">
                    Replace All
                  </Button>
                  <Button onClick={() => handleImport('append', fileData)} disabled={status === 'importing'} size="sm" className="flex-1">
                    <Plus className="w-4 h-4 mr-2" />
                    Append
                  </Button>
                </div>
              </div>
            )}
          </div>

          {status === 'importing' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Importing...
            </div>
          )}

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

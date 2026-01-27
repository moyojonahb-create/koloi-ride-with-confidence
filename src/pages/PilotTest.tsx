// Pilot Testing Page - Accessible route for testing driver navigation
import { Link } from 'react-router-dom';
import { ArrowLeft, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PilotTestingMode from '@/components/driver/PilotTestingMode';

export default function PilotTest() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-amber-500/10">
              <TestTube className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Pilot Testing Mode</h1>
              <p className="text-xs text-muted-foreground">Test driver navigation without real GPS</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <PilotTestingMode />
      </main>
    </div>
  );
}

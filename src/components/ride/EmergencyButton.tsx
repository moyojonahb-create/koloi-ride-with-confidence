import { useState } from "react";
import { AlertTriangle, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmergencyButton() {
  const [showPanel, setShowPanel] = useState(false);

  const emergencyContacts = [
    { label: "Police (ZRP)", number: "995" },
    { label: "Ambulance", number: "994" },
    { label: "Fire Brigade", number: "993" },
  ];

  return (
    <>
      <Button
        variant="destructive"
        size="icon"
        className="h-11 w-11 rounded-full shadow-lg"
        onClick={() => setShowPanel(true)}
        aria-label="Emergency"
      >
        <AlertTriangle className="h-5 w-5" />
      </Button>

      {showPanel && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end justify-center p-3">
          <div className="w-full max-w-md bg-background rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h2 className="text-lg font-black text-foreground">Emergency</h2>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              If you feel unsafe, call emergency services immediately.
            </p>

            <div className="space-y-2">
              {emergencyContacts.map((c) => (
                <a
                  key={c.number}
                  href={`tel:${c.number}`}
                  className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/20 rounded-xl hover:bg-destructive/20 transition-colors"
                >
                  <div>
                    <p className="font-bold text-foreground">{c.label}</p>
                    <p className="text-sm text-muted-foreground">{c.number}</p>
                  </div>
                  <Phone className="h-5 w-5 text-destructive" />
                </a>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPanel(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

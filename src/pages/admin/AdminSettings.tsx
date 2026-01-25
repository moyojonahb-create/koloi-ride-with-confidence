import { useState } from 'react';
import { Save, Bell, Shield, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const AdminSettings = () => {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    autoApproveDrivers: false,
    requireAllDocuments: true,
    baseFareEconomy: 50,
    baseFareComfort: 70,
    baseFarePremium: 100,
    perKmEconomy: 4,
    perKmComfort: 6,
    perKmPremium: 8,
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    toast.success('Settings saved successfully');
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="max-w-2xl space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Configure admin dashboard preferences</p>
          </div>

          {/* Notifications */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Notifications</h2>
            </div>
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive email alerts for important events
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, emailNotifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Browser push notifications for real-time alerts
                </p>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, pushNotifications: checked })
                }
              />
            </div>
          </div>

          {/* Driver Verification */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Driver Verification</h2>
            </div>
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-Approve Drivers</p>
                <p className="text-sm text-muted-foreground">
                  Automatically approve drivers when all documents are verified
                </p>
              </div>
              <Switch
                checked={settings.autoApproveDrivers}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, autoApproveDrivers: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Require All Documents</p>
                <p className="text-sm text-muted-foreground">
                  Drivers must upload all required documents before approval
                </p>
              </div>
              <Switch
                checked={settings.requireAllDocuments}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, requireAllDocuments: checked })
                }
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h2 className="font-semibold">Pricing (Rands)</h2>
            <Separator />
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Economy Base Fare</Label>
                <Input
                  type="number"
                  value={settings.baseFareEconomy}
                  onChange={(e) => 
                    setSettings({ ...settings, baseFareEconomy: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Economy Per KM</Label>
                <Input
                  type="number"
                  value={settings.perKmEconomy}
                  onChange={(e) => 
                    setSettings({ ...settings, perKmEconomy: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Comfort Base Fare</Label>
                <Input
                  type="number"
                  value={settings.baseFareComfort}
                  onChange={(e) => 
                    setSettings({ ...settings, baseFareComfort: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Comfort Per KM</Label>
                <Input
                  type="number"
                  value={settings.perKmComfort}
                  onChange={(e) => 
                    setSettings({ ...settings, perKmComfort: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Premium Base Fare</Label>
                <Input
                  type="number"
                  value={settings.baseFarePremium}
                  onChange={(e) => 
                    setSettings({ ...settings, baseFarePremium: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Premium Per KM</Label>
                <Input
                  type="number"
                  value={settings.perKmPremium}
                  onChange={(e) => 
                    setSettings({ ...settings, perKmPremium: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminSettings;

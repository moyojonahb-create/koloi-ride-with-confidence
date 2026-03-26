import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, User, Phone, ChevronRight, ShieldAlert, Loader2, UserPlus } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

interface Contact {
  name: string;
  phones: string[];
}

interface ContactPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (name: string, phone: string) => void;
}

export default function ContactPickerSheet({ open, onClose, onSelect }: ContactPickerSheetProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [phonePickContact, setPhonePickContact] = useState<Contact | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setPhonePickContact(null);
    setShowManual(false);
    setManualName('');
    setManualPhone('');
    loadContacts();
  }, [open]);

  const loadContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try Capacitor Contacts plugin first (native)
      const { Contacts } = await import('@capacitor-community/contacts').catch(() => ({ Contacts: null }));
      if (Contacts) {
        const perm = await Contacts.requestPermissions();
        if (perm.contacts !== 'granted') {
          setError('Permission required to access contacts.');
          setShowManual(true);
          setLoading(false);
          return;
        }
        const result = await Contacts.getContacts({
          projection: { name: true, phones: true },
        });
        const mapped: Contact[] = (result.contacts || [])
          .filter(c => c.name?.display || c.name?.given)
          .map(c => ({
            name: c.name?.display || `${c.name?.given || ''} ${c.name?.family || ''}`.trim(),
            phones: (c.phones || []).map(p => p.number || '').filter(Boolean),
          }))
          .filter(c => c.phones.length > 0);
        const seen = new Set<string>();
        const unique = mapped.filter(c => {
          const key = `${c.name}-${c.phones[0]}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        unique.sort((a, b) => a.name.localeCompare(b.name));
        setContacts(unique);
        setLoading(false);
        return;
      }

      // Fallback: Web Contact Picker API
      const nav = navigator as Navigator & {
        contacts?: { select: (props: string[], opts?: { multiple?: boolean }) => Promise<Array<Record<string, unknown>>> };
      };
      if (nav.contacts?.select) {
        const selected = await nav.contacts.select(['name', 'tel'], { multiple: true });
        const mapped: Contact[] = (selected || []).map(s => ({
          name: ((s.name as string[]) || [])[0] || 'Unknown',
          phones: ((s.tel as string[]) || []).filter(Boolean),
        })).filter(c => c.phones.length > 0);
        setContacts(mapped);
        setLoading(false);
        return;
      }

      // No contact APIs available — show manual entry
      setShowManual(true);
    } catch {
      setShowManual(true);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phones.some(p => p.includes(q))
    );
  }, [contacts, search]);

  const handleSelect = (contact: Contact) => {
    if (contact.phones.length > 1) {
      setPhonePickContact(contact);
    } else {
      haptic('light');
      onSelect(contact.name, contact.phones[0]);
      onClose();
    }
  };

  const handlePhoneSelect = (phone: string) => {
    if (!phonePickContact) return;
    haptic('light');
    onSelect(phonePickContact.name, phone);
    setPhonePickContact(null);
    onClose();
  };

  const handleManualSubmit = () => {
    const name = manualName.trim();
    const phone = manualPhone.trim();
    if (!name || !phone) return;
    haptic('light');
    onSelect(name, phone);
    onClose();
  };

  const grouped = useMemo(() => {
    const groups: Record<string, Contact[]> = {};
    for (const c of filtered) {
      const letter = (c.name[0] || '#').toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(c);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const hasContacts = contacts.length > 0;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[85dvh] rounded-t-3xl p-0 flex flex-col">
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-3 border-b border-border/40">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">
              {showManual && !hasContacts ? 'Enter Contact' : 'Select Contact'}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="w-9 h-9 rounded-xl">
              <X className="w-5 h-5" />
            </Button>
          </div>
          {hasContacts && (
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-muted/50 border-0 text-sm"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading contacts...</p>
            </div>
          )}

          {/* Manual entry form */}
          {!loading && (showManual || (!hasContacts && !error)) && (
            <div className="px-5 py-6 space-y-4">
              <div className="flex flex-col items-center gap-2 mb-2">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserPlus className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Enter the person's details below
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name</label>
                  <Input
                    placeholder="e.g. Tendai Moyo"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="h-12 rounded-xl bg-muted/50 border-0 text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone Number</label>
                  <Input
                    placeholder="e.g. +263 77 123 4567"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    type="tel"
                    className="h-12 rounded-xl bg-muted/50 border-0 text-sm"
                  />
                </div>
              </div>

              <Button
                onClick={handleManualSubmit}
                disabled={!manualName.trim() || !manualPhone.trim()}
                className="w-full h-12 rounded-xl font-semibold text-sm"
              >
                Select This Person
              </Button>
            </div>
          )}

          {!loading && error && !showManual && (
            <div className="flex flex-col items-center justify-center py-16 px-6 gap-3 text-center">
              <ShieldAlert className="w-10 h-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={loadContacts} className="rounded-xl mt-2">
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && hasContacts && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Search className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No contacts match "{search}"</p>
            </div>
          )}

          {/* Contact list */}
          {!loading && !error && grouped.map(([letter, group]) => (
            <div key={letter}>
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-5 py-1.5">
                <span className="text-xs font-bold text-primary">{letter}</span>
              </div>
              {group.map((contact, i) => (
                <motion.button
                  key={`${contact.name}-${contact.phones[0]}-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  onClick={() => handleSelect(contact)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/50 active:bg-muted transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{contact.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.phones[0]}
                      {contact.phones.length > 1 && ` (+${contact.phones.length - 1} more)`}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </motion.button>
              ))}
            </div>
          ))}
        </div>

        {/* Phone number picker overlay */}
        <AnimatePresence>
          {phonePickContact && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/95 backdrop-blur-sm z-20 flex flex-col"
            >
              <div className="px-5 pt-5 pb-3 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setPhonePickContact(null)} className="w-9 h-9 rounded-xl">
                    <X className="w-5 h-5" />
                  </Button>
                  <div>
                    <h3 className="font-bold text-foreground">{phonePickContact.name}</h3>
                    <p className="text-xs text-muted-foreground">Choose a phone number</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-2">
                {phonePickContact.phones.map((phone, i) => (
                  <motion.button
                    key={phone}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handlePhoneSelect(phone)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-muted/50 hover:bg-muted active:bg-muted/80 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{phone}</p>
                      <p className="text-xs text-muted-foreground">
                        {i === 0 ? 'Primary' : `Number ${i + 1}`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer — manual entry toggle when contacts loaded */}
        {!loading && hasContacts && (
          <div className="shrink-0 px-5 py-3 border-t border-border/40 bg-background flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {contacts.length} contacts
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary"
              onClick={() => setShowManual(!showManual)}
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              Enter manually
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

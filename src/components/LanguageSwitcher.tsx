import { Globe } from 'lucide-react';
import { useI18n, Locale } from '@/lib/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, locales, localeLabel, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`text-[15px] font-medium text-foreground/70 hover:text-foreground hover:bg-muted px-4 py-2.5 rounded-full transition-all duration-150 flex items-center gap-1.5 ${className}`}>
          <Globe className="w-4 h-4" />
          <span>{localeLabel(locale)}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setLocale(l)}
            className={locale === l ? 'bg-primary/10 font-bold' : ''}
          >
            {t(`lang.${l}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

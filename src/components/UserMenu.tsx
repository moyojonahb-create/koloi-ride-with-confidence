import { useState } from 'react';
import { User, LogOut, Heart, Clock, Settings, FileText, Shield, Car } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useDriverStatus } from '@/hooks/useDriverStatus';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface UserMenuProps {
  onFavoritesClick: () => void;
  onHistoryClick: () => void;
  variant?: 'default' | 'light';
}

const UserMenu = ({ onFavoritesClick, onHistoryClick, variant = 'default' }: UserMenuProps) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { isApproved: isApprovedDriver } = useDriverStatus();
  const [open, setOpen] = useState(false);

  // Only show admin link if email matches the designated admin
  const showAdmin = isAdmin && user?.email?.toLowerCase() === 'moyojonahb@gmail.com';

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  const userInitials = user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user?.email?.[0].toUpperCase() || 'U';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={`relative h-11 w-11 rounded-full active:scale-90 transition-all ${variant === 'light' ? 'hover:bg-primary-foreground/10' : ''}`}
        >
          <Avatar className="h-11 w-11">
            <AvatarFallback className={`text-[13px] font-bold ${variant === 'light' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}`}>
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 rounded-2xl p-1.5" align="end" forceMount>
        <div className="flex items-center justify-start gap-3 p-3">
          <div className="flex flex-col space-y-0.5 leading-none">
            {user?.user_metadata?.full_name && (
              <p className="text-[15px] font-semibold">{user.user_metadata.full_name}</p>
            )}
            <p className="w-[200px] truncate text-[13px] text-muted-foreground">
              {user?.email || user?.phone}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        
        {/* Admin Dashboard Link - only visible to admins */}
        {showAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/admin" className="flex items-center text-primary font-medium">
                <Shield className="mr-2 h-4 w-4" />
                <span>Admin Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Driver Dashboard Link - only visible to approved drivers */}
        {isApprovedDriver && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/driver" className="flex items-center text-primary font-medium">
                <Car className="mr-2 h-4 w-4" />
                <span>Driver Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link to="/app" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            <span>My Notes</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onFavoritesClick}>
          <Heart className="mr-2 h-4 w-4" />
          <span>Favorite locations</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onHistoryClick}>
          <Clock className="mr-2 h-4 w-4" />
          <span>Ride history</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User, Palette, MoreVertical, Shield, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/auth";

export function UserMenu({
  trigger,
  onAccount,
  onSettings,
  onTheme,
  onLogin,
}: {
  trigger?: "row" | "dots";
  onAccount: () => void;
  onSettings: () => void;
  onTheme: () => void;
  onLogin?: () => void;
}) {
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  const displayName = user
    ? (user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user.email)
    : "Guest";

  const initial = user
    ? (user.firstName?.[0] ?? user.email[0]).toUpperCase()
    : "G";

  const tierLabel = user
    ? { free: "Free", starter: "Starter", professional: "Pro", elite: "Elite", pro: "Pro", enterprise: "Enterprise" }[user.subscription] ?? user.subscription
    : "Not signed in";

  const tierColor = user
    ? { free: "from-gray-600 to-gray-700", starter: "from-blue-600 to-blue-800", professional: "from-purple-600 to-purple-800", elite: "from-red-600 to-red-900", pro: "from-purple-600 to-purple-800", enterprise: "from-amber-500 to-amber-700" }[user.subscription] ?? "from-gray-600 to-gray-700"
    : "from-gray-600 to-gray-700";

  const handleSignOut = async () => {
    try {
      await logout();
      signOut();
    } catch {
      signOut();
    }
    toast({ description: "تم تسجيل الخروج." });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger === "dots" ? (
          <button className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground" aria-label="More">
            <MoreVertical className="w-4 h-4" />
          </button>
        ) : (
          <button className="flex items-center gap-2.5 hover:bg-white/5 rounded-lg px-2 py-1.5 transition-colors max-w-[180px]">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${tierColor} flex items-center justify-center text-white font-bold text-sm shadow-inner border border-white/10 shrink-0`}>
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : initial}
            </div>
            <div className="text-right min-w-0">
              <div className="font-semibold text-[12px] leading-tight text-white truncate">{displayName}</div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                {user?.subscription === "elite" && <span className="text-red-400">👑</span>}
                {tierLabel}
              </div>
            </div>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-[#0d0d0d] border-white/10">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white truncate">{displayName}</span>
            <span className="text-xs text-gray-500 truncate">{user?.email ?? "—"}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />

        {user ? (
          <>
            <DropdownMenuItem onSelect={onAccount} className="text-gray-300 hover:text-white cursor-pointer">
              <User className="w-4 h-4 mr-2" /> إعدادات الحساب
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onSettings} className="text-gray-300 hover:text-white cursor-pointer">
              <Settings className="w-4 h-4 mr-2" /> الإعدادات
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onTheme} className="text-gray-300 hover:text-white cursor-pointer">
              <Palette className="w-4 h-4 mr-2" /> المظهر
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            {/* Token usage indicator */}
            {user && (
              <div className="px-2 py-2">
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                  <span>التوكن المستخدمة</span>
                  <span>{Math.round((user.tokensUsed / user.tokensLimit) * 100)}%</span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-600 transition-all"
                    style={{ width: `${Math.min(100, (user.tokensUsed / user.tokensLimit) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onSelect={handleSignOut} className="text-red-400 hover:text-red-300 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" /> تسجيل الخروج
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onSelect={onLogin} className="text-red-400 hover:text-red-300 cursor-pointer">
              <Shield className="w-4 h-4 mr-2" /> تسجيل الدخول
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onSettings} className="text-gray-300 hover:text-white cursor-pointer">
              <Settings className="w-4 h-4 mr-2" /> الإعدادات
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

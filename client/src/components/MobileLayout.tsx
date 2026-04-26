import { useLocation } from "wouter";
import { Home, Trophy, Target, User } from "lucide-react";
import { cn } from "@/lib/utils";
import logoLight from "@assets/tutturduk_1777158124987.png";

interface MobileLayoutProps {
  children: React.ReactNode;
  activeTab?: "home" | "predictions" | "winners" | "profile" | "admin";
}

export function MobileLayout({ children, activeTab }: MobileLayoutProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen text-white font-sans selection:bg-white/15" style={{ background: '#0a0a0c' }}>
      {/* Header — solid, no glassmorphism */}
      <header
        className="fixed top-0 left-0 right-0 z-[100]"
        style={{
          background: '#0a0a0c',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="h-[58px] flex items-center justify-between px-5 max-w-[480px] mx-auto">
          {/* Logo */}
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2.5 group"
            data-testid="link-home-logo"
          >
            <img
              src={logoLight}
              alt="tutturduk"
              className="h-7 w-auto object-contain opacity-95 group-hover:opacity-100 transition-opacity"
            />
          </button>

          {/* Profile button */}
          <button
            onClick={() => setLocation("/profile")}
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center transition-all",
              "border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.14] active:scale-95",
              activeTab === "profile" && "bg-white/[0.06] border-white/[0.18]"
            )}
            data-testid="button-profile"
          >
            <User className="w-[15px] h-[15px] text-white/75" strokeWidth={1.8} />
          </button>
        </div>

        {/* Hairline progress accent */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </header>

      {/* Header Spacer */}
      <div className="h-[58px]" />

      {/* Main Content */}
      <main className="px-5 pb-32 max-w-[480px] mx-auto animate-fade-in relative z-10">
        {children}
      </main>

      {/* Bottom Navigation — solid surface, no blur */}
      <nav className="fixed bottom-5 left-0 right-0 z-50 px-4">
        <div
          className="max-w-[480px] mx-auto flex items-stretch rounded-full overflow-hidden"
          style={{
            background: '#141416',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 60px -20px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.04) inset',
          }}
        >
          <NavButton
            label="Ana Sayfa"
            icon={Home}
            active={activeTab === "home"}
            onClick={() => setLocation("/")}
            testId="nav-home"
          />
          <NavDivider />
          <NavButton
            label="Tahminler"
            icon={Target}
            active={activeTab === "predictions"}
            onClick={() => setLocation("/predictions")}
            testId="nav-predictions"
          />
          <NavDivider />
          <NavButton
            label="Sonuçlar"
            icon={Trophy}
            active={activeTab === "winners"}
            onClick={() => setLocation("/winners")}
            testId="nav-winners"
          />
        </div>
      </nav>
    </div>
  );
}

function NavDivider() {
  return <div className="self-center w-px h-7 bg-white/[0.06]" />;
}

function NavButton({
  label,
  icon: Icon,
  active,
  onClick,
  testId,
}: {
  label: string;
  icon: any;
  active: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "group flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all duration-300 relative",
        "active:scale-[0.97]"
      )}
    >
      {/* Active dot */}
      <div
        className={cn(
          "absolute top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full transition-all duration-300",
          active ? "bg-white opacity-100" : "opacity-0"
        )}
      />
      <Icon
        className={cn(
          "w-[18px] h-[18px] transition-colors",
          active ? "text-white" : "text-white/45 group-hover:text-white/70"
        )}
        strokeWidth={active ? 2 : 1.6}
      />
      <span
        className={cn(
          "text-[9.5px] tracking-[0.14em] uppercase font-medium transition-colors",
          active ? "text-white/90" : "text-white/40 group-hover:text-white/65"
        )}
      >
        {label}
      </span>
    </button>
  );
}

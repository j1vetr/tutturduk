import { useLocation } from "wouter";
import { Home, Trophy, User, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { BAYI_KODU } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import logoIcon from "@assets/generated_images/minimalist_sports_betting_logo_icon.png";

interface MobileLayoutProps {
  children: React.ReactNode;
  activeTab?: "home" | "winners" | "profile" | "admin";
}

export function MobileLayout({ children, activeTab }: MobileLayoutProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(BAYI_KODU);
    toast({
      description: "Bayi kodu kopyalandı!",
      className: "bg-primary text-primary-foreground border-none font-bold",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 h-16 flex items-center justify-between px-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-2">
          <img src={logoIcon} alt="Logo" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-xl font-display font-bold text-primary tracking-wider leading-none">TUTTURDUK<span className="text-white">.COM</span></h1>
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Günlük Tahmin Merkezi</p>
          </div>
        </div>
        <button 
          onClick={handleCopyCode}
          className="flex items-center gap-2 bg-card/80 border border-primary/20 hover:border-primary/50 px-3 py-1.5 rounded-full active:scale-95 transition-all shadow-sm"
        >
          <div className="flex flex-col items-end leading-none">
            <span className="text-[9px] font-medium text-muted-foreground uppercase">Bayi Kodu</span>
            <span className="text-sm font-display font-bold text-primary tracking-wider">{BAYI_KODU}</span>
          </div>
          <Copy className="w-3.5 h-3.5 text-primary" />
        </button>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border h-20 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
        <div className="grid grid-cols-3 h-16">
          <button 
            onClick={() => setLocation("/")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-300 relative group",
              activeTab === "home" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "home" && (
              <span className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-12 h-[2px] bg-primary shadow-[0_0_10px_rgba(255,215,0,0.5)] rounded-full" />
            )}
            <Home className={cn("w-6 h-6 transition-transform", activeTab === "home" ? "scale-110" : "group-active:scale-90")} />
            <span className="text-[10px] font-bold tracking-wide">Tahminler</span>
          </button>
          
          <button 
            onClick={() => setLocation("/winners")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-300 relative group",
              activeTab === "winners" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "winners" && (
              <span className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-12 h-[2px] bg-primary shadow-[0_0_10px_rgba(255,215,0,0.5)] rounded-full" />
            )}
            <Trophy className={cn("w-6 h-6 transition-transform", activeTab === "winners" ? "scale-110" : "group-active:scale-90")} />
            <span className="text-[10px] font-bold tracking-wide">Kazananlar</span>
          </button>
          
          <button 
            onClick={() => setLocation("/profile")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-300 relative group",
              activeTab === "profile" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "profile" && (
              <span className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-12 h-[2px] bg-primary shadow-[0_0_10px_rgba(255,215,0,0.5)] rounded-full" />
            )}
            <User className={cn("w-6 h-6 transition-transform", activeTab === "profile" ? "scale-110" : "group-active:scale-90")} />
            <span className="text-[10px] font-bold tracking-wide">Profil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

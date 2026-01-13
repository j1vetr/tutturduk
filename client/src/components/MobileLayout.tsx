import { useLocation } from "wouter";
import { Home, Trophy, User, CalendarDays, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import logoIcon from "@assets/generated_images/minimalist_sports_betting_logo_icon.png";

interface MobileLayoutProps {
  children: React.ReactNode;
  activeTab?: "home" | "winners" | "profile" | "admin" | "live" | "upcoming";
}

export function MobileLayout({ children, activeTab }: MobileLayoutProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-black font-sans selection:bg-primary/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[100] bg-black backdrop-blur-xl border-b border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <div className="h-16 flex items-center justify-between px-4 max-w-full">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-2 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img src={logoIcon} alt="Logo" className="w-9 h-9 object-contain relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
            </div>
            <div>
              <h1 className="text-xl font-display font-black text-white tracking-tight leading-none flex items-center gap-0.5">
                TUTTURDUK<span className="text-primary">.COM</span>
              </h1>
              <p className="text-[9px] text-zinc-500 uppercase tracking-[0.25em] font-bold">Premium Analiz</p>
            </div>
          </div>
          <button 
            onClick={() => setLocation("/profile")}
            className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-primary/50 px-3 py-1.5 rounded-xl active:scale-95 transition-all shadow-lg group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="flex flex-col items-end leading-none relative z-10">
              <span className="text-[8px] font-bold text-zinc-500 uppercase group-hover:text-primary transition-colors">Hesabım</span>
              <span className="text-sm font-display font-bold text-white tracking-widest">Profil</span>
            </div>
            <User className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform relative z-10" />
          </button>
        </div>
        
      </header>

      {/* Main Content */}
      <main className="pt-24 px-4 pb-32 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {children}
      </main>

      {/* Floating Bottom Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 z-50">
        <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex items-center justify-between relative">
          
          <button 
            onClick={() => setLocation("/")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden",
              activeTab === "home" ? "text-primary bg-white/5" : "text-zinc-500 hover:text-white hover:bg-white/5"
            )}
          >
            <div className={cn("absolute inset-0 bg-primary/10 blur-xl opacity-0 transition-opacity", activeTab === "home" && "opacity-100")} />
            <Home className={cn("w-5 h-5 transition-transform relative z-10", activeTab === "home" ? "scale-110 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "group-active:scale-90")} />
            <span className={cn("text-[9px] font-bold tracking-wide relative z-10", activeTab === "home" && "text-white")}>Tahminler</span>
          </button>
          
          <div className="w-[1px] h-8 bg-white/5" />

          <button 
            onClick={() => setLocation("/live")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden",
              activeTab === "live" ? "text-red-500 bg-white/5" : "text-zinc-500 hover:text-white hover:bg-white/5"
            )}
          >
            <div className={cn("absolute inset-0 bg-red-500/10 blur-xl opacity-0 transition-opacity", activeTab === "live" && "opacity-100")} />
            <Radio className={cn("w-5 h-5 transition-transform relative z-10", activeTab === "live" ? "scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" : "group-active:scale-90")} />
            <span className={cn("text-[9px] font-bold tracking-wide relative z-10", activeTab === "live" && "text-white")}>Canlı</span>
          </button>
          
          <div className="w-[1px] h-8 bg-white/5" />

          <button 
            onClick={() => setLocation("/upcoming")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden",
              activeTab === "upcoming" ? "text-blue-500 bg-white/5" : "text-zinc-500 hover:text-white hover:bg-white/5"
            )}
          >
            <div className={cn("absolute inset-0 bg-blue-500/10 blur-xl opacity-0 transition-opacity", activeTab === "upcoming" && "opacity-100")} />
            <CalendarDays className={cn("w-5 h-5 transition-transform relative z-10", activeTab === "upcoming" ? "scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "group-active:scale-90")} />
            <span className={cn("text-[9px] font-bold tracking-wide relative z-10", activeTab === "upcoming" && "text-white")}>Bülten</span>
          </button>
          
          <div className="w-[1px] h-8 bg-white/5" />
          
          <button 
            onClick={() => setLocation("/winners")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden",
              activeTab === "winners" ? "text-primary bg-white/5" : "text-zinc-500 hover:text-white hover:bg-white/5"
            )}
          >
            <div className={cn("absolute inset-0 bg-primary/10 blur-xl opacity-0 transition-opacity", activeTab === "winners" && "opacity-100")} />
            <Trophy className={cn("w-5 h-5 transition-transform relative z-10", activeTab === "winners" ? "scale-110 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "group-active:scale-90")} />
            <span className={cn("text-[9px] font-bold tracking-wide relative z-10", activeTab === "winners" && "text-white")}>Kazananlar</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

import { useLocation } from "wouter";
import { Home, Trophy, User, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import logoIcon from "@assets/generated_images/minimalist_sports_betting_logo_icon.png";

interface MobileLayoutProps {
  children: React.ReactNode;
  activeTab?: "home" | "predictions" | "winners" | "profile" | "admin";
}

export function MobileLayout({ children, activeTab }: MobileLayoutProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white font-sans selection:bg-primary/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="h-16 flex items-center justify-between px-4 max-w-full">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-2 bg-emerald-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img src={logoIcon} alt="Logo" className="w-9 h-9 object-contain relative z-10 drop-shadow-sm" />
            </div>
            <div>
              <h1 className="text-xl font-display font-black text-gray-900 tracking-tight leading-none flex items-center gap-0.5">
                TUTTURDUK<span className="text-emerald-500">.COM</span>
              </h1>
              <p className="text-[9px] text-gray-400 uppercase tracking-[0.25em] font-bold">Premium Analiz</p>
            </div>
          </div>
          <button 
            onClick={() => setLocation("/profile")}
            className="flex items-center gap-2 bg-gray-50 border border-gray-200 hover:border-emerald-300 px-3 py-1.5 rounded-xl active:scale-95 transition-all shadow-sm group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="flex flex-col items-end leading-none relative z-10">
              <span className="text-[8px] font-bold text-gray-400 uppercase group-hover:text-emerald-500 transition-colors">Hesabım</span>
              <span className="text-sm font-display font-bold text-gray-800 tracking-widest">Profil</span>
            </div>
            <User className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform relative z-10" />
          </button>
        </div>
        
      </header>

      {/* Header Spacer */}
      <div className="h-20" />
      
      {/* Main Content */}
      <main className="px-4 pb-32 animate-in fade-in slide-in-from-bottom-2 duration-500 relative z-10">
        {children}
      </main>

      {/* Floating Bottom Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 z-50">
        <div className="bg-white/95 backdrop-blur-2xl border border-gray-200 rounded-2xl p-2 shadow-lg shadow-gray-200/50 flex items-center justify-between relative">
          
          <button 
            onClick={() => setLocation("/")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden",
              activeTab === "home" ? "text-emerald-600 bg-emerald-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <div className={cn("absolute inset-0 bg-emerald-100 blur-xl opacity-0 transition-opacity", activeTab === "home" && "opacity-50")} />
            <Home className={cn("w-5 h-5 transition-transform relative z-10", activeTab === "home" ? "scale-110" : "group-active:scale-90")} />
            <span className={cn("text-[9px] font-bold tracking-wide relative z-10", activeTab === "home" && "text-emerald-700")}>Ana Sayfa</span>
          </button>
          
          <div className="w-[1px] h-8 bg-gray-200" />

          <button 
            onClick={() => setLocation("/predictions")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden",
              activeTab === "predictions" ? "text-blue-600 bg-blue-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <div className={cn("absolute inset-0 bg-blue-100 blur-xl opacity-0 transition-opacity", activeTab === "predictions" && "opacity-50")} />
            <Target className={cn("w-5 h-5 transition-transform relative z-10", activeTab === "predictions" ? "scale-110" : "group-active:scale-90")} />
            <span className={cn("text-[9px] font-bold tracking-wide relative z-10", activeTab === "predictions" && "text-blue-700")}>Tahminler</span>
          </button>
          
          <div className="w-[1px] h-8 bg-gray-200" />
          
          <button 
            onClick={() => setLocation("/winners")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden",
              activeTab === "winners" ? "text-purple-600 bg-purple-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <div className={cn("absolute inset-0 bg-purple-100 blur-xl opacity-0 transition-opacity", activeTab === "winners" && "opacity-50")} />
            <Trophy className={cn("w-5 h-5 transition-transform relative z-10", activeTab === "winners" ? "scale-110" : "group-active:scale-90")} />
            <span className={cn("text-[9px] font-bold tracking-wide relative z-10", activeTab === "winners" && "text-purple-700")}>Tuttu/Tutmadı</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

import { useState } from "react";
import { useAuth, BAYI_KODU } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Instagram, HelpCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import logoIcon from "@assets/generated_images/minimalist_sports_betting_logo_icon.png";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        variant: "destructive",
        description: "Lutfen tum alanlari doldurun.",
      });
      return;
    }

    if (!isLogin && !referralCode) {
      toast({
        variant: "destructive",
        description: "Kayit olmak icin Davet Kodu zorunludur.",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await login(username, password, !isLogin, referralCode);

      if (success) {
        toast({
          description: isLogin ? "Giris basarili!" : "Kayit basarili!",
          className: "bg-emerald-500 text-white border-none font-semibold",
        });
        setLocation("/");
      } else {
        toast({
          variant: "destructive",
          description: isLogin ? "Kullanici adi veya sifre hatali." : "Gecersiz davet kodu.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-center justify-center pt-16 pb-8 px-6">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm mb-4">
          <img src={logoIcon} alt="Logo" className="w-10 h-10 object-contain" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          TUTTURDUK<span className="text-emerald-500">.COM</span>
        </h1>
      </div>

      {/* Main Card */}
      <div className="flex-1 px-4 pb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm max-w-md mx-auto">
          
          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                isLogin 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Giris Yap
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                !isLogin 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Kayit Ol
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-medium text-slate-500">
                Kullanici Adi
              </Label>
              <Input 
                id="username" 
                placeholder="ornek: ahmet1905" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 rounded-lg bg-white border-slate-200 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400"
                data-testid="input-username"
              />
            </div>
            
            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-slate-500">
                Sifre
              </Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"}
                  placeholder="********" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-lg bg-white border-slate-200 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 pr-10"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Referral Code - Only for Registration */}
            {!isLogin && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="referral" className="text-xs font-medium text-slate-500">
                    Davet Kodu
                  </Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button 
                        type="button"
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                      >
                        <HelpCircle className="w-3 h-3" />
                        Kodum yok
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-slate-200 max-w-sm">
                      <DialogHeader>
                        <DialogTitle className="text-lg text-slate-800">Davet Kodu Nasil Alinir?</DialogTitle>
                        <DialogDescription className="text-slate-500">
                          Platformumuz davetiye ile calisiyor.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-3 py-3">
                        <div className="flex gap-3 items-start">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold text-xs flex-shrink-0">1</div>
                          <p className="text-sm text-slate-600">
                            <span className="font-semibold text-slate-800">iddaa.com</span> uzerinden uyelik olustururken Bayi Kodu alanina <span className="font-bold text-emerald-600">{BAYI_KODU}</span> yazin.
                          </p>
                        </div>
                        
                        <div className="flex gap-3 items-start">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold text-xs flex-shrink-0">2</div>
                          <p className="text-sm text-slate-600">
                            Instagram uzerinden bize yazin, size ozel davet kodunuzu iletelim.
                          </p>
                        </div>
                      </div>

                      <Button 
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg" 
                        onClick={() => window.open('https://instagram.com', '_blank')}
                      >
                        <Instagram className="w-4 h-4 mr-2" /> Instagram'dan Yaz
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>
                <Input 
                  id="referral" 
                  placeholder="Davet kodunuzu girin" 
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="h-11 rounded-lg bg-white border-slate-200 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 font-mono tracking-wider"
                  data-testid="input-referral"
                />
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-11 text-sm font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors mt-2"
              disabled={isLoading}
              data-testid="button-submit"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Giris Yap" : "Kayit Ol"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          &copy; 2025 Tutturduk.com
        </p>
      </div>
    </div>
  );
}

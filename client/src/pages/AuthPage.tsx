import { useState } from "react";
import { useAuth, BAYI_KODU } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Lock, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoIcon from "@assets/generated_images/minimalist_sports_betting_logo_icon.png";
import bgImage from "@assets/generated_images/dark_abstract_geometric_background.png";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!username || !password) {
      toast({
        variant: "destructive",
        description: "Lütfen tüm alanları doldurun.",
      });
      return;
    }

    if (!isLogin && !referralCode) {
      toast({
        variant: "destructive",
        description: "Kayıt olmak için referans kodu zorunludur.",
      });
      return;
    }

    const codeToUse = isLogin ? BAYI_KODU : referralCode; 
    
    // Mock login logic
    const success = await login(username, codeToUse);

    if (success) {
      toast({
        description: "Giriş başarılı! Yönlendiriliyorsunuz...",
        className: "bg-secondary text-secondary-foreground border-none font-bold",
      });
      setLocation("/");
    } else {
      toast({
        variant: "destructive",
        description: "Geçersiz bilgiler veya referans kodu.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 opacity-40"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />

      <div className="w-full max-w-md space-y-8 relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-card rounded-2xl flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(255,215,0,0.1)]">
             <img src={logoIcon} alt="Logo" className="w-12 h-12 object-contain" />
          </div>
          <div>
            <h1 className="text-4xl font-display font-bold text-primary tracking-wider drop-shadow-lg">TUTTURDUK<span className="text-white">.COM</span></h1>
            <p className="text-muted-foreground uppercase tracking-[0.3em] text-xs font-medium">Günlük Tahmin Merkezi</p>
          </div>
        </div>

        <Card className="border-primary/20 bg-card/60 backdrop-blur-xl shadow-2xl shadow-black/50">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-center font-display tracking-wide uppercase">
              {isLogin ? "Giriş Yap" : "Aramıza Katıl"}
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Kazananlar kulübüne hoş geldiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı</Label>
                <Input 
                  id="username" 
                  placeholder="Kullanıcı adınız" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-background/50 border-input focus:border-primary h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/50 border-input focus:border-primary h-11"
                />
              </div>

              {!isLogin && (
                <div className="space-y-2 bg-primary/5 p-3 rounded-lg border border-primary/10">
                  <Label htmlFor="referral" className="text-primary font-bold">Referans Kodu (Zorunlu)</Label>
                  <Input 
                    id="referral" 
                    placeholder="Referans kodunuzu girin" 
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="bg-background border-primary/50 focus:border-primary h-11 font-mono text-center tracking-widest text-lg"
                  />
                  <p className="text-[10px] text-muted-foreground text-center mt-1">
                    Bayi kodumuz: <span className="text-primary font-bold">{BAYI_KODU}</span>
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full font-bold text-base h-12 uppercase tracking-wide shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                {isLogin ? "Giriş Yap" : "Kayıt Ol"} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-4"
              >
                {isLogin ? "Hesabınız yok mu? Kayıt Olun" : "Zaten üye misiniz? Giriş Yapın"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Locked Content Preview */}
        <div className="relative opacity-60 pointer-events-none select-none overflow-hidden rounded-xl border border-white/5">
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[3px] text-center p-4">
            <div className="bg-primary/20 p-3 rounded-full mb-2 border border-primary/30">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <p className="text-xs font-bold text-white uppercase tracking-wider">İçerik Kilitli</p>
            <p className="text-[10px] text-white/60">Görmek için giriş yapmalısınız</p>
          </div>
          <div className="space-y-3 p-3 filter blur-[2px] opacity-50 bg-card">
             <div className="bg-background/50 h-24 rounded-lg border border-white/5"></div>
             <div className="bg-background/50 h-24 rounded-lg border border-white/5"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

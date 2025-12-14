import { useState } from "react";
import { useAuth, BAYI_KODU } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Lock, ChevronRight, Instagram, HelpCircle, ExternalLink, CheckCircle2 } from "lucide-react";
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
        description: "Kayıt olmak için Davet Kodu zorunludur.",
      });
      return;
    }

    const codeToUse = isLogin ? BAYI_KODU : referralCode; 
    
    // Mock login logic - In a real app, referralCode would be checked against a DB of issued codes
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
        description: "Geçersiz bilgiler veya davet kodu.",
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
              {isLogin ? "Kazananlar kulübüne hoş geldiniz." : "Üyelik sadece davetiye ile alınmaktadır."}
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
                <div className="space-y-4">
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="referral" className="text-primary font-bold flex items-center gap-2">
                        Davet Kodu
                        <Dialog>
                          <DialogTrigger>
                             <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-white transition-colors" />
                          </DialogTrigger>
                          <DialogContent className="bg-card border-primary/20">
                            <DialogHeader>
                              <DialogTitle className="text-primary">Davet Kodu Nasıl Alınır?</DialogTitle>
                              <DialogDescription className="space-y-4 pt-4">
                                <div className="flex gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">1</div>
                                  <p><strong>iddaa.com</strong>'a üye olurken Bayi Kodu alanına <span className="text-primary font-bold">303603</span> yazın.</p>
                                </div>
                                <div className="flex gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">2</div>
                                  <p>Üyelik işleminiz tamamlandıktan sonra Instagram adresimizden bize yazın.</p>
                                </div>
                                <div className="flex gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">3</div>
                                  <p>Ekibimiz kontrol ettikten sonra size özel <strong>Davet Kodunuzu</strong> iletecektir.</p>
                                </div>
                                
                                <Button className="w-full mt-2 gap-2" variant="outline" onClick={() => window.open('https://instagram.com', '_blank')}>
                                  <Instagram className="w-4 h-4" /> Instagram'dan Yaz
                                </Button>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </Label>
                    </div>
                    
                    <Input 
                      id="referral" 
                      placeholder="Kodunuzu buraya girin" 
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      className="bg-background border-primary/50 focus:border-primary h-11 font-mono text-center tracking-widest text-lg"
                    />
                  </div>

                  {/* Info Box */}
                  <div className="text-[11px] text-muted-foreground bg-black/20 p-3 rounded border border-white/5">
                    <p className="flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 text-secondary mt-0.5 shrink-0" />
                      <span>Sadece iddaa.com'da <span className="text-white font-bold">303603</span> bayi kodunu kullanan üyelerimiz platforma erişebilir.</span>
                    </p>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full font-bold text-base h-12 uppercase tracking-wide shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                {isLogin ? "Giriş Yap" : "Kayıt Ol"} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </form>

            <div className="mt-6 text-center space-y-4">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-4"
              >
                {isLogin ? "Davet kodunuz var mı? Kayıt Olun" : "Zaten üye misiniz? Giriş Yapın"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Social Proof / Trust Footer */}
        <div className="text-center space-y-2">
           <p className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-60">Resmi İş Ortağı</p>
           <div className="flex items-center justify-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all">
             {/* Simple text representation of iddaa logo for now */}
             <span className="font-black text-xl tracking-tighter text-white">iddaa<span className="text-primary">.com</span></span>
           </div>
        </div>
      </div>
    </div>
  );
}

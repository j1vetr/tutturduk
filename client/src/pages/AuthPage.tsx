import { useState } from "react";
import { useAuth, BAYI_KODU } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ChevronRight, Instagram, HelpCircle, ArrowRight, Info, Check, ShieldCheck, Wallet } from "lucide-react";
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
    
    const success = await login(username, codeToUse);

    if (success) {
      toast({
        description: "Giriş başarılı! Yönlendiriliyorsunuz...",
        className: "bg-green-500 text-white border-none font-bold",
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
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0 opacity-30 animate-in fade-in duration-1000"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-black/90 to-transparent" />

      {/* Header Content */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-16 pb-6 px-6 text-center space-y-4">
        <div className="relative">
           <div className="absolute -inset-4 bg-primary/20 blur-xl rounded-full animate-pulse" />
           <div className="w-20 h-20 bg-black/40 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl relative z-10">
              <img src={logoIcon} alt="Logo" className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
           </div>
        </div>
        
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-black text-white tracking-tight">
            TUTTURDUK<span className="text-primary">.COM</span>
          </h1>
          <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            Kazananların Özel Kulübü
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="flex-1 relative z-10 px-4 pb-8 flex flex-col justify-end sm:justify-center">
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-10 duration-500">
          
          {/* Tabs */}
          <div className="flex p-1 bg-black/40 rounded-xl mb-6 border border-white/5">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${isLogin ? 'bg-primary text-black shadow-lg' : 'text-muted-foreground hover:text-white'}`}
            >
              Giriş Yap
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${!isLogin ? 'bg-primary text-black shadow-lg' : 'text-muted-foreground hover:text-white'}`}
            >
              Kayıt Ol
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs text-muted-foreground ml-1">Kullanıcı Adı</Label>
              <Input 
                id="username" 
                placeholder="Örn: ahmet1905" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-black/20 border-white/10 focus:border-primary h-12 rounded-xl text-white placeholder:text-white/20"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-muted-foreground ml-1">Şifre</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/20 border-white/10 focus:border-primary h-12 rounded-xl text-white placeholder:text-white/20"
              />
            </div>

            {!isLogin && (
              <div className="space-y-4 pt-2">
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                  
                  <div className="flex items-center justify-between relative z-10">
                    <Label htmlFor="referral" className="text-primary font-bold text-sm flex items-center gap-2">
                      Davet Kodu Zorunludur
                    </Label>
                    
                    {/* How to get code Modal */}
                    <Dialog>
                      <DialogTrigger asChild>
                         <button className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded-full font-bold transition-colors flex items-center gap-1">
                           <HelpCircle className="w-3 h-3" />
                           Kodum Yok?
                         </button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md">
                        <DialogHeader>
                          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4 mx-auto text-primary">
                             <ShieldCheck className="w-6 h-6" />
                          </div>
                          <DialogTitle className="text-center text-xl font-display text-white">Davet Kodu Nasıl Alınır?</DialogTitle>
                          <DialogDescription className="text-center text-gray-400">
                            Platformumuz kapalı devre bir tahmin topluluğudur.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                           <div className="flex gap-4 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 mt-0.5">1</div>
                              <div className="space-y-1">
                                 <h4 className="font-bold text-sm text-white">iddaa.com Üyeliği</h4>
                                 <p className="text-xs text-gray-400 leading-relaxed">
                                   <span className="text-white font-bold">iddaa.com</span> üzerinden yeni üyelik oluştururken veya mevcut üyeliğinizde Bayi Kodu alanına <span className="text-primary font-bold text-base px-1">303603</span> yazıp kaydedin.
                                 </p>
                              </div>
                           </div>
                           
                           <div className="flex gap-4 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 mt-0.5">2</div>
                              <div className="space-y-1">
                                 <h4 className="font-bold text-sm text-white">Bize Ulaşın</h4>
                                 <p className="text-xs text-gray-400 leading-relaxed">
                                   İşlemi tamamladıktan sonra Instagram DM üzerinden bize yazın. Kontrol edip <span className="text-white font-bold">Size Özel Davet Kodunuzu</span> iletelim.
                                 </p>
                              </div>
                           </div>
                        </div>

                        <Button className="w-full gap-2 font-bold" onClick={() => window.open('https://instagram.com', '_blank')}>
                          <Instagram className="w-4 h-4" /> Instagram'dan Kod İste
                        </Button>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="relative">
                    <Input 
                      id="referral" 
                      placeholder="KOD GİRİNİZ" 
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      className="bg-black/40 border-primary/30 focus:border-primary h-14 rounded-lg font-mono text-center tracking-[0.5em] text-lg font-bold text-primary placeholder:text-muted-foreground/30 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full h-14 text-base font-bold rounded-xl bg-primary text-black hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(0,255,0,0.2)] mt-2">
              {isLogin ? "Giriş Yap" : "Hemen Başla"} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>

          {/* Info Section Trigger */}
          <div className="mt-6 pt-6 border-t border-white/5 flex justify-center">
             <Dialog>
               <DialogTrigger asChild>
                  <button className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-white transition-colors group">
                     <Info className="w-4 h-4 group-hover:text-primary transition-colors" />
                     <span>iddaa.com İş Birliği Nedir?</span>
                  </button>
               </DialogTrigger>
               <DialogContent className="bg-zinc-950 border-white/10 text-white">
                  <DialogHeader>
                     <DialogTitle className="flex items-center gap-2 text-xl">
                        <Wallet className="w-6 h-6 text-primary" />
                        Platform Hakkında
                     </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                     <p className="text-sm text-gray-300 leading-relaxed">
                        Bu platform, <strong className="text-white">iddaa.com</strong> resmi bayisi olan <span className="text-primary font-bold">303603</span> nolu bayi üyelerine özel geliştirilmiş bir <strong className="text-white">Premium Tahmin ve Analiz</strong> sistemidir.
                     </p>
                     
                     <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
                        <div className="flex gap-3">
                           <Check className="w-5 h-5 text-primary shrink-0" />
                           <p className="text-xs text-gray-400">Yapay zeka destekli maç analizlerine ücretsiz erişim.</p>
                        </div>
                        <div className="flex gap-3">
                           <Check className="w-5 h-5 text-primary shrink-0" />
                           <p className="text-xs text-gray-400">Uzman yorumcuların banko kupon tahminleri.</p>
                        </div>
                        <div className="flex gap-3">
                           <Check className="w-5 h-5 text-primary shrink-0" />
                           <p className="text-xs text-gray-400">Yüksek başarı oranlı sistem kuponları.</p>
                        </div>
                     </div>

                     <p className="text-xs text-gray-500 italic text-center pt-2">
                        *Platformumuzda bahis oynatılmaz, sadece yasal bayilerde oynayabileceğiniz tahminler paylaşılır.
                     </p>
                  </div>
               </DialogContent>
             </Dialog>
          </div>
        </div>

        <p className="text-center text-[10px] text-zinc-600 mt-6 pb-2 font-medium">
          &copy; 2025 Tutturduk.com - Tüm Hakları Saklıdır. <br/>
          <span className="opacity-75">Geliştirici & Tasarımcı : TOOV</span>
        </p>
      </div>
    </div>
  );
}

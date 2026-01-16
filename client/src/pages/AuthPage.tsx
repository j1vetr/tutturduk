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
    
    const success = await login(username, password, !isLogin, referralCode);

    if (success) {
      toast({
        description: "Giriş başarılı! Yönlendiriliyorsunuz...",
        className: "bg-emerald-500 text-white border-none font-bold",
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-100 rounded-full blur-[100px] -translate-y-1/2 opacity-50" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-100 rounded-full blur-[80px] translate-y-1/2 opacity-50" />
      </div>

      {/* Header Content */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-16 pb-6 px-6 text-center space-y-4">
        <div className="relative">
           <div className="absolute -inset-4 bg-emerald-200/50 blur-xl rounded-full animate-pulse" />
           <div className="w-20 h-20 bg-white backdrop-blur-md rounded-2xl flex items-center justify-center border border-gray-200 shadow-lg relative z-10">
              <img src={logoIcon} alt="Logo" className="w-12 h-12 object-contain" />
           </div>
        </div>
        
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-black text-gray-800 tracking-tight">
            TUTTURDUK<span className="text-emerald-500">.COM</span>
          </h1>
          <p className="text-gray-400 text-xs font-medium tracking-widest uppercase">
            Kazananların Özel Kulübü
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="flex-1 relative z-10 px-4 pb-8 flex flex-col justify-end sm:justify-center">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xl animate-in slide-in-from-bottom-10 duration-500">
          
          {/* Tabs */}
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${isLogin ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Giriş Yap
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${!isLogin ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Kayıt Ol
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs text-gray-500 ml-1">Kullanıcı Adı</Label>
              <Input 
                id="username" 
                placeholder="Örn: ahmet1905" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-gray-50 border-gray-200 focus:border-emerald-500 h-12 rounded-xl text-gray-800 placeholder:text-gray-300"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-gray-500 ml-1">Şifre</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-50 border-gray-200 focus:border-emerald-500 h-12 rounded-xl text-gray-800 placeholder:text-gray-300"
              />
            </div>

            {!isLogin && (
              <div className="space-y-4 pt-2">
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-3 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-100 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                  
                  <div className="flex items-center justify-between relative z-10">
                    <Label htmlFor="referral" className="text-emerald-700 font-bold text-sm flex items-center gap-2">
                      Davet Kodu Zorunludur
                    </Label>
                    
                    {/* How to get code Modal */}
                    <Dialog>
                      <DialogTrigger asChild>
                         <button className="text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2 py-1 rounded-full font-bold transition-colors flex items-center gap-1">
                           <HelpCircle className="w-3 h-3" />
                           Kodum Yok?
                         </button>
                      </DialogTrigger>
                      <DialogContent className="bg-white border-gray-200 text-gray-800 sm:max-w-md">
                        <DialogHeader>
                          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4 mx-auto text-emerald-600">
                             <ShieldCheck className="w-6 h-6" />
                          </div>
                          <DialogTitle className="text-center text-xl font-display text-gray-800">Davet Kodu Nasıl Alınır?</DialogTitle>
                          <DialogDescription className="text-center text-gray-500">
                            Platformumuz kapalı devre bir tahmin topluluğudur.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                           <div className="flex gap-4 items-start bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0 mt-0.5">1</div>
                              <div className="space-y-1">
                                 <h4 className="font-bold text-sm text-gray-800">iddaa.com Üyeliği</h4>
                                 <p className="text-xs text-gray-500 leading-relaxed">
                                   <span className="text-gray-800 font-bold">iddaa.com</span> üzerinden yeni üyelik oluştururken veya mevcut üyeliğinizde Bayi Kodu alanına <span className="text-emerald-600 font-bold text-base px-1">303603</span> yazıp kaydedin.
                                 </p>
                              </div>
                           </div>
                           
                           <div className="flex gap-4 items-start bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0 mt-0.5">2</div>
                              <div className="space-y-1">
                                 <h4 className="font-bold text-sm text-gray-800">Bize Ulaşın</h4>
                                 <p className="text-xs text-gray-500 leading-relaxed">
                                   İşlemi tamamladıktan sonra Instagram DM üzerinden bize yazın. Kontrol edip <span className="text-gray-800 font-bold">Size Özel Davet Kodunuzu</span> iletelim.
                                 </p>
                              </div>
                           </div>
                        </div>

                        <Button className="w-full gap-2 font-bold bg-emerald-500 hover:bg-emerald-600" onClick={() => window.open('https://instagram.com', '_blank')}>
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
                      className="bg-white border-emerald-200 focus:border-emerald-500 h-14 rounded-lg font-mono text-center tracking-[0.5em] text-lg font-bold text-emerald-600 placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full h-14 text-base font-bold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg mt-2">
              {isLogin ? "Giriş Yap" : "Hemen Başla"} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>

          {/* Info Section Trigger */}
          <div className="mt-6 pt-6 border-t border-gray-100 flex justify-center">
             <Dialog>
               <DialogTrigger asChild>
                  <button className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-800 transition-colors group">
                     <Info className="w-4 h-4 group-hover:text-emerald-500 transition-colors" />
                     <span>iddaa.com İş Birliği Nedir?</span>
                  </button>
               </DialogTrigger>
               <DialogContent className="bg-white border-gray-200 text-gray-800">
                  <DialogHeader>
                     <DialogTitle className="flex items-center gap-2 text-xl">
                        <Wallet className="w-6 h-6 text-emerald-500" />
                        Platform Hakkında
                     </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                     <p className="text-sm text-gray-600 leading-relaxed">
                        Bu platform, <strong className="text-gray-800">iddaa.com</strong> resmi bayisi olan <span className="text-emerald-600 font-bold">303603</span> nolu bayi üyelerine özel geliştirilmiş bir <strong className="text-gray-800">Premium Tahmin ve Analiz</strong> sistemidir.
                     </p>
                     
                     <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                        <div className="flex gap-3">
                           <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                           <p className="text-xs text-gray-600">Yapay zeka destekli maç analizlerine ücretsiz erişim.</p>
                        </div>
                        <div className="flex gap-3">
                           <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                           <p className="text-xs text-gray-600">Uzman yorumcuların banko kupon tahminleri.</p>
                        </div>
                        <div className="flex gap-3">
                           <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                           <p className="text-xs text-gray-600">Yüksek başarı oranlı sistem kuponları.</p>
                        </div>
                     </div>

                     <p className="text-xs text-gray-400 italic text-center pt-2">
                        *Platformumuzda bahis oynatılmaz, sadece yasal bayilerde oynayabileceğiniz tahminler paylaşılır.
                     </p>
                  </div>
               </DialogContent>
             </Dialog>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-6 pb-2 font-medium">
          &copy; 2025 Tutturduk.com - Tüm Hakları Saklıdır. <br/>
          <span className="opacity-75">Geliştirici & Tasarımcı : TOOV</span>
        </p>
      </div>
    </div>
  );
}

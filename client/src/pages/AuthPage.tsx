import { useState, useEffect } from "react";
import { useAuth, BAYI_KODU } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Instagram, Eye, EyeOff, Loader2, Shield, TrendingUp, BarChart3, Trophy, UserPlus, LogIn, AlertCircle, CheckCircle2, Sparkles, Gift, Copy, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoIcon from "@assets/generated_images/minimalist_sports_betting_logo_icon.png";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    setErrorMsg("");
  }, [isLogin]);

  const copyBayiCode = () => {
    navigator.clipboard.writeText(BAYI_KODU);
    setCopiedCode(true);
    toast({ description: "Bayi kodu kopyalandı!" });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Kullanıcı adı ve şifre zorunludur.");
      return;
    }

    if (username.trim().length < 3) {
      setErrorMsg("Kullanıcı adı en az 3 karakter olmalıdır.");
      return;
    }

    if (password.trim().length < 4) {
      setErrorMsg("Şifre en az 4 karakter olmalıdır.");
      return;
    }

    if (!isLogin && !referralCode.trim()) {
      setErrorMsg("Kayıt olmak için davet kodu zorunludur.");
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login(username.trim(), password, !isLogin, referralCode.trim());

      if (result.success) {
        toast({
          description: isLogin ? "Giriş başarılı! Hoş geldiniz." : "Kayıt başarılı! Hoş geldiniz.",
          className: "bg-emerald-500 text-white border-none font-semibold",
        });
        setLocation("/");
      } else {
        setErrorMsg(result.error || (isLogin ? "Kullanıcı adı veya şifre hatalı." : "Kayıt yapılamadı."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: TrendingUp, text: "Yapay zekâ tahminleri" },
    { icon: BarChart3, text: "Detaylı maç analizi" },
    { icon: Trophy, text: "Günlük kazanan kuponlar" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px]" />

      <div className="relative z-10 flex flex-col flex-1">
        
        <div className="flex flex-col items-center pt-12 pb-6 px-6">
          <div className="relative mb-5">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 rotate-3">
              <img src={logoIcon} alt="Logo" className="w-10 h-10 object-contain -rotate-3 brightness-0 invert" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-slate-900" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">
            TUTTURDUK<span className="text-emerald-400">.COM</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 text-center">
            Yapay zekâ destekli spor tahmin platformu
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                <f.icon className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] text-slate-300 font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 px-4 pb-8">
          <div className="bg-white rounded-t-3xl rounded-b-2xl max-w-md mx-auto shadow-2xl shadow-black/20 overflow-hidden">
            
            <div className="flex border-b border-slate-100">
              <button 
                data-testid="button-tab-login"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-4 text-sm font-bold transition-all relative flex items-center justify-center gap-2 ${
                  isLogin ? 'text-slate-800' : 'text-slate-400 hover:text-slate-500'
                }`}
              >
                <LogIn className="w-4 h-4" />
                Giriş yap
                {isLogin && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 rounded-full" />}
              </button>
              <button 
                data-testid="button-tab-register"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-4 text-sm font-bold transition-all relative flex items-center justify-center gap-2 ${
                  !isLogin ? 'text-slate-800' : 'text-slate-400 hover:text-slate-500'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Kayıt ol
                {!isLogin && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 rounded-full" />}
              </button>
            </div>

            <div className="p-5">
              {errorMsg && (
                <div data-testid="text-error" className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-3.5 py-3 rounded-xl mb-4 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Kullanıcı adı
                  </label>
                  <Input 
                    placeholder="Örnek: ahmet1905" 
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setErrorMsg(""); }}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-800 placeholder:text-slate-400 text-sm font-medium transition-colors"
                    data-testid="input-username"
                    autoComplete="username"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Şifre
                  </label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"}
                      placeholder="En az 4 karakter" 
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                      className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-800 placeholder:text-slate-400 pr-11 text-sm font-medium transition-colors"
                      data-testid="input-password"
                      autoComplete={isLogin ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Davet kodu
                      </label>
                      <Input 
                        placeholder="Davet kodunuzu girin" 
                        value={referralCode}
                        onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); setErrorMsg(""); }}
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-800 placeholder:text-slate-400 font-mono tracking-widest text-sm font-bold transition-colors"
                        data-testid="input-referral"
                        autoComplete="off"
                      />
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl overflow-hidden">
                      <div className="px-4 pt-4 pb-3">
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Gift className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">Davet kodunuz yok mu?</h4>
                            <p className="text-[10px] text-slate-500">Aşağıdaki adımları takip edin</p>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 pb-4 space-y-3">
                        <div className="bg-white rounded-xl p-3 border border-amber-100">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0">1</div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-800 mb-1">iddaa.com'a üye olun</p>
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                Üyelik oluştururken <strong>Bayi Kodu</strong> alanına aşağıdaki kodu yazın:
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 bg-emerald-50 border-2 border-emerald-200 border-dashed rounded-lg px-3 py-2 flex items-center justify-center">
                                  <span className="font-black text-lg text-emerald-700 tracking-wider font-mono">{BAYI_KODU}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={copyBayiCode}
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                                    copiedCode 
                                      ? 'bg-emerald-500 text-white' 
                                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                  }`}
                                >
                                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-amber-100">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0">2</div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-800 mb-1">Bize ulaşın</p>
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                Üyelik sonrası Instagram hesabımıza mesaj atın. Size özel davet kodunuzu hemen iletiyoruz.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-amber-100">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0">3</div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-800 mb-1">Kayıt olun</p>
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                Aldığınız davet kodunu yukarıdaki alana girin ve kayıt işlemini tamamlayın.
                              </p>
                            </div>
                          </div>
                        </div>

                        <button 
                          type="button"
                          className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
                          onClick={() => window.open('https://instagram.com', '_blank')}
                        >
                          <Instagram className="w-5 h-5" />
                          Instagram'dan bize yazın
                          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-sm font-bold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/25"
                    disabled={isLoading}
                    data-testid="button-submit"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {isLogin ? "Giriş yap" : "Kayıt ol"}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>

              <div className="mt-5 pt-5 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-500">
                  {isLogin ? "Hesabınız yok mu?" : "Zaten hesabınız var mı?"}
                  {' '}
                  <button 
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
                    data-testid="button-switch-mode"
                  >
                    {isLogin ? "Kayıt ol" : "Giriş yap"}
                  </button>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-medium">Güvenli giriş</span>
            </div>
            <div className="w-1 h-1 bg-slate-600 rounded-full" />
            <div className="flex items-center gap-1.5 text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-medium">256-bit SSL</span>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-600 mt-4">
            &copy; 2025 Tutturduk.com &mdash; Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </div>
  );
}

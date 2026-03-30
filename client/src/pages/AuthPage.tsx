import { useState, useEffect, useRef } from "react";
import { useAuth, BAYI_KODU } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, Instagram, Eye, EyeOff, Loader2, Shield,
  TrendingUp, BarChart3, Trophy, UserPlus, LogIn, AlertCircle,
  CheckCircle2, Gift, Copy, Check, ExternalLink, Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function AnimatedLogo() {
  const letters = "TUTTURDUK".split("");
  return (
    <div className="flex flex-col items-center mb-2">
      <div className="relative">
        <div className="absolute -inset-8 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="relative flex items-baseline gap-[2px]">
          {letters.map((letter, i) => (
            <span
              key={i}
              className="inline-block text-4xl font-black text-white"
              style={{
                animation: `letterBounce 2.5s ease-in-out ${i * 0.08}s infinite`,
                textShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
              }}
            >
              {letter}
            </span>
          ))}
          <span className="inline-block text-4xl font-black text-emerald-400" style={{ animation: `dotPulse 2.5s ease-in-out 0.72s infinite`, textShadow: '0 0 25px rgba(16, 185, 129, 0.6)' }}>.</span>
          <span className="inline-block text-4xl font-black text-emerald-400" style={{ animation: `letterBounce 2.5s ease-in-out 0.85s infinite`, textShadow: '0 0 25px rgba(16, 185, 129, 0.6)' }}>C</span>
          <span className="inline-block text-4xl font-black text-emerald-400" style={{ animation: `letterBounce 2.5s ease-in-out 0.93s infinite`, textShadow: '0 0 25px rgba(16, 185, 129, 0.6)' }}>O</span>
          <span className="inline-block text-4xl font-black text-emerald-400" style={{ animation: `letterBounce 2.5s ease-in-out 1.01s infinite`, textShadow: '0 0 25px rgba(16, 185, 129, 0.6)' }}>M</span>
        </div>
        <div className="h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full mt-2 mx-auto" style={{ animation: 'underlineGlow 2.5s ease-in-out infinite' }} />
      </div>
      <style>{`
        @keyframes letterBounce {
          0%, 100% { transform: translateY(0); }
          15% { transform: translateY(-6px); }
          30% { transform: translateY(0); }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          15% { transform: scale(1.5); opacity: 0.8; }
          30% { transform: scale(1); opacity: 1; }
        }
        @keyframes underlineGlow {
          0%, 100% { width: 40%; opacity: 0.3; }
          50% { width: 90%; opacity: 0.8; }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        @keyframes successPop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); }
          80% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes progressBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes floatBadge {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .animate-slide-up { animation: slideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-left { animation: slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-right { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-shake { animation: shakeX 0.5s ease-in-out; }
        .animate-success-pop { animation: successPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-scale { animation: fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-float-badge { animation: floatBadge 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function SuccessOverlay({ isLogin }: { isLogin: boolean }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white rounded-t-3xl rounded-b-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 rounded-full" style={{ animation: 'progressBar 2s linear forwards' }} />
      
      <div className="relative z-10 flex flex-col items-center gap-4 px-8 text-center">
        <div
          className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/40 animate-success-pop"
        >
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
          <h3 className="text-xl font-black text-slate-800 mb-1">
            {isLogin ? "Giriş Başarılı!" : "Hesap Oluşturuldu!"}
          </h3>
          <p className="text-sm text-slate-500">
            {isLogin ? "Hoş geldiniz, yönlendiriliyorsunuz…" : "Aramıza hoş geldiniz! Yönlendiriliyorsunuz…"}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-2 animate-slide-up" style={{ animationDelay: '0.35s', opacity: 0 }}>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.15s' }} />
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.3s' }} />
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5 animate-slide-up" style={{ animationDelay: '0.5s', opacity: 0 }}>
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span className="text-xs text-emerald-700 font-semibold">
            {isLogin ? "Ana sayfaya yönlendiriliyorsunuz" : "Tahminler sayfası açılıyor"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [shaking, setShaking] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    setErrorMsg("");
    setFormKey(k => k + 1);
  }, [isLogin]);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  };

  const copyBayiCode = () => {
    navigator.clipboard.writeText(BAYI_KODU);
    setCopiedCode(true);
    toast({
      description: "Bayi kodu kopyalandı!",
      className: "bg-emerald-500 text-white border-none font-semibold",
    });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTabSwitch = (toLogin: boolean) => {
    if (toLogin === isLogin) return;
    setIsLogin(toLogin);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Kullanıcı adı ve şifre zorunludur.");
      triggerShake();
      return;
    }
    if (username.trim().length < 3) {
      setErrorMsg("Kullanıcı adı en az 3 karakter olmalıdır.");
      triggerShake();
      return;
    }
    if (password.trim().length < 4) {
      setErrorMsg("Şifre en az 4 karakter olmalıdır.");
      triggerShake();
      return;
    }
    if (!isLogin && !referralCode.trim()) {
      setErrorMsg("Kayıt olmak için davet kodu zorunludur.");
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(username.trim(), password, !isLogin, referralCode.trim());
      if (result.success) {
        setIsSuccess(true);
        toast({
          title: isLogin ? "Giriş Başarılı!" : "Hesap Oluşturuldu!",
          description: isLogin
            ? "Hoş geldiniz. Ana sayfaya yönlendiriliyorsunuz."
            : "Aramıza hoş geldiniz! Tahminler sayfası açılıyor.",
          className: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-none font-semibold shadow-xl",
          duration: 3000,
        });
        setTimeout(() => setLocation("/"), 2000);
      } else {
        const msg = result.error || (isLogin ? "Kullanıcı adı veya şifre hatalı." : "Kayıt yapılamadı.");
        setErrorMsg(msg);
        triggerShake();
        toast({
          title: "İşlem Başarısız",
          description: msg,
          variant: "destructive",
          duration: 4000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: TrendingUp, text: "Yapay Zekâ Tahminleri" },
    { icon: BarChart3, text: "Detaylı Maç Analizi" },
    { icon: Trophy, text: "Günlük Kazanan Kuponlar" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px]" />

      <div className="relative z-10 flex flex-col flex-1">

        {/* Logo + Features */}
        <div className="flex flex-col items-center pt-10 pb-5 px-6">
          <AnimatedLogo />

          <p className="text-slate-400 text-sm mt-2 text-center">
            Yapay zekâ destekli spor tahmin platformu
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 animate-float-badge"
                style={{ animationDelay: `${i * 0.5}s` }}
              >
                <f.icon className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] text-slate-300 font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 px-4 pb-8">
          <div className="relative bg-white rounded-t-3xl rounded-b-2xl max-w-md mx-auto shadow-2xl shadow-black/20 overflow-hidden animate-fade-scale">

            {/* Success Overlay */}
            {isSuccess && <SuccessOverlay isLogin={isLogin} />}

            {/* Tab Switcher */}
            <div className="flex border-b border-slate-100">
              <button
                data-testid="button-tab-login"
                onClick={() => handleTabSwitch(true)}
                className={`flex-1 py-4 text-sm font-bold transition-all duration-300 relative flex items-center justify-center gap-2 ${
                  isLogin ? 'text-slate-800' : 'text-slate-400 hover:text-slate-500'
                }`}
              >
                <LogIn className="w-4 h-4" />
                Giriş Yap
                <div
                  className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ opacity: isLogin ? 1 : 0, transform: isLogin ? 'scaleX(1)' : 'scaleX(0)' }}
                />
              </button>
              <button
                data-testid="button-tab-register"
                onClick={() => handleTabSwitch(false)}
                className={`flex-1 py-4 text-sm font-bold transition-all duration-300 relative flex items-center justify-center gap-2 ${
                  !isLogin ? 'text-slate-800' : 'text-slate-400 hover:text-slate-500'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Kayıt Ol
                <div
                  className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ opacity: !isLogin ? 1 : 0, transform: !isLogin ? 'scaleX(1)' : 'scaleX(0)' }}
                />
              </button>
            </div>

            {/* Form */}
            <div className="p-5" key={formKey}>

              {/* Error Banner */}
              {errorMsg && (
                <div
                  data-testid="text-error"
                  className={`flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-3.5 py-3 rounded-xl mb-4 text-sm animate-slide-up ${shaking ? 'animate-shake' : ''}`}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className={`space-y-4 ${shaking ? 'animate-shake' : ''}`}>
                {/* Username */}
                <div
                  className="space-y-1.5 animate-slide-up"
                  style={{ animationDelay: '0.05s', opacity: 0 }}
                >
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Kullanıcı Adı
                  </label>
                  <Input
                    placeholder="Örnek: ahmet1905"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setErrorMsg(""); }}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-800 placeholder:text-slate-400 text-sm font-medium transition-all duration-200"
                    data-testid="input-username"
                    autoComplete="username"
                  />
                </div>

                {/* Password */}
                <div
                  className="space-y-1.5 animate-slide-up"
                  style={{ animationDelay: '0.1s', opacity: 0 }}
                >
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Şifre
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="En az 4 karakter"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                      className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-800 placeholder:text-slate-400 pr-11 text-sm font-medium transition-all duration-200"
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

                {/* Register extra fields */}
                {!isLogin && (
                  <div
                    className="space-y-3 pt-1 animate-slide-up"
                    style={{ animationDelay: '0.15s', opacity: 0 }}
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Davet Kodu
                      </label>
                      <Input
                        placeholder="Davet kodunuzu girin"
                        value={referralCode}
                        onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); setErrorMsg(""); }}
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-800 placeholder:text-slate-400 font-mono tracking-widest text-sm font-bold transition-all duration-200"
                        data-testid="input-referral"
                        autoComplete="off"
                      />
                    </div>

                    {/* Invite info card */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl overflow-hidden">
                      <div className="px-4 pt-4 pb-3">
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Gift className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">Davet Kodunuz Yok Mu?</h4>
                            <p className="text-[10px] text-slate-500">Aşağıdaki adımları takip edin</p>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 pb-4 space-y-3">
                        {/* Step 1 */}
                        <div className="bg-white rounded-xl p-3 border border-amber-100 animate-slide-up" style={{ animationDelay: '0.25s', opacity: 0 }}>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0">1</div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-800 mb-1">iddaa.com'a Üye Olun</p>
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
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                                    copiedCode ? 'bg-emerald-500 text-white scale-95' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:scale-105'
                                  }`}
                                >
                                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-white rounded-xl p-3 border border-amber-100 animate-slide-up" style={{ animationDelay: '0.32s', opacity: 0 }}>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0">2</div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-800 mb-1">Bize Ulaşın</p>
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                Üyelik sonrası Instagram hesabımıza mesaj atın. Size özel davet kodunuzu hemen iletiyoruz.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-white rounded-xl p-3 border border-amber-100 animate-slide-up" style={{ animationDelay: '0.39s', opacity: 0 }}>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0">3</div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-800 mb-1">Kayıt Olun</p>
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                Aldığınız davet kodunu yukarıdaki alana girin ve kayıt işlemini tamamlayın.
                              </p>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-purple-500/20 animate-slide-up"
                          style={{ animationDelay: '0.46s', opacity: 0 }}
                          onClick={() => window.open('https://instagram.com', '_blank')}
                        >
                          <Instagram className="w-5 h-5" />
                          Instagram'dan Bize Yazın
                          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div
                  className="pt-2 animate-slide-up"
                  style={{ animationDelay: isLogin ? '0.15s' : '0.52s', opacity: 0 }}
                >
                  <Button
                    type="submit"
                    className="w-full h-12 text-sm font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-emerald-500/25 relative overflow-hidden"
                    disabled={isLoading}
                    data-testid="button-submit"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{isLogin ? "Giriş yapılıyor…" : "Hesap oluşturuluyor…"}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        <span>{isLogin ? "Giriş Yap" : "Hesap Oluştur"}</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </div>
                    )}
                  </Button>
                </div>
              </form>

              {/* Switch mode link */}
              <div
                className="mt-5 pt-5 border-t border-slate-100 text-center animate-slide-up"
                style={{ animationDelay: isLogin ? '0.2s' : '0.58s', opacity: 0 }}
              >
                <p className="text-sm text-slate-500">
                  {isLogin ? "Hesabınız yok mu?" : "Zaten hesabınız var mı?"}
                  {' '}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch(!isLogin)}
                    className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
                    data-testid="button-switch-mode"
                  >
                    {isLogin ? "Kayıt Ol" : "Giriş Yap"}
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Bottom trust row */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-medium">Güvenli Giriş</span>
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

import { useState, useEffect } from "react";
import { useAuth, BAYI_KODU } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, Instagram, Eye, EyeOff, Loader2, Shield,
  UserPlus, LogIn, AlertCircle,
  CheckCircle2, Copy, Check, ExternalLink, Sparkles, KeyRound,
  Zap, Lock, Crown, Cpu, Radio, Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function AnimatedLogo() {
  const letters = "TUTTURDUK".split("");
  return (
    <div className="flex flex-col items-center mb-2">
      <div className="relative">
        <div className="absolute -inset-10 bg-emerald-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -inset-6 bg-blue-500/15 rounded-full blur-2xl" />
        <div className="relative flex items-baseline gap-[2px]">
          {letters.map((letter, i) => (
            <span
              key={i}
              className="inline-block text-[40px] font-black text-white"
              style={{
                animation: `letterBounce 2.5s ease-in-out ${i * 0.08}s infinite`,
                textShadow: '0 0 24px rgba(16, 185, 129, 0.55), 0 0 6px rgba(255,255,255,0.2)',
                letterSpacing: '0.02em',
              }}
            >
              {letter}
            </span>
          ))}
          <span className="inline-block text-[40px] font-black text-emerald-400" style={{ animation: `dotPulse 2.5s ease-in-out 0.72s infinite`, textShadow: '0 0 28px rgba(16, 185, 129, 0.8)' }}>.</span>
          <span className="inline-block text-[40px] font-black text-emerald-400" style={{ animation: `letterBounce 2.5s ease-in-out 0.85s infinite`, textShadow: '0 0 28px rgba(16, 185, 129, 0.8)' }}>C</span>
          <span className="inline-block text-[40px] font-black text-emerald-400" style={{ animation: `letterBounce 2.5s ease-in-out 0.93s infinite`, textShadow: '0 0 28px rgba(16, 185, 129, 0.8)' }}>O</span>
          <span className="inline-block text-[40px] font-black text-emerald-400" style={{ animation: `letterBounce 2.5s ease-in-out 1.01s infinite`, textShadow: '0 0 28px rgba(16, 185, 129, 0.8)' }}>M</span>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full mt-2 mx-auto" style={{ animation: 'underlineGlow 2.5s ease-in-out infinite' }} />
      </div>
      <style>{`
        @keyframes letterBounce {
          0%, 100% { transform: translateY(0); }
          15% { transform: translateY(-6px); }
          30% { transform: translateY(0); }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          15% { transform: scale(1.5); opacity: 0.85; }
          30% { transform: scale(1); opacity: 1; }
        }
        @keyframes underlineGlow {
          0%, 100% { width: 40%; opacity: 0.35; }
          50% { width: 95%; opacity: 0.95; }
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
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.25), 0 0 40px rgba(16, 185, 129, 0.1); }
          50% { box-shadow: 0 0 32px rgba(16, 185, 129, 0.45), 0 0 60px rgba(16, 185, 129, 0.2); }
        }
        @keyframes ticker {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes drawLine {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-slide-up { animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-left { animation: slideInLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-right { animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-shake { animation: shakeX 0.5s ease-in-out; }
        .animate-success-pop { animation: successPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-scale { animation: fadeInScale 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-float-badge { animation: floatBadge 3s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulseGlow 3s ease-in-out infinite; }
        .animate-ticker { animation: ticker 1.5s ease-in-out infinite; }
        .animate-spin-slow { animation: spinSlow 12s linear infinite; }
      `}</style>
    </div>
  );
}

function SuccessOverlay({ isLogin }: { isLogin: boolean }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl overflow-hidden backdrop-blur-2xl bg-black/85 border border-emerald-500/30">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-slate-950/90 to-blue-950/80" />
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" style={{ animation: 'progressBar 2s linear forwards' }} />

      <div className="relative z-10 flex flex-col items-center gap-4 px-8 text-center">
        <div className="relative">
          <div className="absolute -inset-6 bg-emerald-500/30 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/50 animate-success-pop ring-4 ring-emerald-400/20">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
          <h3 className="text-xl font-black text-white mb-1 tracking-tight">
            {isLogin ? "ERİŞİM ONAYLANDI" : "ELITE ÜYE OLDUNUZ"}
          </h3>
          <p className="text-sm text-slate-400">
            {isLogin ? "Sisteme bağlanılıyor…" : "Kapılar açılıyor, hoş geldiniz…"}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-2 animate-slide-up" style={{ animationDelay: '0.35s', opacity: 0 }}>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce shadow-lg shadow-emerald-400/50" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce shadow-lg shadow-emerald-400/50" style={{ animationDelay: '0.15s' }} />
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce shadow-lg shadow-emerald-400/50" style={{ animationDelay: '0.3s' }} />
        </div>

        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md rounded-2xl px-4 py-2.5 animate-slide-up" style={{ animationDelay: '0.5s', opacity: 0 }}>
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-emerald-300 font-semibold tracking-wide">
            {isLogin ? "Terminal başlatılıyor" : "AI veri akışı bağlanıyor"}
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
    { icon: Cpu, text: "AI Tahmin Motoru" },
    { icon: Activity, text: "Canlı Veri Akışı" },
    { icon: Crown, text: "Elite Kuponlar" },
  ];

  const steps = [
    {
      icon: ExternalLink,
      title: "iddaa.com'a Üye Olun",
      desc: "Üyelik formunda Bayi Kodu alanına aşağıdaki kodu girin.",
      hasCode: true,
    },
    {
      icon: Instagram,
      title: "Bize Ulaşın",
      desc: "Instagram'dan mesaj atın, size özel davet kodunuzu hemen iletelim.",
      hasCode: false,
    },
    {
      icon: KeyRound,
      title: "Kapıyı Açın",
      desc: "Aldığınız kodu yukarıdaki davet alanına girin ve sisteme katılın.",
      hasCode: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#05070a] flex flex-col relative overflow-hidden">
      {/* Background — terminal grid + nebula glows */}
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage: `linear-gradient(rgba(16,185,129,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.4) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
      }} />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-500/20 rounded-full blur-[140px]" />
      <div className="absolute bottom-[-5%] right-[-10%] w-[420px] h-[420px] bg-blue-600/15 rounded-full blur-[120px]" />
      <div className="absolute top-[40%] left-[-10%] w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px]" />

      {/* Top status bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-4 pb-2 text-[10px] font-mono">
        <div className="flex items-center gap-2 text-emerald-400/90">
          <div className="relative w-2 h-2 rounded-full bg-emerald-400 animate-ticker shadow-md shadow-emerald-400/60" />
          <span className="tracking-[0.2em]">SYS · ONLINE</span>
        </div>
        <div className="flex items-center gap-2 text-blue-300/80">
          <Radio className="w-3 h-3" />
          <span className="tracking-[0.2em]">SECURE · CHANNEL</span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col flex-1">

        {/* Logo + Features */}
        <div className="flex flex-col items-center pt-6 pb-5 px-6">
          <AnimatedLogo />

          <p className="text-slate-400 text-[13px] mt-2 text-center tracking-wide">
            <span className="text-emerald-400 font-mono text-[10px] uppercase tracking-[0.3em] mr-2">[ AI · POWERED ]</span>
            Spor tahmin terminali
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-white/[0.03] backdrop-blur-md border border-emerald-400/20 rounded-full px-3 py-1.5 animate-float-badge shadow-inner shadow-emerald-500/5"
                style={{ animationDelay: `${i * 0.5}s` }}
              >
                <f.icon className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] text-slate-200 font-semibold tracking-wide">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 px-4 pb-8">
          <div className="relative max-w-md mx-auto animate-fade-scale">
            {/* Outer glow ring */}
            <div className="absolute -inset-[1px] bg-gradient-to-br from-emerald-500/40 via-blue-500/20 to-emerald-500/40 rounded-[28px] blur-sm opacity-60" />

            <div className="relative rounded-[26px] bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-2xl border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] overflow-hidden">

              {/* Corner brackets — premium frame */}
              <div className="pointer-events-none absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-emerald-400/50 rounded-tl-lg" />
              <div className="pointer-events-none absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-emerald-400/50 rounded-tr-lg" />
              <div className="pointer-events-none absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-emerald-400/50 rounded-bl-lg" />
              <div className="pointer-events-none absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-emerald-400/50 rounded-br-lg" />

              {/* Success Overlay */}
              {isSuccess && <SuccessOverlay isLogin={isLogin} />}

              {/* Tab Switcher — Glass with sliding indicator */}
              <div className="relative px-3 pt-3">
                <div className="relative flex bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl p-1">
                  {/* Sliding glass pill */}
                  <div
                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 border border-emerald-400/40 shadow-lg shadow-emerald-500/20 backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{ left: isLogin ? '4px' : 'calc(50% + 0px)' }}
                  />
                  <button
                    data-testid="button-tab-login"
                    onClick={() => handleTabSwitch(true)}
                    className={`relative z-10 flex-1 py-3 text-[13px] font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                      isLogin ? 'text-emerald-300' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    Giriş Yap
                  </button>
                  <button
                    data-testid="button-tab-register"
                    onClick={() => handleTabSwitch(false)}
                    className={`relative z-10 flex-1 py-3 text-[13px] font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                      !isLogin ? 'text-emerald-300' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    Kayıt Ol
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-5 pt-4" key={formKey}>

                {/* Error Banner */}
                {errorMsg && (
                  <div
                    data-testid="text-error"
                    className={`flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 backdrop-blur-md text-red-300 px-3.5 py-3 rounded-xl mb-4 text-sm animate-slide-up ${shaking ? 'animate-shake' : ''}`}
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
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400/80 uppercase tracking-[0.2em] font-mono">
                      <span className="w-1 h-1 rounded-full bg-emerald-400" />
                      Kullanıcı Adı
                    </label>
                    <Input
                      placeholder="ahmet1905"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); setErrorMsg(""); }}
                      className="h-12 rounded-xl bg-black/40 border-white/10 hover:border-emerald-500/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 focus:bg-black/60 text-slate-100 placeholder:text-slate-600 text-sm font-medium transition-all duration-200 backdrop-blur-md"
                      data-testid="input-username"
                      autoComplete="username"
                    />
                  </div>

                  {/* Password */}
                  <div
                    className="space-y-1.5 animate-slide-up"
                    style={{ animationDelay: '0.1s', opacity: 0 }}
                  >
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400/80 uppercase tracking-[0.2em] font-mono">
                      <span className="w-1 h-1 rounded-full bg-emerald-400" />
                      Şifre
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                        className="h-12 rounded-xl bg-black/40 border-white/10 hover:border-emerald-500/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 focus:bg-black/60 text-slate-100 placeholder:text-slate-600 pr-11 text-sm font-medium transition-all duration-200 backdrop-blur-md"
                        data-testid="input-password"
                        autoComplete={isLogin ? "current-password" : "new-password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-400 transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Register extra fields */}
                  {!isLogin && (
                    <div
                      className="space-y-4 pt-1 animate-slide-up"
                      style={{ animationDelay: '0.15s', opacity: 0 }}
                    >
                      {/* Davet Kodu — Premium key slot */}
                      <div className="space-y-1.5">
                        <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] font-mono">
                          <span className="flex items-center gap-1.5 text-amber-400/90">
                            <KeyRound className="w-3 h-3" />
                            Davet Anahtarı
                          </span>
                          <span className="flex items-center gap-1 text-amber-400/60 text-[9px]">
                            <Lock className="w-2.5 h-2.5" />
                            ELITE
                          </span>
                        </label>
                        <div className="relative group">
                          {/* Golden glow on focus */}
                          <div className="absolute -inset-[1px] bg-gradient-to-r from-amber-500/0 via-amber-400/30 to-amber-500/0 rounded-xl opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-300" />
                          {/* Corner brackets */}
                          <div className="pointer-events-none absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-amber-400/40 rounded-tl" />
                          <div className="pointer-events-none absolute top-1.5 right-1.5 w-3 h-3 border-t border-r border-amber-400/40 rounded-tr" />
                          <div className="pointer-events-none absolute bottom-1.5 left-1.5 w-3 h-3 border-b border-l border-amber-400/40 rounded-bl" />
                          <div className="pointer-events-none absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-amber-400/40 rounded-br" />

                          <Input
                            placeholder="X X X X - X X X X"
                            value={referralCode}
                            onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); setErrorMsg(""); }}
                            className="relative h-14 rounded-xl bg-gradient-to-b from-amber-950/30 to-black/50 border-amber-400/20 hover:border-amber-400/40 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-500/20 text-amber-200 placeholder:text-amber-700/50 font-mono tracking-[0.5em] text-center text-base font-bold transition-all duration-200 backdrop-blur-md"
                            data-testid="input-referral"
                            autoComplete="off"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 text-center tracking-wide">
                          Bu sistem yalnızca davetli üyelere açıktır
                        </p>
                      </div>

                      {/* ELITE ERİŞİM REHBERİ */}
                      <div className="relative bg-gradient-to-br from-blue-950/40 via-slate-950/60 to-emerald-950/30 border border-emerald-500/20 rounded-2xl overflow-hidden backdrop-blur-md">
                        {/* Top header strip */}
                        <div className="relative bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-emerald-500/10 border-b border-white/5 px-4 py-3 overflow-hidden">
                          <div className="absolute inset-0 opacity-30" style={{
                            backgroundImage: `linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)`,
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 4s linear infinite',
                          }} />
                          <div className="relative flex items-center gap-2.5">
                            <div className="relative">
                              <div className="absolute -inset-1 bg-amber-400/40 blur-md rounded-full" />
                              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                <Crown className="w-4 h-4 text-amber-950" strokeWidth={2.5} />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-[13px] font-black text-white tracking-wide">ELITE ERİŞİM REHBERİ</h4>
                              </div>
                              <p className="text-[10px] text-emerald-300/70 font-mono tracking-wider">3 ADIM · ~2 DK</p>
                            </div>
                            <div className="text-[9px] font-bold text-amber-300/80 font-mono bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-md">
                              VIP
                            </div>
                          </div>
                        </div>

                        {/* Quest roadmap */}
                        <div className="relative px-4 py-4">
                          {/* Vertical glowing connector line */}
                          <div className="absolute left-[27px] top-7 bottom-7 w-[2px] bg-gradient-to-b from-emerald-400/60 via-blue-400/40 to-amber-400/60" />
                          <div className="absolute left-[26px] top-7 bottom-7 w-[4px] bg-gradient-to-b from-emerald-400/30 via-blue-400/20 to-amber-400/30 blur-sm" />

                          <div className="space-y-3">
                            {steps.map((step, idx) => {
                              const Icon = step.icon;
                              return (
                                <div
                                  key={idx}
                                  className="relative animate-slide-up"
                                  style={{ animationDelay: `${0.25 + idx * 0.08}s`, opacity: 0 }}
                                >
                                  <div className="flex items-start gap-3">
                                    {/* Quest node */}
                                    <div className="relative flex-shrink-0">
                                      <div className="absolute -inset-1 bg-emerald-400/30 rounded-full blur-md" />
                                      <div className="relative w-[34px] h-[34px] rounded-full bg-gradient-to-br from-slate-800 to-slate-950 border-2 border-emerald-400/50 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                        <Icon className="w-4 h-4 text-emerald-300" strokeWidth={2.5} />
                                      </div>
                                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0a0e13] flex items-center justify-center text-[9px] font-black text-white">
                                        {idx + 1}
                                      </div>
                                    </div>

                                    {/* Quest content */}
                                    <div className="flex-1 pt-0.5">
                                      <p className="text-[12px] font-bold text-white tracking-tight mb-0.5">{step.title}</p>
                                      <p className="text-[11px] text-slate-400 leading-relaxed">{step.desc}</p>

                                      {step.hasCode && (
                                        <div className="mt-2.5 relative">
                                          {/* Bayi kodu terminal display */}
                                          <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/40 via-emerald-300/60 to-emerald-500/40 rounded-xl blur-md animate-pulse-glow" />
                                          <div className="relative flex items-center gap-2 bg-black/70 border border-emerald-400/40 rounded-xl p-1.5 backdrop-blur-md">
                                            <div className="flex-1 relative bg-gradient-to-br from-emerald-950/80 to-black rounded-lg px-3 py-2.5 overflow-hidden">
                                              <div className="absolute top-1.5 left-2 text-[8px] font-mono text-emerald-500/60 tracking-[0.3em]">BAYİ · KODU</div>
                                              <div className="flex items-baseline justify-center gap-2 mt-1">
                                                <span className="font-black text-2xl text-emerald-300 tracking-[0.25em] font-mono" style={{ textShadow: '0 0 16px rgba(52, 211, 153, 0.7), 0 0 4px rgba(255,255,255,0.3)' }}>
                                                  {BAYI_KODU}
                                                </span>
                                              </div>
                                              {/* Scanline */}
                                              <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" style={{ animation: 'scanline 3s linear infinite', top: 0 }} />
                                            </div>
                                            <button
                                              type="button"
                                              onClick={copyBayiCode}
                                              data-testid="button-copy-bayi"
                                              className={`flex-shrink-0 w-12 h-[52px] rounded-lg flex items-center justify-center transition-all duration-300 ${
                                                copiedCode
                                                  ? 'bg-emerald-500 text-white scale-95 shadow-lg shadow-emerald-500/40'
                                                  : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 hover:scale-105 border border-emerald-400/30'
                                              }`}
                                            >
                                              {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            className="w-full mt-4 group relative flex items-center justify-center gap-2.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl text-[13px] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-purple-500/30 overflow-hidden animate-slide-up"
                            style={{ animationDelay: '0.5s', opacity: 0 }}
                            onClick={() => window.open('https://instagram.com', '_blank')}
                            data-testid="button-instagram"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{
                              transform: 'translateX(-100%)',
                              animation: 'shimmer 3s ease-in-out infinite',
                            }} />
                            <Instagram className="w-5 h-5 relative" />
                            <span className="relative tracking-wide">Instagram'dan Davet İste</span>
                            <ExternalLink className="w-3.5 h-3.5 opacity-80 relative" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div
                    className="pt-2 animate-slide-up"
                    style={{ animationDelay: isLogin ? '0.15s' : '0.55s', opacity: 0 }}
                  >
                    <Button
                      type="submit"
                      className="group w-full h-14 py-4 text-sm font-black rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 text-emerald-950 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] transition-all duration-200 shadow-[0_10px_40px_-10px_rgba(16,185,129,0.6)] hover:shadow-[0_15px_50px_-10px_rgba(16,185,129,0.8)] relative overflow-hidden tracking-wide"
                      disabled={isLoading}
                      data-testid="button-submit"
                    >
                      {/* Shimmer overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" style={{
                        transform: 'translateX(-100%)',
                        animation: 'shimmer 2.5s ease-in-out infinite',
                      }} />
                      {isLoading ? (
                        <div className="relative flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>{isLogin ? "BAĞLANIYOR…" : "AKTIVE EDİLİYOR…"}</span>
                        </div>
                      ) : (
                        <div className="relative flex items-center justify-center gap-2">
                          {isLogin ? <Zap className="w-4 h-4" strokeWidth={2.5} /> : <KeyRound className="w-4 h-4" strokeWidth={2.5} />}
                          <span>{isLogin ? "TERMİNALİ BAŞLAT" : "ELİTE ÜYE OL"}</span>
                          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </Button>
                  </div>
                </form>

                {/* Switch mode link */}
                <div
                  className="mt-5 pt-5 border-t border-white/5 text-center animate-slide-up"
                  style={{ animationDelay: isLogin ? '0.2s' : '0.6s', opacity: 0 }}
                >
                  <p className="text-[12px] text-slate-500">
                    {isLogin ? "Henüz davetli değil misiniz?" : "Zaten içeriden misiniz?"}
                    {' '}
                    <button
                      type="button"
                      onClick={() => handleTabSwitch(!isLogin)}
                      className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors underline-offset-4 hover:underline"
                      data-testid="button-switch-mode"
                    >
                      {isLogin ? "Davet İste" : "Giriş Yap"}
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom trust row */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-mono tracking-[0.15em] uppercase">Encrypted</span>
            </div>
            <div className="w-1 h-1 bg-slate-700 rounded-full" />
            <div className="flex items-center gap-1.5 text-slate-500">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-mono tracking-[0.15em] uppercase">256-bit SSL</span>
            </div>
            <div className="w-1 h-1 bg-slate-700 rounded-full" />
            <div className="flex items-center gap-1.5 text-slate-500">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-mono tracking-[0.15em] uppercase">AI Core</span>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-600 mt-4 font-mono tracking-wider">
            &copy; 2025 · TUTTURDUK.COM · ELITE ACCESS PROTOCOL
          </p>
        </div>
      </div>
    </div>
  );
}

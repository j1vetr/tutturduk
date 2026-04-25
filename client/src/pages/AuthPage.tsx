import { useState, useEffect } from "react";
import { useAuth, BAYI_KODU } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, Instagram, Eye, EyeOff, Loader2,
  UserPlus, LogIn, AlertCircle,
  CheckCircle2, Copy, Check, ArrowUpRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoLight from "@assets/tutturduk_1777158124987.png";

function SuccessOverlay({ isLogin }: { isLogin: boolean }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[20px] overflow-hidden bg-[#0a0a0c]/95 backdrop-blur-xl border border-white/[0.06]">
      <div className="absolute top-0 left-0 right-0 h-px bg-emerald-400/40" style={{ animation: 'progressBar 2s linear forwards' }} />
      <div className="relative flex flex-col items-center gap-5 px-8 text-center">
        <div className="relative animate-success-pop">
          <div className="absolute -inset-3 bg-emerald-500/15 rounded-full blur-xl" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-950" strokeWidth={2.5} />
          </div>
        </div>
        <div className="animate-slide-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
          <h3 className="font-serif text-3xl text-white mb-1.5 leading-tight">
            {isLogin ? "Welcome back." : "Access granted."}
          </h3>
          <p className="text-[13px] text-white/50 font-light tracking-wide">
            {isLogin ? "Yönlendiriliyorsunuz…" : "Hoş geldiniz, panel hazırlanıyor…"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-1 animate-slide-up" style={{ animationDelay: '0.35s', opacity: 0 }}>
          <div className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0.15s' }} />
          <div className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0.3s' }} />
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
      description: "Bayi kodu panoya kopyalandı",
      className: "bg-[#14141a] text-white border border-white/10 font-medium",
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
      setErrorMsg("Kayıt için geçerli bir davet kodu gereklidir.");
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(username.trim(), password, !isLogin, referralCode.trim());
      if (result.success) {
        setIsSuccess(true);
        toast({
          title: isLogin ? "Giriş başarılı" : "Hesap oluşturuldu",
          description: isLogin
            ? "Yönlendiriliyorsunuz."
            : "Aramıza hoş geldiniz.",
          className: "bg-[#14141a] text-white border border-white/10 font-medium",
          duration: 3000,
        });
        setTimeout(() => setLocation("/"), 2000);
      } else {
        const msg = result.error || (isLogin ? "Kullanıcı adı veya şifre hatalı." : "Kayıt yapılamadı.");
        setErrorMsg(msg);
        triggerShake();
        toast({
          title: "İşlem başarısız",
          description: msg,
          variant: "destructive",
          duration: 4000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white relative overflow-x-hidden font-sans">
      {/* Global styles + noise texture */}
      <style>{`
        @keyframes slideInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); } 30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); } 60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); } 90% { transform: translateX(2px); }
        }
        @keyframes successPop {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.985); } to { opacity: 1; transform: scale(1); } }
        @keyframes progressBar { from { width: 0%; } to { width: 100%; } }
        @keyframes subtleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-slide-up { animation: slideInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-shake { animation: shakeX 0.5s ease-in-out; }
        .animate-success-pop { animation: successPop 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-fade-scale { animation: fadeInScale 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .font-serif-display { font-family: 'Fraunces', 'Georgia', serif; font-weight: 400; letter-spacing: -0.025em; font-optical-sizing: auto; }
        .input-inset {
          background: #131316;
          box-shadow:
            inset 0 1px 0 0 rgba(255,255,255,0.03),
            inset 0 0 0 1px rgba(255,255,255,0.04),
            0 1px 0 0 rgba(255,255,255,0.02);
        }
        .input-inset:hover {
          box-shadow:
            inset 0 1px 0 0 rgba(255,255,255,0.04),
            inset 0 0 0 1px rgba(255,255,255,0.07),
            0 1px 0 0 rgba(255,255,255,0.02);
        }
        .input-inset:focus, .input-inset:focus-within {
          background: #16161a;
          box-shadow:
            inset 0 1px 0 0 rgba(255,255,255,0.05),
            inset 0 0 0 1px rgba(52, 211, 153, 0.35),
            0 0 0 4px rgba(52, 211, 153, 0.06);
          outline: none;
        }
        .bento-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.005) 100%);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow:
            inset 0 1px 0 0 rgba(255,255,255,0.04),
            0 1px 2px 0 rgba(0,0,0,0.3);
        }
        .reveal-on-hover { opacity: 0; transition: opacity 0.25s ease; }
        .reveal-parent:hover .reveal-on-hover,
        .reveal-parent:focus-within .reveal-on-hover { opacity: 1; }
        .noise-overlay {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.4 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .tab-indicator {
          background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
          box-shadow:
            inset 0 1px 0 0 rgba(255,255,255,0.1),
            inset 0 0 0 1px rgba(255,255,255,0.06),
            0 1px 2px 0 rgba(0,0,0,0.4);
        }
      `}</style>

      {/* Background — soft radial wash + noise + horizontal divider */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d10] via-[#0a0a0c] to-[#08080a]" />
        <div className="absolute top-0 left-0 right-0 h-[60vh] opacity-[0.5]" style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(52, 211, 153, 0.06), transparent 70%)'
        }} />
        <div className="absolute inset-0 noise-overlay opacity-[0.025] mix-blend-overlay" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-4 sm:px-6 pt-4 pb-8 max-w-[480px] mx-auto">

        {/* Logo + heading */}
        <div className="w-full flex flex-col items-center text-center pt-4 pb-7 animate-fade-in">
          <img
            src={logoLight}
            alt="tutturduk"
            className="h-16 sm:h-20 w-auto object-contain mb-9 opacity-95"
          />

          <h1 className="font-serif-display text-[40px] sm:text-[44px] leading-[1.05] text-white mb-3 px-2">
            Spor verisinin<br/>
            <span className="italic text-white/85">analitik merkezi.</span>
          </h1>
          <p className="text-[13.5px] text-white/45 font-light leading-relaxed max-w-[320px] tracking-[0.005em]">
            Yapay zeka destekli maç tahminleri, davetli üyelere özel.
          </p>
        </div>

        {/* Auth card — main bento */}
        <div className="relative w-full animate-fade-scale">
          <div className="relative bento-card rounded-[22px] overflow-hidden">

            {/* Success overlay */}
            {isSuccess && <SuccessOverlay isLogin={isLogin} />}

            {/* Tab switcher */}
            <div className="px-5 pt-5">
              <div className="relative grid grid-cols-2 bg-[#0e0e11] rounded-xl p-1 border border-white/[0.04]">
                <div
                  className="absolute top-1 bottom-1 rounded-lg tab-indicator transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    width: 'calc(50% - 4px)',
                    left: isLogin ? '4px' : 'calc(50% + 0px)',
                  }}
                />
                <button
                  data-testid="button-tab-login"
                  onClick={() => handleTabSwitch(true)}
                  className={`relative z-10 py-2.5 text-[12.5px] font-medium tracking-wide transition-colors duration-300 flex items-center justify-center gap-1.5 ${
                    isLogin ? 'text-white' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" strokeWidth={2} />
                  Giriş
                </button>
                <button
                  data-testid="button-tab-register"
                  onClick={() => handleTabSwitch(false)}
                  className={`relative z-10 py-2.5 text-[12.5px] font-medium tracking-wide transition-colors duration-300 flex items-center justify-center gap-1.5 ${
                    !isLogin ? 'text-white' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" strokeWidth={2} />
                  Üyelik Başvurusu
                </button>
              </div>
            </div>

            {/* Form area */}
            <div className="px-5 py-5" key={formKey}>

              {/* Header text */}
              <div className="mb-5 animate-slide-up" style={{ animationDelay: '0.05s', opacity: 0 }}>
                <h2 className="font-serif-display text-[26px] text-white leading-tight">
                  {isLogin ? "Hesabınıza giriş yapın" : "Üyelik başvurusu"}
                </h2>
                <p className="text-[12px] text-white/40 mt-1.5 font-light">
                  {isLogin
                    ? "Bilgilerinizi girerek panele erişin."
                    : "Bu site davetli üyelere açıktır. Devam etmek için davet kodunuzu kullanın."}
                </p>
              </div>

              {errorMsg && (
                <div
                  data-testid="text-error"
                  className={`flex items-start gap-2.5 bg-red-500/[0.06] border border-red-500/20 text-red-200/90 px-3.5 py-3 rounded-xl mb-4 text-[12.5px] animate-slide-up ${shaking ? 'animate-shake' : ''}`}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" strokeWidth={2} />
                  <span className="font-medium leading-relaxed">{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className={`space-y-3.5 ${shaking ? 'animate-shake' : ''}`}>
                {/* Username */}
                <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.08s', opacity: 0 }}>
                  <label className="block text-[10.5px] font-medium tracking-[0.14em] uppercase text-white/45">
                    Kullanıcı Adı
                  </label>
                  <Input
                    placeholder="ahmet1905"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setErrorMsg(""); }}
                    className="input-inset h-12 rounded-xl border-0 text-white placeholder:text-white/25 text-[14px] font-normal transition-all duration-200 px-4"
                    data-testid="input-username"
                    autoComplete="username"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.13s', opacity: 0 }}>
                  <label className="block text-[10.5px] font-medium tracking-[0.14em] uppercase text-white/45">
                    Şifre
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                      className="input-inset h-12 rounded-xl border-0 text-white placeholder:text-white/25 text-[14px] font-normal pr-11 transition-all duration-200 px-4"
                      data-testid="input-password"
                      autoComplete={isLogin ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/65 transition-colors p-1"
                      tabIndex={-1}
                      aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={2} /> : <Eye className="w-4 h-4" strokeWidth={2} />}
                    </button>
                  </div>
                </div>

                {/* Register-only fields */}
                {!isLogin && (
                  <>
                    {/* Davet Kodu — private members style */}
                    <div className="space-y-2 pt-1 animate-slide-up" style={{ animationDelay: '0.18s', opacity: 0 }}>
                      <div className="flex items-center justify-between">
                        <label className="block text-[10.5px] font-medium tracking-[0.14em] uppercase text-white/45">
                          Davet Kodu
                        </label>
                        <span className="text-[10px] text-white/25 italic font-serif-display">By invitation</span>
                      </div>
                      <Input
                        placeholder="——————"
                        value={referralCode}
                        onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); setErrorMsg(""); }}
                        className="input-inset h-12 rounded-xl border-0 text-white placeholder:text-white/20 text-[15px] font-medium tracking-[0.4em] text-center transition-all duration-200 px-4 uppercase"
                        style={{ fontFamily: "'JetBrains Mono', 'Geist Mono', ui-monospace, monospace" }}
                        data-testid="input-referral"
                        autoComplete="off"
                      />
                    </div>
                  </>
                )}

                {/* Submit Button */}
                <div className="pt-2 animate-slide-up" style={{ animationDelay: isLogin ? '0.18s' : '0.23s', opacity: 0 }}>
                  <Button
                    type="submit"
                    className="group w-full h-12 text-[13.5px] font-medium rounded-xl bg-white text-[#0a0a0c] hover:bg-white/95 active:scale-[0.99] transition-all duration-200 relative tracking-tight"
                    disabled={isLoading}
                    data-testid="button-submit"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isLogin ? "Giriş yapılıyor" : "Hesap oluşturuluyor"}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span>{isLogin ? "Hesabıma Giriş" : "Başvuruyu Tamamla"}</span>
                        <ArrowRight className="w-4 h-4 ml-0.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                      </div>
                    )}
                  </Button>
                </div>
              </form>

              {/* Switch link */}
              <div className="mt-5 pt-4 border-t border-white/[0.05] text-center animate-slide-up" style={{ animationDelay: isLogin ? '0.23s' : '0.28s', opacity: 0 }}>
                <p className="text-[12px] text-white/40 font-light">
                  {isLogin ? "Henüz üye değil misiniz?" : "Zaten üye misiniz?"}
                  {' '}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch(!isLogin)}
                    className="text-white/85 font-medium hover:text-white transition-colors underline decoration-white/20 underline-offset-[5px] hover:decoration-white/60"
                    data-testid="button-switch-mode"
                  >
                    {isLogin ? "Üyelik başvurusu" : "Giriş yapın"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* INVITATION GUIDE — Bento — only on register */}
        {!isLogin && (
          <div className="w-full mt-3 space-y-3 animate-slide-up" style={{ animationDelay: '0.3s', opacity: 0 }}>

            {/* Section label */}
            <div className="flex items-baseline justify-between px-1 pt-3 pb-1">
              <h3 className="font-serif-display text-[22px] text-white/95 leading-none">
                Davet kodu nasıl alınır?
              </h3>
              <span className="text-[10px] text-white/30 uppercase tracking-[0.16em] font-medium">3 Adım</span>
            </div>
            <p className="px-1 text-[12.5px] text-white/40 font-light leading-relaxed -mt-1.5 mb-1">
              Aşağıdaki süreci tamamlayarak davet kodunuzu alabilirsiniz.
            </p>

            {/* Step 1 — Bayi Kodu (bank-statement style module) */}
            <div className="bento-card rounded-2xl p-5 reveal-parent">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/35 font-medium mb-1">01 · iddaa.com</div>
                  <div className="font-serif-display text-[19px] text-white leading-tight">Üye olun</div>
                </div>
                <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 text-[11px] font-medium">
                  01
                </div>
              </div>

              {/* Bank-statement-style code module */}
              <div className="bg-[#0a0a0c] border border-white/[0.05] rounded-xl px-4 py-3.5 mb-3 relative">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[9.5px] uppercase tracking-[0.18em] text-white/35 font-medium mb-1.5">Bayi Kodu</div>
                    <div
                      data-testid="text-bayi-kodu"
                      className="text-white text-[22px] font-medium tracking-[0.18em] leading-none"
                      style={{ fontFamily: "'JetBrains Mono', 'Geist Mono', ui-monospace, 'SF Mono', monospace" }}
                    >
                      {BAYI_KODU}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={copyBayiCode}
                    data-testid="button-copy-bayi"
                    className={`reveal-on-hover w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                      copiedCode
                        ? 'bg-emerald-500 text-emerald-950 opacity-100'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white/70'
                    }`}
                    aria-label="Bayi kodunu kopyala"
                  >
                    {copiedCode ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={2} />}
                  </button>
                </div>
              </div>

              <p className="text-[12px] text-white/45 font-light leading-relaxed">
                iddaa.com kayıt formundaki <span className="text-white/70 font-medium">Bayi Kodu</span> alanına yukarıdaki kodu girerek üyeliğinizi tamamlayın.
              </p>
            </div>

            {/* Step 2 — Contact */}
            <div className="bento-card rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/35 font-medium mb-1">02 · Instagram</div>
                  <div className="font-serif-display text-[19px] text-white leading-tight">Bizimle iletişime geçin</div>
                </div>
                <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 text-[11px] font-medium">
                  02
                </div>
              </div>
              <p className="text-[12px] text-white/45 font-light leading-relaxed mb-3.5">
                iddaa üyeliğiniz tamamlandıktan sonra Instagram hesabımıza mesaj atın. Üyeliğiniz doğrulandıktan sonra size özel davet kodunuz iletilecektir.
              </p>
              <button
                type="button"
                onClick={() => window.open('https://instagram.com', '_blank')}
                data-testid="button-instagram"
                className="group w-full h-11 flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-white/15 rounded-xl text-[12.5px] text-white/85 font-medium tracking-tight transition-all duration-200"
              >
                <Instagram className="w-4 h-4" strokeWidth={2} />
                Instagram'da bize ulaşın
                <ArrowUpRight className="w-3.5 h-3.5 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
              </button>
            </div>

            {/* Step 3 — Activate */}
            <div className="bento-card rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/35 font-medium mb-1">03 · Erişim</div>
                  <div className="font-serif-display text-[19px] text-white leading-tight">Kodu girin, panele girin</div>
                </div>
                <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 text-[11px] font-medium">
                  03
                </div>
              </div>
              <p className="text-[12px] text-white/45 font-light leading-relaxed">
                Aldığınız davet kodunu yukarıdaki başvuru formuna girerek hesabınızı oluşturun ve panele erişim sağlayın.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="w-full mt-8 pt-5 border-t border-white/[0.04] text-center">
          <p className="text-[11px] text-white/40 font-medium tracking-wide flex items-center justify-center gap-2.5 flex-wrap">
            <a
              href="https://instagram.com/tutturduk_com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/65 hover:text-white transition-colors"
              data-testid="link-instagram-footer"
            >
              @tutturduk_com
            </a>
            <span className="text-white/20">|</span>
            <span>18 yaş altı kullanıcılar için uygun değildir.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

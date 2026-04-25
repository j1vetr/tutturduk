import { MobileLayout } from "@/components/MobileLayout";
import { useAuth, BAYI_KODU } from "@/lib/auth";
import { LogOut, Shield, Settings, ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const initial = user?.username?.[0]?.toUpperCase() || "·";

  function copyBayi() {
    navigator.clipboard.writeText(BAYI_KODU);
    setCopied(true);
    toast({ description: "Bayi kodu kopyalandı" });
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <MobileLayout activeTab="profile">
      <div className="space-y-7 pt-3">
        {/* MASTHEAD */}
        <header className="pt-2">
          <span className="label-meta-sm">Profil</span>
          <h1 className="font-serif-display text-[30px] text-white leading-[1.05] mt-2 -tracking-[0.02em]">
            <span className="italic text-white/85">Hoş geldin</span>, {user?.username}.
          </h1>
        </header>

        {/* IDENTITY */}
        <section className="premium-card-elevated rounded-[20px] p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full border border-white/[0.10] bg-white/[0.03] flex items-center justify-center">
              <span className="font-serif-display text-[22px] text-white italic">{initial}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-serif-display text-[20px] text-white leading-none -tracking-[0.005em]">
                {user?.username}
              </span>
              <div className="flex items-center gap-2 mt-2">
                <span className="label-meta-sm">Üye ID</span>
                <span className="text-[11px] text-white/55 num-display">#{String(user?.id || 0).padStart(4, "0")}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/[0.06] my-5" />

          {/* Bayi kodu */}
          <button
            onClick={copyBayi}
            className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
            data-testid="button-copy-bayi"
          >
            <div className="flex flex-col items-start gap-1">
              <span className="label-meta-sm">Bayi Kodu</span>
              <span className="num-display text-[24px] text-white tracking-tight leading-none">{BAYI_KODU}</span>
            </div>
            <span className="text-[10.5px] text-white/55 uppercase tracking-[0.14em] font-medium">
              {copied ? "Kopyalandı" : "Kopyala"}
            </span>
          </button>
        </section>

        {/* MENU */}
        <section>
          <SectionLabel left="Hesap" />
          <div className="premium-card rounded-[18px] divide-y divide-white/[0.05] overflow-hidden">
            {user?.role === "admin" && (
              <MenuRow
                icon={<Settings className="w-[15px] h-[15px] text-white/65" strokeWidth={1.6} />}
                label="Yönetim Paneli"
                onClick={() => (window.location.href = "/admin")}
                testId="link-admin"
              />
            )}
            <MenuRow
              icon={<Shield className="w-[15px] h-[15px] text-white/65" strokeWidth={1.6} />}
              label="Gizlilik & Güvenlik"
              hint="Yakında"
              testId="link-privacy"
            />
            <MenuRow
              icon={<ExternalLink className="w-[15px] h-[15px] text-white/65" strokeWidth={1.6} />}
              label="Instagram"
              hint="@tutturduk_com"
              onClick={() => window.open("https://instagram.com/tutturduk_com", "_blank")}
              testId="link-instagram"
            />
          </div>
        </section>

        {/* LOGOUT */}
        <button
          onClick={logout}
          className="w-full premium-card rounded-[18px] py-4 px-5 flex items-center justify-center gap-2.5 hover:bg-white/[0.025] transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="w-[15px] h-[15px] text-white/55" strokeWidth={1.6} />
          <span className="text-[13px] text-white/85 font-medium tracking-wide">Çıkış Yap</span>
        </button>

        {/* FOOTER */}
        <div className="text-center pt-2 pb-2">
          <span className="label-meta-sm font-serif-display italic text-white/30 normal-case tracking-normal">
            tutturduk · veri merkezi
          </span>
        </div>
      </div>
    </MobileLayout>
  );
}

function SectionLabel({ left }: { left: string }) {
  return (
    <div className="px-1 mb-3">
      <span className="label-meta">{left}</span>
    </div>
  );
}

function MenuRow({ icon, label, hint, onClick, testId }: { icon: React.ReactNode; label: string; hint?: string; onClick?: () => void; testId?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors text-left disabled:cursor-default"
      disabled={!onClick}
      data-testid={testId}
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          {icon}
        </div>
        <span className="text-[13.5px] text-white/90 font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {hint && <span className="text-[11px] text-white/40 num-display">{hint}</span>}
        <ChevronRight className="w-3.5 h-3.5 text-white/25" strokeWidth={1.8} />
      </div>
    </button>
  );
}

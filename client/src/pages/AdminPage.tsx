import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import teamsData from "@/data/teams-static.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutDashboard, Users, Trophy, LogOut, Plus, Trash2, RefreshCw,
  CheckCircle, Clock, Ticket, Loader2, TrendingUp, Target,
  Zap, Search, Award, X, Check, Database, ChevronDown,
  AlertCircle, Circle, CheckSquare, Settings, Send, Eye, EyeOff, Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Types ─────────────────────────────────────────────────── */
interface InvitationCode { id: number; code: string; type: string; max_uses: number; uses: number; status: string; created_at: string; }
interface User { id: number; username: string; role: string; referral_code: string | null; created_at: string; }
interface Coupon { id: number; name: string; coupon_date: string; combined_odds: number; status: string; result: string; created_at: string; predictions?: CouponPrediction[]; }
interface CouponPrediction { id: number; home_team: string; away_team: string; home_logo?: string; away_logo?: string; league_name?: string; match_date?: string; match_time?: string; prediction: string; odds?: string; result?: string; }
interface BestBet { id: number; match_id?: number; fixture_id?: number; home_team: string; away_team: string; home_logo?: string; away_logo?: string; league_name?: string; match_date?: string; match_time?: string; bet_type: string; confidence: number; risk_level: string; reasoning?: string; result?: string; }
interface PublishedMatch { id: number; fixture_id: number; home_team: string; away_team: string; home_logo?: string; away_logo?: string; league_name?: string; match_date: string; match_time: string; status: string; final_score_home: number | null; final_score_away: number | null; best_bet?: { bet_type: string; odds?: string; result: string; }; }

/* ── Helpers ────────────────────────────────────────────────── */
const TABS = [
  { id: "dashboard", icon: LayoutDashboard, label: "Genel" },
  { id: "matches", icon: Trophy, label: "Maçlar" },
  { id: "coupons", icon: Ticket, label: "Kuponlar" },
  { id: "users", icon: Users, label: "Üyeler" },
  { id: "invitations", icon: Award, label: "Davetiye" },
  { id: "database", icon: Database, label: "Veritabanı" },
  { id: "settings", icon: Settings, label: "Ayarlar" },
];

function fmtDate(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("tr-TR");
}

function StatusPill({ status, result }: { status: string; result?: string }) {
  if (result === "won")  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3"/>Tuttu</span>;
  if (result === "lost") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600"><X className="w-3 h-3"/>Tutmadı</span>;
  if (status === "finished") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500"><CheckSquare className="w-3 h-3"/>Bitti</span>;
  // Check if match is currently live based on time
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600"><Circle className="w-2.5 h-2.5 fill-amber-400"/>Bekliyor</span>;
}

/* ── Main Component ─────────────────────────────────────────── */
export default function AdminPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");

  /* data */
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bestBetsStats, setBestBetsStats] = useState<{ wonCount: number; lostCount: number; pendingCount: number; totalCount: number; successRate: number; wonBets: any[]; }>({ wonCount: 0, lostCount: 0, pendingCount: 0, totalCount: 0, successRate: 0, wonBets: [] });
  const [publishedMatches, setPublishedMatches] = useState<PublishedMatch[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [couponDetails, setCouponDetails] = useState<Coupon | null>(null);
  const [availableBestBets, setAvailableBestBets] = useState<BestBet[]>([]);
  const [loadingBestBets, setLoadingBestBets] = useState(false);

  /* coupon matches (manuel kupon maçları) */
  interface CouponMatch { id: number; coupon_id: number; home_team: string; away_team: string; home_logo?: string; away_logo?: string; league_name?: string; bet_type: string; odds: string; final_score_home: number | null; final_score_away: number | null; result: string; }
  const [couponMatches, setCouponMatches] = useState<CouponMatch[]>([]);
  const [loadingCouponMatches, setLoadingCouponMatches] = useState(false);
  const [scoreEdits, setScoreEdits] = useState<Record<number, { home: string; away: string; result: string }>>({});
  const [savingScores, setSavingScores] = useState<Record<number, boolean>>({});
  const [sharingCouponResult, setSharingCouponResult] = useState(false);
  const [updatingCouponResult, setUpdatingCouponResult] = useState(false);

  /* match form */
  const [manualForm, setManualForm] = useState({ leagueId: '', homeTeamId: '', awayTeamId: '', matchDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }), matchTime: '20:00', bet_type: '', odds: '', description: '' });
  const [homeSearch, setHomeSearch] = useState('');
  const [awaySearch, setAwaySearch] = useState('');
  const [showHomeDD, setShowHomeDD] = useState(false);
  const [showAwayDD, setShowAwayDD] = useState(false);
  const [submittingMatch, setSubmittingMatch] = useState(false);
  const homeRef = useRef<HTMLDivElement>(null);
  const awayRef = useRef<HTMLDivElement>(null);

  /* result form */
  const [resultFormId, setResultFormId] = useState<number | null>(null);
  const [resultForm, setResultForm] = useState({ home: '', away: '', ht_home: '', ht_away: '', bet_result: '' });
  const [submittingResult, setSubmittingResult] = useState(false);

  /* invitation form */
  const [newCode, setNewCode] = useState({ code: "", type: "standard", maxUses: 1 });
  const [newCouponName, setNewCouponName] = useState("");

  /* telegram / settings */
  const [tgToken, setTgToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [tgTokenVisible, setTgTokenVisible] = useState(false);
  const [autoSendOnPublish, setAutoSendOnPublish] = useState(false);
  const [autoSendOnResult, setAutoSendOnResult] = useState(false);
  const [autoSendKickoff, setAutoSendKickoff] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [sharingTelegram, setSharingTelegram] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

  /* matches tab — digest */
  const [sendingDigest, setSendingDigest] = useState(false);

  /* kupon modülü */
  const emptyCRow = () => ({ leagueId: '', homeTeamId: '', awayTeamId: '', homeSearch: '', awaySearch: '', showHomeDD: false, showAwayDD: false, bet: '', odds: '' });
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponRows, setCouponRows] = useState([emptyCRow()]);
  const [sendingCoupon, setSendingCoupon] = useState(false);

  const updateCRow = (idx: number, patch: Partial<ReturnType<typeof emptyCRow>>) =>
    setCouponRows(rows => rows.map((r, i) => i === idx ? { ...r, ...patch } : r));

  /* serbest mesaj */
  const [freeMsg, setFreeMsg] = useState('');
  const [sendingFreeMsg, setSendingFreeMsg] = useState(false);

  /* ayarlar — photo management */
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [photoTimestamps, setPhotoTimestamps] = useState<Record<string, number>>({});

  /* close dropdowns on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (homeRef.current && !homeRef.current.contains(e.target as Node)) setShowHomeDD(false);
      if (awayRef.current && !awayRef.current.contains(e.target as Node)) setShowAwayDD(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!user) { setLocation("/admin-login"); return; }
    loadAll();
  }, [user]);

  useEffect(() => { if (activeTab === "matches") loadPublishedMatches(); }, [activeTab]);
  useEffect(() => { if (activeTab === "settings") loadSettings(); }, [activeTab]);

  /* ── Loaders ──────────────────────────────────────────────── */
  const loadAll = () => { loadPublishedMatches(); loadBestBetsStats(); loadCoupons(); loadUsers(); loadInvitationCodes(); };
  const loadPublishedMatches = async () => { try { const r = await fetch('/api/admin/matches', { credentials: 'include' }); if (r.ok) setPublishedMatches(await r.json()); } catch {} };
  const loadBestBetsStats = async () => { try { const r = await fetch('/api/admin/best-bets/stats', { credentials: 'include' }); if (r.ok) setBestBetsStats(await r.json()); } catch {} };
  const loadCoupons = async () => { try { const r = await fetch('/api/admin/coupons', { credentials: 'include' }); if (r.ok) setCoupons(await r.json()); } catch {} };
  const loadUsers = async () => { try { const r = await fetch('/api/admin/users', { credentials: 'include' }); if (r.ok) setUsers(await r.json()); } catch {} };
  const loadInvitationCodes = async () => { try { const r = await fetch('/api/admin/invitations', { credentials: 'include' }); if (r.ok) setInvitationCodes(await r.json()); } catch {} };
  const loadCouponDetails = async (id: number) => { try { const r = await fetch(`/api/admin/coupons/${id}`, { credentials: 'include' }); if (r.ok) setCouponDetails(await r.json()); } catch {} };
  const loadAvailableBestBets = async () => { setLoadingBestBets(true); try { const r = await fetch('/api/admin/best-bets/all', { credentials: 'include' }); if (r.ok) setAvailableBestBets(await r.json()); } catch {} finally { setLoadingBestBets(false); } };
  const loadSettings = async () => { try { const r = await fetch('/api/admin/settings', { credentials: 'include' }); if (r.ok) { const s = await r.json(); setTgToken(s.telegram_bot_token || ''); setTgChatId(s.telegram_chat_id || ''); setAutoSendOnPublish(s.auto_send_on_publish === 'true'); setAutoSendOnResult(s.auto_send_on_result === 'true'); setAutoSendKickoff(s.auto_send_kickoff === 'true'); } } catch {} };

  /* ── Actions ──────────────────────────────────────────────── */
  const handleLogout = () => { logout(); setLocation("/admin-login"); };

  const handleManualPublish = async () => {
    const homeTeam = (teamsData.teams as any[]).find(t => String(t.id) === manualForm.homeTeamId);
    const awayTeam = (teamsData.teams as any[]).find(t => String(t.id) === manualForm.awayTeamId);
    const league  = (teamsData.leagues as any[]).find(l => String(l.id) === manualForm.leagueId);
    if (!homeTeam || !awayTeam || !league || !manualForm.bet_type || !manualForm.odds) { toast({ variant: 'destructive', description: 'Tüm alanları doldurun.' }); return; }
    setSubmittingMatch(true);
    try {
      const r = await fetch('/api/admin/matches/publish-manual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ homeTeam: homeTeam.name, awayTeam: awayTeam.name, homeLogo: homeTeam.logo, awayLogo: awayTeam.logo, leagueName: league.name, leagueLogo: league.logo, leagueId: league.id, matchDate: manualForm.matchDate, matchTime: manualForm.matchTime, bet_type: manualForm.bet_type, odds: manualForm.odds, description: manualForm.description })
      });
      const d = await r.json();
      if (r.ok) { toast({ description: `${homeTeam.name} - ${awayTeam.name} yayınlandı.` }); loadPublishedMatches(); setManualForm(f => ({ ...f, homeTeamId: '', awayTeamId: '', bet_type: '', odds: '', description: '' })); setHomeSearch(''); setAwaySearch(''); }
      else toast({ variant: 'destructive', description: d.message || 'Yayınlanamadı.' });
    } catch { toast({ variant: 'destructive', description: 'Bağlantı hatası.' }); } finally { setSubmittingMatch(false); }
  };

  const unpublishMatch = async (id: number) => {
    try { const r = await fetch(`/api/admin/matches/${id}`, { method: 'DELETE', credentials: 'include' }); if (r.ok) { toast({ description: "Maç kaldırıldı" }); loadPublishedMatches(); } }
    catch { toast({ variant: "destructive", description: "Kaldırılamadı" }); }
  };

  const handleSetResult = async (matchId: number) => {
    if (!resultForm.home || !resultForm.away) { toast({ variant: 'destructive', description: 'İki skoru da girin.' }); return; }
    setSubmittingResult(true);
    try {
      const body: any = { home_score: resultForm.home, away_score: resultForm.away };
      if (resultForm.ht_home !== '') body.ht_home = resultForm.ht_home;
      if (resultForm.ht_away !== '') body.ht_away = resultForm.ht_away;
      if (resultForm.bet_result !== '') body.bet_result = resultForm.bet_result;
      const r = await fetch(`/api/admin/matches/${matchId}/result`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
      const d = await r.json();
      if (r.ok) { toast({ description: d.message }); setResultFormId(null); setResultForm({ home: '', away: '', ht_home: '', ht_away: '', bet_result: '' }); loadPublishedMatches(); loadBestBetsStats(); }
      else toast({ variant: 'destructive', description: d.message });
    } catch { toast({ variant: 'destructive', description: 'Bağlantı hatası.' }); } finally { setSubmittingResult(false); }
  };

  const handleCreateCoupon = async () => {
    if (!newCouponName) { toast({ variant: "destructive", description: "Kupon adı gerekli" }); return; }
    try {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
      const r = await fetch('/api/admin/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCouponName, date: today }), credentials: 'include' });
      if (r.ok) { toast({ description: "Kupon oluşturuldu" }); setNewCouponName(""); loadCoupons(); }
    } catch { toast({ variant: "destructive", description: "Oluşturulamadı" }); }
  };

  const loadCouponMatches = async (couponId: number) => {
    setLoadingCouponMatches(true);
    try {
      const r = await fetch(`/api/admin/coupons/${couponId}/matches`, { credentials: 'include' });
      if (r.ok) {
        const data = await r.json();
        setCouponMatches(data);
        const edits: Record<number, { home: string; away: string; result: string }> = {};
        for (const m of data) {
          edits[m.id] = {
            home: m.final_score_home !== null ? String(m.final_score_home) : '',
            away: m.final_score_away !== null ? String(m.final_score_away) : '',
            result: m.result ?? 'pending',
          };
        }
        setScoreEdits(edits);
      }
    } finally { setLoadingCouponMatches(false); }
  };

  const handleSelectCoupon = async (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setCouponMatches([]);
    await Promise.all([loadCouponDetails(coupon.id), loadAvailableBestBets(), loadCouponMatches(coupon.id)]);
  };
  const handleDeleteCoupon = async (id: number) => { try { const r = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE', credentials: 'include' }); if (r.ok) { loadCoupons(); setSelectedCoupon(null); setCouponDetails(null); toast({ description: "Kupon silindi" }); } } catch { toast({ variant: "destructive", description: "Silinemedi" }); } };
  const handleAddBestBet = async (bestBetId: number) => { if (!selectedCoupon) return; try { const r = await fetch(`/api/admin/coupons/${selectedCoupon.id}/best-bets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ bestBetId }) }); if (r.ok) { setCouponDetails(await r.json()); loadCoupons(); toast({ description: "Eklendi" }); } } catch {} };
  const handleRemoveBestBet = async (bbId: number) => { if (!selectedCoupon) return; try { const r = await fetch(`/api/admin/coupons/${selectedCoupon.id}/best-bets/${bbId}`, { method: 'DELETE', credentials: 'include' }); if (r.ok) { setCouponDetails(await r.json()); loadCoupons(); toast({ description: "Kaldırıldı" }); } } catch {} };

  const handleCreateCode = async () => {
    if (!newCode.code) { toast({ variant: "destructive", description: "Kod girin" }); return; }
    try { const r = await fetch('/api/admin/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: newCode.code, type: newCode.type, maxUses: newCode.maxUses }), credentials: 'include' }); if (r.ok) { toast({ description: "Davetiye oluşturuldu" }); setNewCode({ code: "", type: "standard", maxUses: 1 }); loadInvitationCodes(); } }
    catch { toast({ variant: "destructive", description: "Oluşturulamadı" }); }
  };

  const handleDeleteCode = async (id: number) => { try { const r = await fetch(`/api/admin/invitations/${id}`, { method: 'DELETE', credentials: 'include' }); if (r.ok) { toast({ description: "Kod silindi" }); loadInvitationCodes(); } } catch {} };
  const generateRandomCode = () => { const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let s = ''; for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]; setNewCode({ ...newCode, code: s }); };

  const apiPost = async (url: string, body?: any) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...(body ? { body: JSON.stringify(body) } : {}) });
    return r.json();
  };

  if (!user) return null;

  /* teams for selected league */
  const leagueTeams = (teamsData.teams as any[]).filter(t => t.leagues.includes(Number(manualForm.leagueId)));
  const homeTeamObj = (teamsData.teams as any[]).find(t => String(t.id) === manualForm.homeTeamId);
  const awayTeamObj = (teamsData.teams as any[]).find(t => String(t.id) === manualForm.awayTeamId);

  const pending = publishedMatches.filter(m => m.status !== 'finished' && m.status !== 'cancelled');
  const finished = publishedMatches.filter(m => m.status === 'finished');

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Top Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-800 text-sm">Tutturduk Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:block">{user.username}</span>
            <button onClick={handleLogout} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <LogOut className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="overflow-x-auto border-t border-gray-100">
          <div className="flex px-4 max-w-5xl mx-auto min-w-max">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 p-4 pb-8 max-w-5xl mx-auto w-full space-y-4">

        {/* ═══════════════════ DASHBOARD ═══════════════════ */}
        {activeTab === "dashboard" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">Genel Bakış</h2>
              <button onClick={loadAll} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Yenile
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Başarı Oranı", value: `%${bestBetsStats.successRate}`, color: "emerald", icon: TrendingUp },
                { label: "Yayında", value: publishedMatches.length, color: "blue", icon: Target },
                { label: "Kullanıcı", value: users.length, color: "purple", icon: Users },
                { label: "Davetiye", value: invitationCodes.filter(c => c.status === 'active').length, color: "amber", icon: Award },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl bg-${s.color}-50 flex items-center justify-center shrink-0`}>
                    <s.icon className={`w-5 h-5 text-${s.color}-500`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-gray-800 leading-tight">{s.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bet results bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Tahmin Sonuçları</p>
              <div className="flex gap-4 mb-3">
                <div className="text-center"><p className="text-lg font-bold text-emerald-600">{bestBetsStats.wonCount}</p><p className="text-[11px] text-gray-400">Kazanan</p></div>
                <div className="text-center"><p className="text-lg font-bold text-red-500">{bestBetsStats.lostCount}</p><p className="text-[11px] text-gray-400">Kaybeden</p></div>
                <div className="text-center"><p className="text-lg font-bold text-amber-500">{bestBetsStats.pendingCount}</p><p className="text-[11px] text-gray-400">Bekleyen</p></div>
                <div className="text-center"><p className="text-lg font-bold text-gray-700">{bestBetsStats.totalCount}</p><p className="text-[11px] text-gray-400">Toplam</p></div>
              </div>
              {bestBetsStats.totalCount > 0 && (
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
                  <div className="bg-emerald-400 rounded-full transition-all" style={{ width: `${(bestBetsStats.wonCount / bestBetsStats.totalCount) * 100}%` }} />
                  <div className="bg-red-400 rounded-full transition-all" style={{ width: `${(bestBetsStats.lostCount / bestBetsStats.totalCount) * 100}%` }} />
                  <div className="bg-amber-300 rounded-full transition-all" style={{ width: `${(bestBetsStats.pendingCount / bestBetsStats.totalCount) * 100}%` }} />
                </div>
              )}
            </div>

            {/* Recent matches */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Yakın Maçlar</span>
              </div>
              <div className="divide-y divide-gray-50">
                {publishedMatches.slice(0, 8).map(pm => (
                  <div key={pm.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[11px] font-mono text-gray-400 w-10 shrink-0">{pm.match_time}</span>
                      <img src={pm.home_logo} alt="" className="w-4 h-4 object-contain shrink-0" onError={e => (e.currentTarget.style.display='none')} />
                      <span className="text-xs text-gray-700 truncate">{pm.home_team}</span>
                      <span className="text-[10px] text-gray-300 shrink-0">vs</span>
                      <span className="text-xs text-gray-700 truncate">{pm.away_team}</span>
                      <img src={pm.away_logo} alt="" className="w-4 h-4 object-contain shrink-0" onError={e => (e.currentTarget.style.display='none')} />
                    </div>
                    <StatusPill status={pm.status} result={pm.best_bet?.result} />
                  </div>
                ))}
                {publishedMatches.length === 0 && <p className="text-gray-400 text-center py-8 text-sm">Henüz maç yok</p>}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════ MATCHES ═══════════════════ */}
        {activeTab === "matches" && (
          <>
            <h2 className="text-base font-bold text-gray-800">Maç Yönetimi</h2>

            {/* ── Add match form ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500">
                <Plus className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Yeni Maç Ekle</span>
              </div>

              <div className="p-4 space-y-4">
                {/* League picker */}
                <div>
                  <Label className="text-xs font-medium text-gray-500 mb-2 block">Lig</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {(teamsData.leagues as any[]).map(lg => (
                      <button key={lg.id}
                        onClick={() => setManualForm(f => ({ ...f, leagueId: String(lg.id), homeTeamId: '', awayTeamId: '' }))}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${manualForm.leagueId === String(lg.id) ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'}`}
                      >
                        <img src={lg.logo} alt="" className="w-4 h-4 object-contain" onError={e => (e.currentTarget.style.display='none')} />
                        <span>{lg.shortName}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team pickers */}
                {manualForm.leagueId && (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Home team */}
                    <div ref={homeRef}>
                      <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Ev Sahibi</Label>
                      {homeTeamObj ? (
                        <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <img src={homeTeamObj.logo} alt="" className="w-6 h-6 object-contain shrink-0" />
                          <span className="text-xs font-medium text-gray-800 flex-1 truncate">{homeTeamObj.name}</span>
                          <button onClick={() => setManualForm(f => ({ ...f, homeTeamId: '' }))} className="text-gray-400 hover:text-red-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          <input
                            placeholder="Takım ara..."
                            value={homeSearch}
                            onChange={e => { setHomeSearch(e.target.value); setShowHomeDD(true); }}
                            onFocus={() => setShowHomeDD(true)}
                            className="w-full pl-8 pr-3 h-9 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                          />
                          {showHomeDD && (
                            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                              {leagueTeams.filter(t => t.id !== Number(manualForm.awayTeamId) && t.name.toLowerCase().includes(homeSearch.toLowerCase())).map(t => (
                                <button key={t.id} onMouseDown={() => { setManualForm(f => ({ ...f, homeTeamId: String(t.id) })); setHomeSearch(''); setShowHomeDD(false); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
                                  <img src={t.logo} alt="" className="w-5 h-5 object-contain" />
                                  <span className="text-xs text-gray-700">{t.name}</span>
                                </button>
                              ))}
                              {leagueTeams.filter(t => t.name.toLowerCase().includes(homeSearch.toLowerCase())).length === 0 && <p className="text-xs text-gray-400 text-center py-3">Bulunamadı</p>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Away team */}
                    <div ref={awayRef}>
                      <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Deplasman</Label>
                      {awayTeamObj ? (
                        <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                          <img src={awayTeamObj.logo} alt="" className="w-6 h-6 object-contain shrink-0" />
                          <span className="text-xs font-medium text-gray-800 flex-1 truncate">{awayTeamObj.name}</span>
                          <button onClick={() => setManualForm(f => ({ ...f, awayTeamId: '' }))} className="text-gray-400 hover:text-red-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          <input
                            placeholder="Takım ara..."
                            value={awaySearch}
                            onChange={e => { setAwaySearch(e.target.value); setShowAwayDD(true); }}
                            onFocus={() => setShowAwayDD(true)}
                            className="w-full pl-8 pr-3 h-9 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                          />
                          {showAwayDD && (
                            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                              {leagueTeams.filter(t => t.id !== Number(manualForm.homeTeamId) && t.name.toLowerCase().includes(awaySearch.toLowerCase())).map(t => (
                                <button key={t.id} onMouseDown={() => { setManualForm(f => ({ ...f, awayTeamId: String(t.id) })); setAwaySearch(''); setShowAwayDD(false); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
                                  <img src={t.logo} alt="" className="w-5 h-5 object-contain" />
                                  <span className="text-xs text-gray-700">{t.name}</span>
                                </button>
                              ))}
                              {leagueTeams.filter(t => t.name.toLowerCase().includes(awaySearch.toLowerCase())).length === 0 && <p className="text-xs text-gray-400 text-center py-3">Bulunamadı</p>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Date + Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Tarih</Label>
                    <input type="date" value={manualForm.matchDate} onChange={e => setManualForm(f => ({ ...f, matchDate: e.target.value }))}
                      style={{ colorScheme: 'light' }}
                      className="w-full h-9 rounded-xl border border-gray-200 px-3 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Saat</Label>
                    <input type="time" value={manualForm.matchTime} onChange={e => setManualForm(f => ({ ...f, matchTime: e.target.value }))}
                      style={{ colorScheme: 'light' }}
                      className="w-full h-9 rounded-xl border border-gray-200 px-3 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400" />
                  </div>
                </div>

                {/* Prediction */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Tahmin</Label>
                    <input placeholder="MS1, KG VAR, 2.5 ALT..." value={manualForm.bet_type} onChange={e => setManualForm(f => ({ ...f, bet_type: e.target.value }))}
                      className="w-full h-9 rounded-xl border border-gray-200 px-3 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Oran</Label>
                    <input type="number" step="0.01" placeholder="1.85" value={manualForm.odds} onChange={e => setManualForm(f => ({ ...f, odds: e.target.value }))}
                      className="w-full h-9 rounded-xl border border-gray-200 px-3 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Açıklama <span className="font-normal text-gray-400">(isteğe bağlı)</span></Label>
                  <input placeholder="Kısa analiz notu..." value={manualForm.description} onChange={e => setManualForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full h-9 rounded-xl border border-gray-200 px-3 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400" />
                </div>

                <button onClick={handleManualPublish}
                  disabled={submittingMatch || !manualForm.homeTeamId || !manualForm.awayTeamId || !manualForm.bet_type || !manualForm.odds || !manualForm.leagueId}
                  className="w-full h-10 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {submittingMatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Maçı Yayınla
                </button>
              </div>
            </div>

            {/* ── Digest + Coupon actions ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                <div className="w-8 h-8 rounded-xl bg-[#229ED9]/10 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4 text-[#229ED9]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">Telegram'a Gönder</p>
                  <p className="text-[10.5px] text-gray-400">Bugünkü tahminleri toplu paylaş veya kupon oluştur</p>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {/* Digest button */}
                <button
                  onClick={async () => {
                    setSendingDigest(true);
                    try {
                      const r = await fetch('/api/admin/telegram/share', {
                        method: 'POST', credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({}),
                      });
                      const d = await r.json();
                      if (r.ok) toast({ description: d.message });
                      else toast({ variant: 'destructive', description: d.message });
                    } finally { setSendingDigest(false); }
                  }}
                  disabled={sendingDigest}
                  className="w-full h-9 rounded-xl bg-[#229ED9] text-white text-sm font-semibold hover:bg-[#1a8fc4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sendingDigest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Tahminleri Gönder
                </button>

                {/* Coupon toggle */}
                <button
                  onClick={() => setCouponOpen(v => !v)}
                  className={`w-full h-9 rounded-xl border text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${couponOpen ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  <span>🎯</span>
                  Günün Kuponu
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${couponOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* ── Serbest mesaj ── */}
                <div className="pt-1 border-t border-gray-100 space-y-2">
                  <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wide">Serbest Mesaj</p>
                  <textarea
                    rows={3}
                    placeholder="Gruba göndermek istediğin mesajı yaz..."
                    value={freeMsg}
                    onChange={e => setFreeMsg(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#229ED9]/40 focus:border-[#229ED9] resize-none leading-relaxed"
                  />
                  <button
                    disabled={sendingFreeMsg || !freeMsg.trim()}
                    onClick={async () => {
                      setSendingFreeMsg(true);
                      try {
                        const r = await fetch('/api/admin/telegram/send-message', {
                          method: 'POST', credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ text: freeMsg }),
                        });
                        const d = await r.json();
                        if (r.ok) { toast({ description: 'Mesaj gönderildi' }); setFreeMsg(''); }
                        else toast({ variant: 'destructive', description: d.message });
                      } finally { setSendingFreeMsg(false); }
                    }}
                    className="w-full h-8 rounded-xl bg-gray-800 text-white text-xs font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {sendingFreeMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Gönder
                  </button>
                </div>

              </div>
            </div>

            {/* ══ Kupon Modülü ══ */}
            {couponOpen && (() => {
              const buildMatchPayload = () => {
                const valid = couponRows.filter(r => r.homeTeamId && r.awayTeamId && r.bet && r.odds);
                return valid.map(r => {
                  const ht = (teamsData.teams as any[]).find(t => String(t.id) === r.homeTeamId);
                  const at = (teamsData.teams as any[]).find(t => String(t.id) === r.awayTeamId);
                  const lg = (teamsData.leagues as any[]).find(l => String(l.id) === r.leagueId);
                  return { home_team: ht?.name ?? '?', away_team: at?.name ?? '?', home_logo: ht?.logo, away_logo: at?.logo, league_name: lg?.name ?? '', label: `${ht?.name ?? '?'} - ${at?.name ?? '?'}`, bet: r.bet, bet_type: r.bet, odds: r.odds };
                });
              };

              const saveToDb = async () => {
                const matches = buildMatchPayload();
                if (!matches.length) { toast({ variant: 'destructive', description: 'En az bir maç ekleyin.' }); return null; }
                const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
                const dayStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: 'Europe/Istanbul' });
                const r = await fetch('/api/admin/coupons/create-with-matches', {
                  method: 'POST', credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: `Sönmez Dayının ${dayStr} Kuponu`, date: today, matches }),
                });
                const d = await r.json();
                if (r.ok) { loadCoupons(); return { couponId: d.id, matches }; }
                toast({ variant: 'destructive', description: d.message });
                return null;
              };

              const sendCoupon = async () => {
                const matches = buildMatchPayload();
                if (!matches.length) { toast({ variant: 'destructive', description: 'En az bir maç ekleyin.' }); return; }
                setSendingCoupon(true);
                try {
                  const saved = await saveToDb();
                  const rows = matches.map(m => ({ label: m.label, leagueName: m.league_name, bet: m.bet, odds: m.odds }));
                  const res = await fetch('/api/admin/telegram/share-coupon', {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rows }),
                  });
                  const d = await res.json();
                  if (res.ok) { toast({ description: saved ? 'Kaydedildi ve gönderildi' : d.message }); setCouponOpen(false); setCouponRows([emptyCRow()]); }
                  else toast({ variant: 'destructive', description: d.message });
                } finally { setSendingCoupon(false); }
              };

              const saveOnlyCoupon = async () => {
                setSendingCoupon(true);
                try {
                  const saved = await saveToDb();
                  if (saved) { toast({ description: 'Kupon kaydedildi' }); setCouponOpen(false); setCouponRows([emptyCRow()]); }
                } finally { setSendingCoupon(false); }
              };

              return (
                <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎯</span>
                      <div>
                        <p className="text-sm font-bold text-amber-800">Günün Kuponu</p>
                        <p className="text-[10.5px] text-amber-600">Ligler ve takımları seçerek oluştur</p>
                      </div>
                    </div>
                    <button onClick={() => { setCouponOpen(false); setCouponRows([emptyCRow()]); }} className="text-amber-400 hover:text-amber-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-5">
                    {couponRows.map((row, idx) => {
                      const rowTeams = (teamsData.teams as any[]).filter(t => t.leagues.includes(Number(row.leagueId)));
                      const rowHome = (teamsData.teams as any[]).find(t => String(t.id) === row.homeTeamId);
                      const rowAway = (teamsData.teams as any[]).find(t => String(t.id) === row.awayTeamId);
                      const rowLeague = (teamsData.leagues as any[]).find(l => String(l.id) === row.leagueId);

                      return (
                        <div key={idx} className="relative bg-gray-50 rounded-2xl p-3 space-y-3 border border-gray-100">
                          {/* Row header */}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Maç {idx + 1}</span>
                            {couponRows.length > 1 && (
                              <button onClick={() => setCouponRows(rows => rows.filter((_, i) => i !== idx))}
                                className="w-6 h-6 rounded-lg hover:bg-red-100 flex items-center justify-center text-gray-300 hover:text-red-500">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* League picker */}
                          <div>
                            <p className="text-[10.5px] font-medium text-gray-500 mb-1.5">Lig</p>
                            <div className="flex flex-wrap gap-1">
                              {(teamsData.leagues as any[]).map(lg => (
                                <button key={lg.id}
                                  onClick={() => updateCRow(idx, { leagueId: String(lg.id), homeTeamId: '', awayTeamId: '', homeSearch: '', awaySearch: '' })}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all ${row.leagueId === String(lg.id) ? 'border-amber-400 bg-amber-100 text-amber-800 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}
                                >
                                  <img src={lg.logo} alt="" className="w-3.5 h-3.5 object-contain" onError={e => (e.currentTarget.style.display='none')} />
                                  {lg.shortName}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Team pickers */}
                          {row.leagueId && (
                            <div className="grid grid-cols-2 gap-2">
                              {/* Home */}
                              <div>
                                <p className="text-[10.5px] font-medium text-gray-500 mb-1">Ev Sahibi</p>
                                {rowHome ? (
                                  <div className="flex items-center gap-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                                    <img src={rowHome.logo} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display='none')} />
                                    <span className="text-[11px] font-medium text-gray-800 flex-1 truncate">{rowHome.name}</span>
                                    <button onClick={() => updateCRow(idx, { homeTeamId: '' })} className="text-gray-300 hover:text-red-400 shrink-0"><X className="w-3 h-3" /></button>
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                                    <input
                                      placeholder="Ara..."
                                      value={row.homeSearch}
                                      onChange={e => updateCRow(idx, { homeSearch: e.target.value, showHomeDD: true })}
                                      onFocus={() => updateCRow(idx, { showHomeDD: true })}
                                      onBlur={() => setTimeout(() => updateCRow(idx, { showHomeDD: false }), 150)}
                                      className="w-full pl-7 pr-2 h-8 rounded-xl border border-gray-200 text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                    />
                                    {row.showHomeDD && (
                                      <div className="absolute z-30 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                                        {rowTeams.filter(t => t.id !== Number(row.awayTeamId) && t.name.toLowerCase().includes(row.homeSearch.toLowerCase())).slice(0, 20).map(t => (
                                          <button key={t.id} onMouseDown={() => updateCRow(idx, { homeTeamId: String(t.id), homeSearch: '', showHomeDD: false })}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 text-left">
                                            <img src={t.logo} alt="" className="w-4 h-4 object-contain shrink-0" onError={e => (e.currentTarget.style.display='none')} />
                                            <span className="text-[11px] text-gray-700">{t.name}</span>
                                          </button>
                                        ))}
                                        {rowTeams.filter(t => t.name.toLowerCase().includes(row.homeSearch.toLowerCase())).length === 0 && (
                                          <p className="text-[11px] text-gray-400 text-center py-2">Bulunamadı</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Away */}
                              <div>
                                <p className="text-[10.5px] font-medium text-gray-500 mb-1">Deplasman</p>
                                {rowAway ? (
                                  <div className="flex items-center gap-1.5 p-2 bg-blue-50 border border-blue-200 rounded-xl">
                                    <img src={rowAway.logo} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display='none')} />
                                    <span className="text-[11px] font-medium text-gray-800 flex-1 truncate">{rowAway.name}</span>
                                    <button onClick={() => updateCRow(idx, { awayTeamId: '' })} className="text-gray-300 hover:text-red-400 shrink-0"><X className="w-3 h-3" /></button>
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                                    <input
                                      placeholder="Ara..."
                                      value={row.awaySearch}
                                      onChange={e => updateCRow(idx, { awaySearch: e.target.value, showAwayDD: true })}
                                      onFocus={() => updateCRow(idx, { showAwayDD: true })}
                                      onBlur={() => setTimeout(() => updateCRow(idx, { showAwayDD: false }), 150)}
                                      className="w-full pl-7 pr-2 h-8 rounded-xl border border-gray-200 text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                                    />
                                    {row.showAwayDD && (
                                      <div className="absolute z-30 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                                        {rowTeams.filter(t => t.id !== Number(row.homeTeamId) && t.name.toLowerCase().includes(row.awaySearch.toLowerCase())).slice(0, 20).map(t => (
                                          <button key={t.id} onMouseDown={() => updateCRow(idx, { awayTeamId: String(t.id), awaySearch: '', showAwayDD: false })}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 text-left">
                                            <img src={t.logo} alt="" className="w-4 h-4 object-contain shrink-0" onError={e => (e.currentTarget.style.display='none')} />
                                            <span className="text-[11px] text-gray-700">{t.name}</span>
                                          </button>
                                        ))}
                                        {rowTeams.filter(t => t.name.toLowerCase().includes(row.awaySearch.toLowerCase())).length === 0 && (
                                          <p className="text-[11px] text-gray-400 text-center py-2">Bulunamadı</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Selected match preview */}
                          {rowHome && rowAway && rowLeague && (
                            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-xl border border-gray-100">
                              <img src={rowLeague.logo} alt="" className="w-3.5 h-3.5 object-contain shrink-0" onError={e => (e.currentTarget.style.display='none')} />
                              <img src={rowHome.logo} alt="" className="w-4 h-4 object-contain shrink-0" onError={e => (e.currentTarget.style.display='none')} />
                              <span className="text-[11px] text-gray-700 font-medium truncate">{rowHome.name}</span>
                              <span className="text-[10px] text-gray-300 shrink-0">vs</span>
                              <span className="text-[11px] text-gray-700 font-medium truncate">{rowAway.name}</span>
                              <img src={rowAway.logo} alt="" className="w-4 h-4 object-contain shrink-0" onError={e => (e.currentTarget.style.display='none')} />
                            </div>
                          )}

                          {/* Bet + Odds */}
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              placeholder="Tahmin (MS1, KG VAR...)"
                              value={row.bet}
                              onChange={e => updateCRow(idx, { bet: e.target.value })}
                              className="col-span-2 h-8 rounded-xl border border-gray-200 px-2.5 text-[11px] text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                            />
                            <input
                              type="number" step="0.01" placeholder="Oran"
                              value={row.odds}
                              onChange={e => updateCRow(idx, { odds: e.target.value })}
                              className="h-8 rounded-xl border border-gray-200 px-2.5 text-[11px] text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Add row */}
                    <button
                      onClick={() => setCouponRows(rows => [...rows, emptyCRow()])}
                      className="w-full h-9 rounded-xl border border-dashed border-amber-300 text-amber-600 text-xs font-semibold hover:bg-amber-50 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Maç Ekle
                    </button>

                    {/* Total odds preview */}
                    {couponRows.some(r => r.odds) && (
                      <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                        <span className="text-xs text-emerald-700 font-medium">Toplam Oran</span>
                        <span className="text-sm font-bold text-emerald-600">
                          {couponRows.reduce((acc, r) => acc * (parseFloat(r.odds) || 1), 1).toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={saveOnlyCoupon}
                        disabled={sendingCoupon || !couponRows.some(r => r.homeTeamId && r.awayTeamId && r.bet && r.odds)}
                        className="h-10 rounded-xl border-2 border-amber-400 text-amber-700 text-sm font-bold hover:bg-amber-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        {sendingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Kaydet
                      </button>
                      <button
                        onClick={sendCoupon}
                        disabled={sendingCoupon || !couponRows.some(r => r.homeTeamId && r.awayTeamId && r.bet && r.odds)}
                        className="h-10 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        {sendingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Kaydet + Gönder
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Pending matches ── */}
            {pending.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    <span className="text-sm font-semibold text-gray-700">Bekleyen / Canlı</span>
                    <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">{pending.length}</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {pending.map(pm => (
                    <div key={pm.id}>
                      <div className="flex items-center gap-2 px-4 py-3">
                        {/* Time + match */}
                        <span className="text-[11px] font-mono text-gray-400 w-10 shrink-0">{pm.match_time}</span>
                        <img src={pm.home_logo} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display='none')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{pm.home_team} <span className="text-gray-300 font-normal">vs</span> {pm.away_team}</p>
                          <p className="text-[10px] text-gray-400 truncate">{pm.league_name} · {pm.match_date}</p>
                        </div>
                        <img src={pm.away_logo} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display='none')} />
                        {pm.best_bet && <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg shrink-0">{pm.best_bet.bet_type}</span>}

                        {/* Actions */}
                        <button onClick={() => { setResultFormId(resultFormId === pm.id ? null : pm.id); setResultForm({ home: '', away: '', ht_home: '', ht_away: '', bet_result: '' }); }}
                          className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                          Sonuç Gir
                        </button>
                        <button onClick={() => unpublishMatch(pm.id)} className="shrink-0 w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Result entry form */}
                      {resultFormId === pm.id && (
                        <div className="mx-4 mb-3 p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
                          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">Sonuç Gir — {pm.home_team} vs {pm.away_team}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] text-gray-500 mb-1 truncate">{pm.home_team}</p>
                              <input type="number" min="0" placeholder="0" value={resultForm.home} onChange={e => setResultForm(f => ({ ...f, home: e.target.value }))}
                                className="w-full h-10 rounded-lg border border-blue-200 text-center text-lg font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 mb-1 truncate">{pm.away_team}</p>
                              <input type="number" min="0" placeholder="0" value={resultForm.away} onChange={e => setResultForm(f => ({ ...f, away: e.target.value }))}
                                className="w-full h-10 rounded-lg border border-blue-200 text-center text-lg font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
                            </div>
                          </div>
                          {/* Tahmin sonucu seçici */}
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Tahmin Sonucu</p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { val: 'won',  label: '✅ Tuttu',    active: 'bg-emerald-500 text-white border-emerald-500', inactive: 'border-gray-200 text-gray-500 hover:bg-emerald-50' },
                                { val: 'lost', label: '❌ Tutmadı', active: 'bg-red-500 text-white border-red-500',     inactive: 'border-gray-200 text-gray-500 hover:bg-red-50' },
                                { val: '',     label: '⚙️ Otomatik', active: 'bg-gray-700 text-white border-gray-700',   inactive: 'border-gray-200 text-gray-500 hover:bg-gray-50' },
                              ].map(opt => (
                                <button key={opt.val} type="button"
                                  onClick={() => setResultForm(f => ({ ...f, bet_result: opt.val }))}
                                  className={`h-8 rounded-lg border text-[10.5px] font-semibold transition-colors ${resultForm.bet_result === opt.val ? opt.active : opt.inactive}`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            <p className="text-[9.5px] text-gray-400 mt-1">Otomatik seçiliyse sistem skora göre hesaplar.</p>
                          </div>

                          <details>
                            <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600 list-none select-none">+ İlk yarı skoru (isteğe bağlı)</summary>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                              <input type="number" min="0" placeholder="İY ev" value={resultForm.ht_home} onChange={e => setResultForm(f => ({ ...f, ht_home: e.target.value }))}
                                className="h-8 rounded-lg border border-blue-200 text-center text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" />
                              <input type="number" min="0" placeholder="İY dep" value={resultForm.ht_away} onChange={e => setResultForm(f => ({ ...f, ht_away: e.target.value }))}
                                className="h-8 rounded-lg border border-blue-200 text-center text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            </div>
                          </details>
                          <div className="flex gap-2">
                            <button onClick={() => handleSetResult(pm.id)} disabled={submittingResult || !resultForm.home || !resultForm.away}
                              className="flex-1 h-9 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                              {submittingResult ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              Kaydet
                            </button>
                            <button onClick={() => setResultFormId(null)} className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Finished matches ── */}
            {finished.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-300 rounded-full" />
                    <span className="text-sm font-semibold text-gray-700">Biten Maçlar</span>
                    <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">{finished.length}</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {finished.map(pm => (
                    <div key={pm.id} className="flex items-center gap-2 px-4 py-2.5">
                      <span className="text-[11px] font-mono text-gray-400 w-10 shrink-0">{pm.match_time}</span>
                      <img src={pm.home_logo} alt="" className="w-4 h-4 object-contain shrink-0" onError={e => (e.currentTarget.style.display='none')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 truncate">{pm.home_team} <span className="text-gray-300">vs</span> {pm.away_team}</p>
                      </div>
                      {pm.final_score_home !== null && (
                        <span className="text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg shrink-0">
                          {pm.final_score_home} - {pm.final_score_away}
                        </span>
                      )}
                      <StatusPill status={pm.status} result={pm.best_bet?.result} />
                      <button onClick={() => unpublishMatch(pm.id)} className="shrink-0 w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {publishedMatches.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Henüz maç eklenmemiş</p>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════ COUPONS ═══════════════════ */}
        {activeTab === "coupons" && (
          <>
            <h2 className="text-base font-bold text-gray-800">Kupon Yönetimi</h2>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex gap-2">
                <input value={newCouponName} onChange={e => setNewCouponName(e.target.value)} placeholder="Kupon adı"
                  className="flex-1 h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                <button onClick={handleCreateCoupon} className="h-9 px-4 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 flex items-center gap-1.5 transition-colors">
                  <Plus className="w-4 h-4" /> Oluştur
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {coupons.map(coupon => {
                const isSelected = selectedCoupon?.id === coupon.id;
                const myMatches = isSelected ? couponMatches : [];
                const hasCouponMatches = isSelected && myMatches.length > 0;

                return (
                  <div key={coupon.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${isSelected ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-gray-100'}`}>
                    {/* Coupon header */}
                    <div onClick={() => isSelected ? (setSelectedCoupon(null), setCouponMatches([])) : handleSelectCoupon(coupon)}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{coupon.name}</p>
                        <p className="text-xs text-gray-400">{fmtDate(coupon.coupon_date)} · Oran: {parseFloat(coupon.combined_odds ?? '1').toFixed(2)}</p>
                      </div>
                      <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full shrink-0 ${coupon.result === 'won' ? 'bg-emerald-100 text-emerald-700' : coupon.result === 'lost' ? 'bg-red-100 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                        {coupon.result === 'won' ? '🏆 Kazandı' : coupon.result === 'lost' ? '❌ Kaybetti' : '⏳ Bekliyor'}
                      </span>
                      <button onClick={e => { e.stopPropagation(); handleDeleteCoupon(coupon.id); }} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Expanded detail */}
                    {isSelected && (
                      <div className="border-t border-gray-100 divide-y divide-gray-50">

                        {/* ── Manuel coupon matches ── */}
                        {loadingCouponMatches && (
                          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
                        )}

                        {hasCouponMatches && myMatches.map(m => {
                          const edit = scoreEdits[m.id] ?? { home: '', away: '', result: m.result };
                          const saving = savingScores[m.id];
                          const saveScore = async () => {
                            setSavingScores(p => ({ ...p, [m.id]: true }));
                            try {
                              const r = await fetch(`/api/admin/coupons/${coupon.id}/matches/${m.id}`, {
                                method: 'PATCH', credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ final_score_home: edit.home !== '' ? edit.home : undefined, final_score_away: edit.away !== '' ? edit.away : undefined, result: edit.result !== 'pending' ? edit.result : undefined }),
                              });
                              if (r.ok) { const data = await r.json(); setCouponMatches(data); toast({ description: 'Kaydedildi' }); }
                              else { const d = await r.json(); toast({ variant: 'destructive', description: d.message }); }
                            } finally { setSavingScores(p => ({ ...p, [m.id]: false })); }
                          };
                          return (
                            <div key={m.id} className="px-4 py-3 space-y-2">
                              {/* Match info */}
                              <div className="flex items-center gap-2">
                                {m.home_logo && <img src={m.home_logo} alt="" className="w-4 h-4 object-contain shrink-0" onError={e => (e.currentTarget.style.display='none')} />}
                                <span className="text-xs font-medium text-gray-800 flex-1 truncate">{m.home_team} <span className="text-gray-300">vs</span> {m.away_team}</span>
                                {m.away_logo && <img src={m.away_logo} alt="" className="w-4 h-4 object-contain shrink-0" onError={e => (e.currentTarget.style.display='none')} />}
                                <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded shrink-0">{m.bet_type} @ {parseFloat(m.odds).toFixed(2)}</span>
                              </div>
                              {/* Score + result entry */}
                              <div className="flex items-center gap-2">
                                <input type="number" min="0" placeholder="0" value={edit.home}
                                  onChange={e => setScoreEdits(p => ({ ...p, [m.id]: { ...edit, home: e.target.value } }))}
                                  className="w-12 h-8 rounded-lg border border-gray-200 text-center text-sm font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                <span className="text-gray-300 text-sm font-bold">-</span>
                                <input type="number" min="0" placeholder="0" value={edit.away}
                                  onChange={e => setScoreEdits(p => ({ ...p, [m.id]: { ...edit, away: e.target.value } }))}
                                  className="w-12 h-8 rounded-lg border border-gray-200 text-center text-sm font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                {(['won','lost','pending'] as const).map(val => (
                                  <button key={val} onClick={() => setScoreEdits(p => ({ ...p, [m.id]: { ...edit, result: val } }))}
                                    className={`h-8 px-2.5 rounded-lg text-[10.5px] font-semibold border transition-colors ${edit.result === val ? val === 'won' ? 'bg-emerald-500 text-white border-emerald-500' : val === 'lost' ? 'bg-red-500 text-white border-red-500' : 'bg-gray-600 text-white border-gray-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                    {val === 'won' ? '✅' : val === 'lost' ? '❌' : '⏳'}
                                  </button>
                                ))}
                                <button onClick={saveScore} disabled={saving}
                                  className="ml-auto h-8 px-3 rounded-lg bg-emerald-500 text-white text-[10.5px] font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-40 flex items-center gap-1">
                                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  Kaydet
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* ── Kupon sonucu + Telegram paylaşımı ── */}
                        <div className="px-4 py-3 space-y-2" onClick={e => e.stopPropagation()}>
                          {/* Kupon genel sonucu */}
                          <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wide">Kupon Sonucu</p>
                          <div className="flex gap-2">
                            {(['won','lost','pending'] as const).map(val => (
                              <button key={val}
                                disabled={updatingCouponResult}
                                onClick={async () => {
                                  setUpdatingCouponResult(true);
                                  try {
                                    const r = await fetch(`/api/admin/coupons/${coupon.id}/result`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ result: val }) });
                                    if (r.ok) { loadCoupons(); toast({ description: val === 'won' ? 'Kazandı olarak işaretlendi' : val === 'lost' ? 'Kaybetti olarak işaretlendi' : 'Beklemeye alındı' }); }
                                  } finally { setUpdatingCouponResult(false); }
                                }}
                                className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-colors ${coupon.result === val ? val === 'won' ? 'bg-emerald-500 text-white border-emerald-500' : val === 'lost' ? 'bg-red-500 text-white border-red-500' : 'bg-gray-600 text-white border-gray-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                {val === 'won' ? '🏆 Kazandı' : val === 'lost' ? '❌ Kaybetti' : '⏳ Bekliyor'}
                              </button>
                            ))}
                          </div>

                          {/* Telegram paylaşım butonu */}
                          {coupon.result !== 'pending' && (
                            <button
                              disabled={sharingCouponResult}
                              onClick={async () => {
                                setSharingCouponResult(true);
                                try {
                                  const r = await fetch(`/api/admin/telegram/share-coupon-result/${coupon.id}`, { method: 'POST', credentials: 'include' });
                                  const d = await r.json();
                                  if (r.ok) toast({ description: 'Sonuç Telegram\'a gönderildi' });
                                  else toast({ variant: 'destructive', description: d.message });
                                } finally { setSharingCouponResult(false); }
                              }}
                              className={`w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${coupon.result === 'won' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-[#229ED9] hover:bg-[#1a8fc4] text-white'}`}
                            >
                              {sharingCouponResult ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              {coupon.result === 'won' ? '🏆 Kazandı paylaş' : '❌ Kaybetti paylaş'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {coupons.length === 0 && <p className="text-gray-400 text-center py-10 text-sm">Henüz kupon oluşturulmamış</p>}
            </div>
          </>
        )}

        {/* ═══════════════════ USERS ═══════════════════ */}
        {activeTab === "users" && (
          <>
            <h2 className="text-base font-bold text-gray-800">Kullanıcılar <span className="text-gray-400 font-normal text-sm">({users.length})</span></h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="font-bold text-emerald-600 text-sm">{u.username[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm">{u.username}</p>
                      <p className="text-xs text-gray-400">Kod: {u.referral_code || '-'} · {fmtDate(u.created_at)}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                      {u.role === 'admin' ? 'Admin' : 'Üye'}
                    </span>
                  </div>
                ))}
                {users.length === 0 && <p className="text-gray-400 text-center py-10 text-sm">Henüz kullanıcı yok</p>}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════ INVITATIONS ═══════════════════ */}
        {activeTab === "invitations" && (
          <>
            <h2 className="text-base font-bold text-gray-800">Davetiye Kodları</h2>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex gap-2">
                <input value={newCode.code} onChange={e => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })} placeholder="TUTTURDUK24"
                  className="flex-1 h-9 rounded-xl border border-gray-200 px-3 text-sm font-mono text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 uppercase" />
                <button onClick={generateRandomCode} className="w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-500 transition-colors">
                  <Zap className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <select value={newCode.type} onChange={e => setNewCode({ ...newCode, type: e.target.value })}
                  className="flex-1 h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
                  <option value="standard">Standart</option>
                  <option value="vip">VIP</option>
                  <option value="influencer">Influencer</option>
                </select>
                <input type="number" value={newCode.maxUses} onChange={e => setNewCode({ ...newCode, maxUses: parseInt(e.target.value) || 1 })} min={1}
                  className="w-20 h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                <button onClick={handleCreateCode} className="h-9 px-4 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 flex items-center gap-1 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {invitationCodes.map(code => (
                  <div key={code.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-semibold text-gray-800 text-sm">{code.code}</p>
                      <p className="text-xs text-gray-400">{code.type} · {code.uses}/{code.max_uses} kullanım</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${code.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                      {code.status === 'active' ? 'Aktif' : 'Pasif'}
                    </span>
                    <button onClick={() => handleDeleteCode(code.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {invitationCodes.length === 0 && <p className="text-gray-400 text-center py-10 text-sm">Henüz davetiye kodu yok</p>}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════ SETTINGS ═══════════════════ */}
        {activeTab === "settings" && (
          <>
            <h2 className="text-base font-bold text-gray-800">Ayarlar</h2>

            {/* Telegram Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-[#229ED9]/10 to-transparent">
                <div className="w-9 h-9 rounded-xl bg-[#229ED9] flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Telegram Entegrasyonu</p>
                  <p className="text-xs text-gray-400">Tahminleri gruba otomatik gönder</p>
                </div>
                {tgToken && tgChatId && (
                  <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                    <CheckCircle className="w-3 h-3" /> Aktif
                  </span>
                )}
              </div>

              <div className="p-4 space-y-4">
                {/* Bot Token */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Bot Token</Label>
                  <div className="relative">
                    <Input
                      type={tgTokenVisible ? "text" : "password"}
                      value={tgToken}
                      onChange={e => setTgToken(e.target.value)}
                      placeholder="1234567890:AAE..."
                      className="pr-10 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setTgTokenVisible(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {tgTokenVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-gray-400">
                    BotFather'dan aldığın token. Kimseyle paylaşma.
                  </p>
                </div>

                {/* Chat ID */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Chat ID / Kanal ID</Label>
                  <Input
                    type="text"
                    value={tgChatId}
                    onChange={e => setTgChatId(e.target.value)}
                    placeholder="-1001234567890"
                    className="font-mono text-xs"
                  />
                  <p className="text-[10.5px] text-gray-400">
                    Grubun ID'si. Grupta <span className="font-mono">@userinfobot</span>'a yazarak öğrenebilirsin.
                  </p>
                </div>

                {/* Auto-send toggles */}
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 pt-1">Otomatik Gönderim</p>
                  <label className="flex items-center justify-between py-2 cursor-pointer">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Maç eklenince tek tek gönder</p>
                      <p className="text-[10.5px] text-gray-400">Kapalıysa maçlar otomatik gönderilmez, toplu gönderimi kendin yaparsın</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoSendOnPublish(v => !v)}
                      className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ml-3 ${autoSendOnPublish ? 'bg-emerald-500' : 'bg-gray-200'}`}
                      style={{ width: 40, height: 22 }}
                    >
                      <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${autoSendOnPublish ? 'translate-x-[19px]' : 'translate-x-0.5'}`}
                        style={{ width: 18, height: 18, top: 2, left: autoSendOnPublish ? 20 : 2 }}
                      />
                    </button>
                  </label>
                  <label className="flex items-center justify-between py-2 cursor-pointer">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Sonuç girildiğinde gönder</p>
                      <p className="text-[10.5px] text-gray-400">Maç sonucu eklendiğinde tahmin sonucu bildirilir</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoSendOnResult(v => !v)}
                      className={`relative rounded-full transition-colors shrink-0 ml-3 ${autoSendOnResult ? 'bg-emerald-500' : 'bg-gray-200'}`}
                      style={{ width: 40, height: 22 }}
                    >
                      <span className={`absolute rounded-full bg-white shadow transition-all`}
                        style={{ width: 18, height: 18, top: 2, left: autoSendOnResult ? 20 : 2 }}
                      />
                    </button>
                  </label>
                  <label className="flex items-center justify-between py-2 cursor-pointer">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Maç başladığında bildirim gönder</p>
                      <p className="text-[10.5px] text-gray-400">Kickoff saatinde GIF'li bildirim gönderilir (her dakika kontrol)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoSendKickoff(v => !v)}
                      className={`relative rounded-full transition-colors shrink-0 ml-3 ${autoSendKickoff ? 'bg-emerald-500' : 'bg-gray-200'}`}
                      style={{ width: 40, height: 22 }}
                    >
                      <span className={`absolute rounded-full bg-white shadow transition-all`}
                        style={{ width: 18, height: 18, top: 2, left: autoSendKickoff ? 20 : 2 }}
                      />
                    </button>
                  </label>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={async () => {
                      setSavingSettings(true);
                      try {
                        const r = await fetch('/api/admin/settings', {
                          method: 'POST', credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            telegram_bot_token: tgToken,
                            telegram_chat_id: tgChatId,
                            auto_send_on_publish: String(autoSendOnPublish),
                            auto_send_on_result: String(autoSendOnResult),
                            auto_send_kickoff: String(autoSendKickoff),
                          }),
                        });
                        const d = await r.json();
                        if (r.ok) toast({ description: 'Ayarlar kaydedildi' });
                        else toast({ variant: 'destructive', description: d.message });
                      } finally { setSavingSettings(false); }
                    }}
                    disabled={savingSettings || !tgToken || !tgChatId}
                    className="flex-1 h-9 rounded-lg bg-gray-800 text-white text-xs font-semibold hover:bg-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Kaydet
                  </button>

                  <button
                    onClick={async () => {
                      setTestingTelegram(true);
                      try {
                        const r = await fetch('/api/admin/telegram/test', {
                          method: 'POST', credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ token: tgToken, chatId: tgChatId }),
                        });
                        const d = await r.json();
                        if (r.ok) toast({ description: 'Test mesajı gönderildi! Grubu kontrol et.' });
                        else toast({ variant: 'destructive', description: d.message });
                      } finally { setTestingTelegram(false); }
                    }}
                    disabled={testingTelegram || !tgToken || !tgChatId}
                    className="h-9 px-4 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {testingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Test Et
                  </button>
                </div>
              </div>
            </div>

            {/* Photo Management */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <Upload className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Telegram Fotoğrafları</p>
                  <p className="text-[10.5px] text-gray-400">Mesajlara eklenecek görselleri yükle (maks. 1280px, JPEG)</p>
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { type: 'tahmin', label: 'Tahmin Duyurusu', desc: 'Yeni maç / toplu paylaşım' },
                  { type: 'kazan', label: 'Kazandık', desc: 'Sonuç tuttuğunda' },
                  { type: 'basladi', label: 'Maç Başladı', desc: 'Kickoff bildirimi' },
                ] as const).map(({ type, label, desc }) => (
                  <div key={type} className="border border-gray-100 rounded-xl p-3 flex flex-col gap-2">
                    <div className="aspect-video rounded-lg bg-gray-50 overflow-hidden flex items-center justify-center">
                      <img
                        key={photoTimestamps[type] ?? 0}
                        src={`/telegram-photos/${type}.jpg?t=${photoTimestamps[type] ?? 0}`}
                        alt={label}
                        className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{label}</p>
                      <p className="text-[10px] text-gray-400">{desc}</p>
                    </div>
                    <label className={`h-8 rounded-lg border border-dashed border-gray-300 flex items-center justify-center gap-1.5 text-[11px] font-medium cursor-pointer hover:bg-gray-50 transition-colors ${uploadingPhoto === type ? 'opacity-50 pointer-events-none' : 'text-gray-500'}`}>
                      {uploadingPhoto === type
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Yükleniyor...</>
                        : <><Upload className="w-3.5 h-3.5" /> Fotoğraf Seç</>
                      }
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingPhoto(type);
                          try {
                            const form = new FormData();
                            form.append('photo', file);
                            const r = await fetch(`/api/admin/telegram/upload-photo/${type}`, {
                              method: 'POST', credentials: 'include', body: form,
                            });
                            const d = await r.json();
                            if (r.ok) {
                              toast({ description: d.message });
                              setPhotoTimestamps(ts => ({ ...ts, [type]: Date.now() }));
                            } else {
                              toast({ variant: 'destructive', description: d.message });
                            }
                          } finally { setUploadingPhoto(null); e.target.value = ''; }
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════ DATABASE ═══════════════════ */}
        {activeTab === "database" && (
          <>
            <h2 className="text-base font-bold text-gray-800">Veritabanı Yönetimi</h2>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">{publishedMatches.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Toplam Maç</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{finished.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Biten Maç</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-amber-500">{pending.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Bekleyen</p>
              </div>
            </div>

            {/* Operations */}
            <div className="space-y-3">
              {/* Clear history */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">Geçmişi Temizle</p>
                    <p className="text-xs text-gray-400 mt-0.5 mb-3">Tamamlanan maçları ve tahminlerini siler. Kullanıcılar ve davetiyeler korunur.</p>
                    <button onClick={async () => {
                      if (!confirm("Biten tüm maçlar ve tahminleri silinecek. Devam?")) return;
                      const d = await apiPost('/api/admin/clear-history');
                      if (d.success) { toast({ description: d.message }); loadPublishedMatches(); loadBestBetsStats(); }
                      else toast({ variant: 'destructive', description: d.message });
                    }} className="h-8 px-4 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors">
                      Biten Maçları Temizle
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset DB */}
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-red-700 text-sm">Veritabanını Sıfırla</p>
                    <p className="text-xs text-gray-400 mt-0.5 mb-3">Tüm maçları, tahminleri ve kuponları siler. Kullanıcı hesapları ve davetiyeler korunur. Geri alınamaz.</p>
                    <button onClick={async () => {
                      const code = prompt('Onaylamak için "SIFIRLA" yazın:');
                      if (code !== 'SIFIRLA') { if (code !== null) toast({ variant: 'destructive', description: 'Onay kodu yanlış' }); return; }
                      const d = await apiPost('/api/admin/reset-database', { confirmReset: 'SIFIRLA' });
                      if (d.success) { toast({ description: d.message }); loadPublishedMatches(); loadBestBetsStats(); loadCoupons(); }
                      else toast({ variant: 'destructive', description: d.message });
                    }} className="h-8 px-4 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors">
                      Veritabanını Sıfırla
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}

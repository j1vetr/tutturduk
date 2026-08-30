import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import teamsData from "@/data/teams-static.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LayoutDashboard, Users, Trophy, LogOut, Plus, Trash2, RefreshCcw, 
  CheckCircle, XCircle, Clock, Star, Ticket, Calendar, Loader2,
  TrendingUp, Target, Zap, ChevronRight, ChevronDown, Search,
  Award, Menu, X, Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface InvitationCode {
  id: number;
  code: string;
  type: string;
  max_uses: number;
  uses: number;
  status: string;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  role: string;
  referral_code: string | null;
  created_at: string;
}

interface UpcomingMatch {
  id: number;
  date: string;
  timestamp: number;
  status: { long: string; short: string; elapsed: number | null };
  homeTeam: { id: number; name: string; logo: string };
  awayTeam: { id: number; name: string; logo: string };
  league: { id: number; name: string; logo: string; country: string; round: string };
  goals: { home: number | null; away: number | null };
  localDate: string;
  localTime: string;
}

interface Coupon {
  id: number;
  name: string;
  coupon_date: string;
  combined_odds: number;
  status: string;
  result: string;
  created_at: string;
  predictions?: CouponPrediction[];
}

interface CouponPrediction {
  id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  match_date?: string;
  match_time?: string;
  prediction: string;
  odds?: string;
  result?: string;
}

interface BestBet {
  id: number;
  match_id?: number;
  fixture_id?: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  match_date?: string;
  match_time?: string;
  bet_type: string;
  confidence: number;
  risk_level: string;
  reasoning?: string;
  result?: string;
}

const tabs = [
  { id: "dashboard", icon: LayoutDashboard, label: "Bakış" },
  { id: "predictions", icon: Trophy, label: "Maçlar" },
  { id: "coupons", icon: Ticket, label: "Kuponlar" },
  { id: "users", icon: Users, label: "Üyeler" },
  { id: "invitations", icon: Award, label: "Davetiyeler" },
];

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Data states
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bestBetsStats, setBestBetsStats] = useState<{
    wonCount: number;
    lostCount: number;
    pendingCount: number;
    totalCount: number;
    successRate: number;
    wonBets: any[];
  }>({ wonCount: 0, lostCount: 0, pendingCount: 0, totalCount: 0, successRate: 0, wonBets: [] });
  
  // Match states
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  
  // Coupon states
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCouponName, setNewCouponName] = useState("");
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [couponDetails, setCouponDetails] = useState<Coupon | null>(null);
  const [availableBestBets, setAvailableBestBets] = useState<BestBet[]>([]);
  const [loadingBestBets, setLoadingBestBets] = useState(false);
  
  // Published matches
  const [publishedMatches, setPublishedMatches] = useState<any[]>([]);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  
  // Publish form state (legacy inline form)
  const [publishingMatch, setPublishingMatch] = useState<UpcomingMatch | null>(null);
  const [publishForm, setPublishForm] = useState({ bet_type: '', odds: '', description: '' });

  // Manual match entry form
  const [manualForm, setManualForm] = useState({
    leagueId: '',
    homeTeamId: '',
    awayTeamId: '',
    matchDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }),
    matchTime: '20:00',
    bet_type: '',
    odds: '',
    description: ''
  });
  const [homeTeamSearch, setHomeTeamSearch] = useState('');
  const [awayTeamSearch, setAwayTeamSearch] = useState('');
  const [showHomeDropdown, setShowHomeDropdown] = useState(false);
  const [showAwayDropdown, setShowAwayDropdown] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);

  // Form states
  const [newCode, setNewCode] = useState({ code: "", type: "standard", maxUses: 1 });

  useEffect(() => {
    if (!user) {
      setLocation("/admin-login");
      return;
    }
    loadAllData();
  }, [user, setLocation]);

  useEffect(() => {
    if (activeTab === "predictions") {
      loadPublishedMatches();
    }
  }, [activeTab]);

  const loadAllData = () => {
    loadInvitationCodes();
    loadUsers();
    loadBestBetsStats();
    loadCoupons();
    loadPublishedMatches();
  };

  const loadPublishedMatches = async () => {
    try {
      const res = await fetch('/api/admin/matches', { credentials: 'include' });
      if (res.ok) setPublishedMatches(await res.json());
    } catch (error) {
      console.error('Failed to load published matches:', error);
    }
  };


  const openPublishForm = (match: UpcomingMatch) => {
    setPublishingMatch(match);
    setPublishForm({ bet_type: '', odds: '', description: '' });
  };

  const closePublishForm = () => {
    setPublishingMatch(null);
    setPublishForm({ bet_type: '', odds: '', description: '' });
  };

  const handlePublishSubmit = async () => {
    if (!publishingMatch) return;
    if (!publishForm.bet_type.trim() || !publishForm.odds.trim()) {
      toast({ variant: 'destructive', description: 'Tahmin ve oran zorunludur.' });
      return;
    }
    setPublishingId(publishingMatch.id);
    try {
      const res = await fetch('/api/admin/matches/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fixtureId: publishingMatch.id,
          isFeatured: false,
          manualPrediction: {
            bet_type: publishForm.bet_type.trim(),
            odds: publishForm.odds.trim(),
            description: publishForm.description.trim()
          }
        })
      });
      if (res.ok) {
        toast({ description: `${publishingMatch.homeTeam.name} vs ${publishingMatch.awayTeam.name} yayinlandi` });
        closePublishForm();
        loadPublishedMatches();
      } else {
        const err = await res.json();
        toast({ variant: 'destructive', description: err.message });
      }
    } catch {
      toast({ variant: 'destructive', description: 'Mac yayinlanamadi' });
    } finally {
      setPublishingId(null);
    }
  };

  const unpublishMatch = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/matches/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        toast({ description: "Mac kaldirildi" });
        loadPublishedMatches();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Mac kaldinlamadi" });
    }
  };

  const isMatchPublished = (fixtureId: number) => {
    return publishedMatches.some(m => m.fixture_id === fixtureId);
  };

  const handleManualPublish = async () => {
    const homeTeam = (teamsData.teams as any[]).find(t => String(t.id) === manualForm.homeTeamId);
    const awayTeam = (teamsData.teams as any[]).find(t => String(t.id) === manualForm.awayTeamId);
    const league = (teamsData.leagues as any[]).find(l => String(l.id) === manualForm.leagueId);

    if (!homeTeam || !awayTeam || !league || !manualForm.bet_type || !manualForm.odds) {
      toast({ variant: 'destructive', description: 'Tüm alanları doldurun.' });
      return;
    }

    setSubmittingManual(true);
    try {
      const res = await fetch('/api/admin/matches/publish-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          homeTeam: homeTeam.name,
          awayTeam: awayTeam.name,
          homeLogo: homeTeam.logo,
          awayLogo: awayTeam.logo,
          leagueName: league.name,
          leagueLogo: league.logo,
          leagueId: league.id,
          matchDate: manualForm.matchDate,
          matchTime: manualForm.matchTime,
          bet_type: manualForm.bet_type,
          odds: manualForm.odds,
          description: manualForm.description
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast({ description: `${homeTeam.name} - ${awayTeam.name} yayınlandı.` });
        loadPublishedMatches();
        setManualForm(f => ({ ...f, homeTeamId: '', awayTeamId: '', bet_type: '', odds: '', description: '' }));
        setHomeTeamSearch('');
        setAwayTeamSearch('');
      } else {
        toast({ variant: 'destructive', description: data.message || 'Yayınlanamadı.' });
      }
    } catch {
      toast({ variant: 'destructive', description: 'Bağlantı hatası.' });
    } finally {
      setSubmittingManual(false);
    }
  };

  const loadCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons', { credentials: 'include' });
      if (res.ok) setCoupons(await res.json());
    } catch (error) {
      console.error('Failed to load coupons:', error);
    }
  };

  const loadCouponDetails = async (couponId: number) => {
    try {
      const res = await fetch(`/api/admin/coupons/${couponId}`, { credentials: 'include' });
      if (res.ok) setCouponDetails(await res.json());
    } catch (error) {
      console.error('Failed to load coupon details:', error);
    }
  };

  const loadAvailableBestBets = async () => {
    setLoadingBestBets(true);
    try {
      const res = await fetch('/api/admin/best-bets/all', { credentials: 'include' });
      if (res.ok) setAvailableBestBets(await res.json());
    } catch (error) {
      console.error('Failed to load best bets:', error);
    } finally {
      setLoadingBestBets(false);
    }
  };

  const handleSelectCoupon = async (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    await loadCouponDetails(coupon.id);
    await loadAvailableBestBets();
  };

  const handleAddBestBetToCoupon = async (bestBetId: number) => {
    if (!selectedCoupon) return;
    try {
      const res = await fetch(`/api/admin/coupons/${selectedCoupon.id}/best-bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bestBetId })
      });
      if (res.ok) {
        setCouponDetails(await res.json());
        loadCoupons();
        toast({ description: "Tahmin kupona eklendi" });
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Tahmin eklenemedi" });
    }
  };

  const handleRemoveBestBetFromCoupon = async (bestBetId: number) => {
    if (!selectedCoupon) return;
    try {
      const res = await fetch(`/api/admin/coupons/${selectedCoupon.id}/best-bets/${bestBetId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setCouponDetails(await res.json());
        loadCoupons();
        toast({ description: "Tahmin kupondan cikarildi" });
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Tahmin cikarilamadi" });
    }
  };

  const handleDeleteCoupon = async (couponId: number) => {
    try {
      const res = await fetch(`/api/admin/coupons/${couponId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        loadCoupons();
        setSelectedCoupon(null);
        setCouponDetails(null);
        toast({ description: "Kupon silindi" });
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Kupon silinemedi" });
    }
  };

  const handleCreateCoupon = async () => {
    if (!newCouponName) {
      toast({ variant: "destructive", description: "Kupon adı gerekli" });
      return;
    }
    try {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCouponName, date: today }),
        credentials: 'include'
      });
      if (res.ok) {
        toast({ description: "Kupon oluşturuldu" });
        setNewCouponName("");
        loadCoupons();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Kupon oluşturulamadı" });
    }
  };

  const loadInvitationCodes = async () => {
    try {
      const res = await fetch('/api/admin/invitations', { credentials: 'include' });
      if (res.ok) setInvitationCodes(await res.json());
    } catch (error) {
      console.error('Failed to load invitation codes:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (res.ok) setUsers(await res.json());
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadBestBetsStats = async () => {
    try {
      const res = await fetch('/api/admin/best-bets/stats', { credentials: 'include' });
      if (res.ok) setBestBetsStats(await res.json());
    } catch (error) {
      console.error('Failed to load best bets stats:', error);
    }
  };

  const handleLogout = () => {
    logout();
    setLocation("/admin-login");
  };

  const handleCreateCode = async () => {
    if (!newCode.code) {
      toast({ variant: "destructive", description: "Kod girin" });
      return;
    }
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: newCode.code, type: newCode.type, maxUses: newCode.maxUses }),
        credentials: 'include'
      });
      if (res.ok) {
        toast({ description: "Davetiye kodu oluşturuldu" });
        setNewCode({ code: "", type: "standard", maxUses: 1 });
        loadInvitationCodes();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Kod oluşturulamadı" });
    }
  };

  const handleDeleteCode = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/invitations/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        toast({ description: "Kod silindi" });
        loadInvitationCodes();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Kod silinemedi" });
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewCode({...newCode, code});
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  const groupMatchesByDate = (matches: UpcomingMatch[]) => {
    const groups: { [key: string]: UpcomingMatch[] } = {};
    matches.forEach(match => {
      const dateKey = match.localDate || match.date.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(match);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, matches]) => ({
        date,
        displayDate: new Date(date + 'T12:00:00').toLocaleDateString('tr-TR', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short'
        }),
        matches: matches.sort((a, b) => a.timestamp - b.timestamp)
      }));
  };


  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) newExpanded.delete(date);
    else newExpanded.add(date);
    setExpandedDays(newExpanded);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
            </button>
            <h1 className="text-lg font-bold text-slate-800">
              Admin<span className="text-emerald-500">Panel</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">{user.username}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-slate-700">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white p-2">
            <div className="grid grid-cols-5 gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-emerald-500 text-white' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Desktop Tab Bar */}
        <div className="hidden lg:flex border-t border-slate-100 px-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-emerald-500 text-emerald-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-24">
        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Genel Bakış</h2>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">v12 · Min. %60 güven · Min. %2 değer</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadAllData} className="text-slate-600">
                <RefreshCcw className="w-4 h-4 mr-1" /> Yenile
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{bestBetsStats.successRate}%</p>
                      <p className="text-xs text-slate-500">Basari Orani</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Target className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{publishedMatches.length}</p>
                      <p className="text-xs text-slate-500">Yayındaki Maç</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{users.length}</p>
                      <p className="text-xs text-slate-500">Kullanici</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Award className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{invitationCodes.filter(c => c.status === 'active').length}</p>
                      <p className="text-xs text-slate-500">Aktif Davetiye</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" /> Son Yayınlanan Maçlar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {publishedMatches.slice(0, 5).map(pm => (
                  <div key={pm.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={pm.home_logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                      <span className="text-sm text-slate-700 truncate">{pm.home_team}</span>
                      <span className="text-xs text-slate-400">vs</span>
                      <span className="text-sm text-slate-700 truncate">{pm.away_team}</span>
                      <img src={pm.away_logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                    </div>
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 text-xs flex-shrink-0">
                      {pm.match_time}
                    </Badge>
                  </div>
                ))}
                {publishedMatches.length === 0 && (
                  <p className="text-slate-400 text-center py-4 text-sm">Henüz yayınlanmış maç yok</p>
                )}
              </CardContent>
            </Card>

            {/* Won Bets */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> Son Kazananlar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bestBetsStats.wonBets.slice(0, 5).map((bet: any) => (
                  <div key={bet.id} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{bet.home_team} vs {bet.away_team}</p>
                      <p className="text-xs text-slate-500">{bet.bet_type}</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 border-0">Kazandi</Badge>
                  </div>
                ))}
                {bestBetsStats.wonBets.length === 0 && (
                  <p className="text-slate-400 text-center py-4 text-sm">Henuz kazanan tahmin yok</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Predictions / Matches */}
        {activeTab === "predictions" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Maç Yönetimi</h2>

            {/* Manuel Maç Ekle */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-500" /> Manuel Maç Ekle
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {/* League selector */}
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Lig</Label>
                  <div className="flex flex-wrap gap-2">
                    {teamsData.leagues.map((lg: any) => (
                      <button
                        key={lg.id}
                        onClick={() => setManualForm(f => ({ ...f, leagueId: String(lg.id), homeTeamId: '', awayTeamId: '' }))}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          manualForm.leagueId === String(lg.id)
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <img src={lg.logo} alt="" className="w-4 h-4 object-contain" />
                        {lg.shortName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Teams */}
                {manualForm.leagueId && (
                  <div className="grid grid-cols-2 gap-2">
                    {/* Home Team */}
                    <div className="relative">
                      <Label className="text-xs text-slate-500 mb-1 block">Ev Sahibi</Label>
                      {manualForm.homeTeamId ? (
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                          {(() => { const t = teamsData.teams.find((x: any) => String(x.id) === manualForm.homeTeamId); return t ? (
                            <>
                              <img src={(t as any).logo} alt="" className="w-5 h-5 object-contain" />
                              <span className="text-xs text-slate-700 flex-1 truncate">{(t as any).name}</span>
                              <button onClick={() => setManualForm(f => ({ ...f, homeTeamId: '' }))} className="text-slate-400 hover:text-red-500">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : null; })()}
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <Input
                              placeholder="Takım ara..."
                              value={homeTeamSearch}
                              onChange={e => { setHomeTeamSearch(e.target.value); setShowHomeDropdown(true); }}
                              onFocus={() => setShowHomeDropdown(true)}
                              className="pl-8 h-8 text-xs border-slate-200"
                            />
                          </div>
                          {showHomeDropdown && (
                            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {teamsData.teams
                                .filter((t: any) =>
                                  t.leagues.includes(Number(manualForm.leagueId)) &&
                                  t.id !== Number(manualForm.awayTeamId) &&
                                  t.name.toLowerCase().includes(homeTeamSearch.toLowerCase())
                                )
                                .map((t: any) => (
                                  <button
                                    key={t.id}
                                    onClick={() => { setManualForm(f => ({ ...f, homeTeamId: String(t.id) })); setHomeTeamSearch(''); setShowHomeDropdown(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                                  >
                                    <img src={t.logo} alt="" className="w-5 h-5 object-contain" />
                                    <span className="text-xs text-slate-700">{t.name}</span>
                                  </button>
                                ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="relative">
                      <Label className="text-xs text-slate-500 mb-1 block">Deplasman</Label>
                      {manualForm.awayTeamId ? (
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                          {(() => { const t = teamsData.teams.find((x: any) => String(x.id) === manualForm.awayTeamId); return t ? (
                            <>
                              <img src={(t as any).logo} alt="" className="w-5 h-5 object-contain" />
                              <span className="text-xs text-slate-700 flex-1 truncate">{(t as any).name}</span>
                              <button onClick={() => setManualForm(f => ({ ...f, awayTeamId: '' }))} className="text-slate-400 hover:text-red-500">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : null; })()}
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <Input
                              placeholder="Takım ara..."
                              value={awayTeamSearch}
                              onChange={e => { setAwayTeamSearch(e.target.value); setShowAwayDropdown(true); }}
                              onFocus={() => setShowAwayDropdown(true)}
                              className="pl-8 h-8 text-xs border-slate-200"
                            />
                          </div>
                          {showAwayDropdown && (
                            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {teamsData.teams
                                .filter((t: any) =>
                                  t.leagues.includes(Number(manualForm.leagueId)) &&
                                  t.id !== Number(manualForm.homeTeamId) &&
                                  t.name.toLowerCase().includes(awayTeamSearch.toLowerCase())
                                )
                                .map((t: any) => (
                                  <button
                                    key={t.id}
                                    onClick={() => { setManualForm(f => ({ ...f, awayTeamId: String(t.id) })); setAwayTeamSearch(''); setShowAwayDropdown(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                                  >
                                    <img src={t.logo} alt="" className="w-5 h-5 object-contain" />
                                    <span className="text-xs text-slate-700">{t.name}</span>
                                  </button>
                                ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Date + Time */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Tarih</Label>
                    <Input
                      type="date"
                      value={manualForm.matchDate}
                      onChange={e => setManualForm(f => ({ ...f, matchDate: e.target.value }))}
                      className="h-8 text-xs border-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Saat</Label>
                    <Input
                      type="time"
                      value={manualForm.matchTime}
                      onChange={e => setManualForm(f => ({ ...f, matchTime: e.target.value }))}
                      className="h-8 text-xs border-slate-200"
                    />
                  </div>
                </div>

                {/* Prediction fields */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Tahmin</Label>
                    <Input
                      placeholder="ör. MS1, KG VAR, 2.5 ALT"
                      value={manualForm.bet_type}
                      onChange={e => setManualForm(f => ({ ...f, bet_type: e.target.value }))}
                      className="h-8 text-xs border-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Oran</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="ör. 1.85"
                      value={manualForm.odds}
                      onChange={e => setManualForm(f => ({ ...f, odds: e.target.value }))}
                      className="h-8 text-xs border-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Açıklama (isteğe bağlı)</Label>
                  <Input
                    placeholder="Kısa analiz notu..."
                    value={manualForm.description}
                    onChange={e => setManualForm(f => ({ ...f, description: e.target.value }))}
                    className="h-8 text-xs border-slate-200"
                  />
                </div>

                <Button
                  onClick={handleManualPublish}
                  disabled={submittingManual || !manualForm.homeTeamId || !manualForm.awayTeamId || !manualForm.bet_type || !manualForm.odds}
                  className="w-full bg-emerald-500 text-white hover:bg-emerald-400 h-9"
                  size="sm"
                >
                  {submittingManual ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Maçı Yayınla
                </Button>
              </CardContent>
            </Card>

            {/* Published Matches */}
            {publishedMatches.length > 0 && (
              <Card className="bg-white border-emerald-200">
                <button 
                  onClick={() => toggleDay('published')}
                  className="w-full flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                    <span className="text-sm font-semibold text-slate-700">Yayındaki Maçlar</span>
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">{publishedMatches.length}</Badge>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedDays.has('published') ? 'rotate-180' : ''}`} />
                </button>
                {expandedDays.has('published') && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {publishedMatches.map(pm => (
                      <div key={pm.id} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xs font-mono text-emerald-600 w-12">{pm.match_time}</span>
                          <img src={pm.home_logo} alt="" className="w-4 h-4 object-contain" />
                          <span className="text-xs text-slate-700 truncate">{pm.home_team}</span>
                          <span className="text-[10px] text-slate-400">vs</span>
                          <span className="text-xs text-slate-700 truncate">{pm.away_team}</span>
                          <img src={pm.away_logo} alt="" className="w-4 h-4 object-contain" />
                          {pm.is_featured && <Star className="w-3 h-3 text-amber-500 fill-current" />}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => unpublishMatch(pm.id)}
                          className="h-7 w-7 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Admin Utility Buttons */}
            <details className="group">
              <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 select-none list-none">
                <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" /> Gelişmiş İşlemler
              </summary>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button 
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/re-evaluate', { method: 'POST', credentials: 'include' });
                      const data = await res.json();
                      if (res.ok) toast({ description: data.message });
                      else toast({ variant: 'destructive', description: data.message });
                    } catch { toast({ variant: 'destructive', description: 'İşlem başarısız' }); }
                  }}
                  variant="outline" size="sm"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <RefreshCcw className="w-4 h-4 mr-1" /> Sonuçları Güncelle
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/clear-cache', { method: 'POST', credentials: 'include' });
                      const data = await res.json();
                      if (res.ok) toast({ description: data.message });
                      else toast({ variant: 'destructive', description: data.message });
                    } catch { toast({ variant: 'destructive', description: 'İşlem başarısız' }); }
                  }}
                  variant="outline" size="sm"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <RefreshCcw className="w-4 h-4 mr-1" /> Önbellek Temizle
                </Button>
                <Button 
                  onClick={async () => {
                    if (!confirm("Kaybedilen bahislerin yuzde 40i silinecek. Devam?")) return;
                    try {
                      const res = await fetch('/api/admin/cleanup-lost-bets', { method: 'POST', credentials: 'include' });
                      const data = await res.json();
                      if (res.ok) { toast({ description: data.message }); loadBestBetsStats(); }
                      else toast({ variant: 'destructive', description: data.message });
                    } catch { toast({ variant: 'destructive', description: 'İşlem başarısız' }); }
                  }}
                  variant="outline" size="sm"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                    if (!confirm("Kaybedilen bahislerin yuzde 40i silinecek. Devam?")) return;
                </Button>
                <Button 
                  onClick={async () => {
                    const code = prompt('Veritabanını sıfırlamak için "SIFIRLA" yazın:');
                    if (code !== 'SIFIRLA') { toast({ variant: 'destructive', description: 'Onay kodu yanlış' }); return; }
                    try {
                      const res = await fetch('/api/admin/reset-database', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        credentials: 'include', body: JSON.stringify({ confirmReset: 'SIFIRLA' })
                      });
                      const data = await res.json();
                      if (res.ok) { toast({ description: data.message }); loadPublishedMatches(); }
                      else toast({ variant: 'destructive', description: data.message });
                    } catch { toast({ variant: 'destructive', description: 'İşlem başarısız' }); }
                  }}
                  variant="outline" size="sm"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> DB Sıfırla
                </Button>
              </div>
            </details>
          </div>
        )}

        {/* Coupons */}
        {activeTab === "coupons" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Kupon Yönetimi</h2>

            {/* Create Coupon */}
            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Input 
                    value={newCouponName}
                    onChange={e => setNewCouponName(e.target.value)}
                    placeholder="Kupon adı"
                    className="flex-1 bg-white border-slate-200"
                  />
                  <Button onClick={handleCreateCoupon} className="bg-emerald-500 text-white hover:bg-emerald-400">
                    <Plus className="w-4 h-4 mr-1" /> Oluştur
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Coupon List */}
            <div className="space-y-3">
              {coupons.map(coupon => (
                <Card 
                  key={coupon.id} 
                  className={`bg-white border-slate-200 cursor-pointer transition-all ${
                    selectedCoupon?.id === coupon.id ? 'ring-2 ring-emerald-500' : ''
                  }`}
                  onClick={() => handleSelectCoupon(coupon)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-800">{coupon.name}</h3>
                        <p className="text-xs text-slate-500">{formatDate(coupon.coupon_date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          coupon.result === 'won' ? 'bg-emerald-100 text-emerald-700 border-0' :
                          coupon.result === 'lost' ? 'bg-red-100 text-red-700 border-0' :
                          'bg-amber-100 text-amber-700 border-0'
                        }>
                          {coupon.result === 'won' ? 'Kazandi' : coupon.result === 'lost' ? 'Kaybetti' : 'Bekliyor'}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handleDeleteCoupon(coupon.id); }}
                          className="h-8 w-8 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {coupons.length === 0 && (
                <p className="text-slate-400 text-center py-8 text-sm">Henüz kupon oluşturulmamış</p>
              )}
            </div>

            {/* Selected Coupon Details */}
            {selectedCoupon && (
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">{selectedCoupon.name} - Tahminler</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Added Predictions */}
                  {couponDetails?.predictions && couponDetails.predictions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">Eklenen tahminler:</p>
                      {couponDetails.predictions.map(pred => (
                        <div key={pred.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-700">{pred.home_team} vs {pred.away_team}</span>
                            <Badge variant="outline" className="text-[10px]">{pred.prediction}</Badge>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveBestBetFromCoupon(pred.id)}
                            className="h-6 w-6 text-red-500"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Available Best Bets */}
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">Mevcut tahminler (eklemek için tıkla):</p>
                    {loadingBestBets ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                      </div>
                    ) : availableBestBets.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {availableBestBets.map(bet => (
                          <div 
                            key={bet.id}
                            onClick={() => handleAddBestBetToCoupon(bet.id)}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            <span className="text-xs text-slate-700">{bet.home_team} vs {bet.away_team}</span>
                            <div className="flex items-center gap-1">
                              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">{bet.bet_type}</Badge>
                              <Plus className="w-3.5 h-3.5 text-emerald-500" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">Henuz AI tahmini yok</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Kullanıcı Yönetimi</h2>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-0 divide-y divide-slate-100">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="font-semibold text-emerald-600 text-sm">{u.username[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{u.username}</p>
                        <p className="text-xs text-slate-400">Davetiye: {u.referral_code || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={u.role === 'admin' ? 'bg-red-100 text-red-700 border-0' : 'bg-slate-100 text-slate-600 border-0'}>
                        {u.role === 'admin' ? 'Admin' : 'Üye'}
                      </Badge>
                      <span className="text-xs text-slate-400">{formatDate(u.created_at)}</span>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-slate-400 text-center py-8 text-sm">Henuz kullanici yok</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Invitations */}
        {activeTab === "invitations" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Davetiye Kodları</h2>

            {/* Create Code */}
            <Card className="bg-white border-slate-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-2">
                  <Input 
                    value={newCode.code}
                    onChange={e => setNewCode({...newCode, code: e.target.value.toUpperCase()})}
                    placeholder="TUTTURDUK24"
                    className="flex-1 font-mono bg-white border-slate-200"
                  />
                  <Button variant="outline" onClick={generateRandomCode} className="text-slate-600">
                    <Zap className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Select value={newCode.type} onValueChange={v => setNewCode({...newCode, type: v})}>
                    <SelectTrigger className="flex-1 bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standart</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="influencer">Influencer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number"
                    value={newCode.maxUses}
                    onChange={e => setNewCode({...newCode, maxUses: parseInt(e.target.value) || 1})}
                    className="w-20 bg-white border-slate-200"
                    min={1}
                  />
                  <Button onClick={handleCreateCode} className="bg-emerald-500 text-white hover:bg-emerald-400">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Code List */}
            <Card className="bg-white border-slate-200">
              <CardContent className="p-0 divide-y divide-slate-100">
                {invitationCodes.map(code => (
                  <div key={code.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Award className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-mono font-semibold text-slate-800 text-sm">{code.code}</p>
                        <p className="text-xs text-slate-400">{code.uses}/{code.max_uses} kullanim</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={code.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-slate-100 text-slate-500 border-0'}>
                        {code.status === 'active' ? 'Aktif' : 'Pasif'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteCode(code.id)}
                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {invitationCodes.length === 0 && (
                  <p className="text-slate-400 text-center py-8 text-sm">Henuz davetiye kodu yok</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LayoutDashboard, Users, Trophy, LogOut, Plus, Trash2, RefreshCcw, 
  CheckCircle, XCircle, Clock, Star, Ticket, Calendar, Loader2,
  TrendingUp, Target, Zap, Eye, ChevronRight, Search, Filter,
  BarChart3, Award, Sparkles, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getLeague } from "@/lib/teamsData";

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

interface Prediction {
  id: number;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  league_id: string;
  league_name?: string;
  league_logo?: string;
  prediction: string;
  odds: number;
  match_time: string;
  match_date: string | null;
  analysis: string | null;
  confidence?: string;
  is_hero: boolean;
  result: string;
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

interface ApiPrediction {
  winner: { id: number; name: string; comment: string } | null;
  advice: string;
  percent: { home: string; draw: string; away: string };
  underOver: string | null;
  goals: { home: string; away: string };
  comparison: {
    form: { home: string; away: string };
    att: { home: string; away: string };
    def: { home: string; away: string };
    total: { home: string; away: string };
  };
  teams: { home: any; away: any };
  h2h: { date: string; homeTeam: string; awayTeam: string; homeGoals: number; awayGoals: number }[];
}

interface Coupon {
  id: number;
  name: string;
  coupon_date: string;
  combined_odds: number;
  status: string;
  result: string;
  created_at: string;
  predictions?: Prediction[];
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Data states
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [wonPredictions, setWonPredictions] = useState<Prediction[]>([]);
  const [lostPredictions, setLostPredictions] = useState<Prediction[]>([]);
  
  // Match & prediction states
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<UpcomingMatch | null>(null);
  const [apiPrediction, setApiPrediction] = useState<ApiPrediction | null>(null);
  const [loadingApiPrediction, setLoadingApiPrediction] = useState(false);
  const [matchFilter, setMatchFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Coupon states
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [newCouponName, setNewCouponName] = useState("");
  const [newCouponDate, setNewCouponDate] = useState("");
  
  // Published matches
  const [publishedMatches, setPublishedMatches] = useState<any[]>([]);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  
  // Form states
  const [newCode, setNewCode] = useState({ code: "", type: "standard", maxUses: 1 });
  const [newPrediction, setNewPrediction] = useState({
    home: "", away: "", homeLogo: "", awayLogo: "",
    prediction: "", odds: "", leagueId: "", leagueName: "",
    leagueLogo: "", time: "", date: "", analysis: "",
    confidence: "medium", isHero: false
  });

  useEffect(() => {
    if (!user) {
      setLocation("/admin-login");
      return;
    }
    loadAllData();
  }, [user, setLocation]);

  useEffect(() => {
    if (activeTab === "predictions" && upcomingMatches.length === 0) {
      loadUpcomingMatches();
    }
  }, [activeTab]);

  const loadAllData = () => {
    loadInvitationCodes();
    loadUsers();
    loadPredictions();
    loadWonPredictions();
    loadLostPredictions();
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

  const publishMatch = async (match: UpcomingMatch, isFeatured = false) => {
    setPublishingId(match.id);
    try {
      const res = await fetch('/api/admin/matches/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fixtureId: match.id, isFeatured })
      });
      if (res.ok) {
        toast({ title: "Maç yayınlandı!", description: `${match.homeTeam.name} vs ${match.awayTeam.name}` });
        loadPublishedMatches();
      } else {
        const err = await res.json();
        toast({ title: "Hata", description: err.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Hata", description: "Maç yayınlanamadı", variant: "destructive" });
    } finally {
      setPublishingId(null);
    }
  };

  const unpublishMatch = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/matches/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        toast({ title: "Maç kaldırıldı" });
        loadPublishedMatches();
      }
    } catch (error) {
      toast({ title: "Hata", description: "Maç kaldırılamadı", variant: "destructive" });
    }
  };

  const isMatchPublished = (fixtureId: number) => {
    return publishedMatches.some(m => m.fixture_id === fixtureId);
  };

  const loadUpcomingMatches = async () => {
    setLoadingMatches(true);
    try {
      const res = await fetch('/api/football/fixtures');
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((m: any) => ({
          ...m,
          localDate: new Date(m.date).toLocaleDateString('tr-TR'),
          localTime: new Date(m.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        }));
        setUpcomingMatches(formatted);
      }
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setLoadingMatches(false);
    }
  };

  const loadApiPrediction = async (fixtureId: number) => {
    setLoadingApiPrediction(true);
    try {
      const res = await fetch(`/api/football/predictions/${fixtureId}`);
      if (res.ok) {
        const data = await res.json();
        setApiPrediction(data);
      }
    } catch (error) {
      console.error('Failed to load API prediction:', error);
    } finally {
      setLoadingApiPrediction(false);
    }
  };

  const handleSelectMatch = async (match: UpcomingMatch) => {
    setSelectedMatch(match);
    setNewPrediction({
      home: match.homeTeam.name,
      away: match.awayTeam.name,
      homeLogo: match.homeTeam.logo,
      awayLogo: match.awayTeam.logo,
      prediction: "",
      odds: "",
      leagueId: match.league.id.toString(),
      leagueName: match.league.name,
      leagueLogo: match.league.logo,
      time: match.localTime,
      date: match.date.split('T')[0],
      analysis: "",
      confidence: "medium",
      isHero: false
    });
    await loadApiPrediction(match.id);
  };

  const handleCancelSelection = () => {
    setSelectedMatch(null);
    setApiPrediction(null);
    setNewPrediction({
      home: "", away: "", homeLogo: "", awayLogo: "",
      prediction: "", odds: "", leagueId: "", leagueName: "",
      leagueLogo: "", time: "", date: "", analysis: "",
      confidence: "medium", isHero: false
    });
  };

  const loadCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons', { credentials: 'include' });
      if (res.ok) setCoupons(await res.json());
    } catch (error) {
      console.error('Failed to load coupons:', error);
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

  const loadPredictions = async () => {
    try {
      const res = await fetch('/api/predictions/pending', { credentials: 'include' });
      if (res.ok) setPredictions(await res.json());
    } catch (error) {
      console.error('Failed to load predictions:', error);
    }
  };

  const loadWonPredictions = async () => {
    try {
      const res = await fetch('/api/predictions/won', { credentials: 'include' });
      if (res.ok) setWonPredictions(await res.json());
    } catch (error) {
      console.error('Failed to load won predictions:', error);
    }
  };

  const loadLostPredictions = async () => {
    try {
      const res = await fetch('/api/predictions/lost', { credentials: 'include' });
      if (res.ok) setLostPredictions(await res.json());
    } catch (error) {
      console.error('Failed to load lost predictions:', error);
    }
  };

  const handleLogout = () => {
    logout();
    setLocation("/admin-login");
  };

  const handleCreateCode = async () => {
    if (!newCode.code) {
      toast({ variant: "destructive", description: "Lütfen kod girin." });
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
        toast({ description: "Davetiye kodu oluşturuldu.", className: "bg-green-500 text-white border-none" });
        setNewCode({ code: "", type: "standard", maxUses: 1 });
        loadInvitationCodes();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Kod oluşturulamadı." });
    }
  };

  const handleDeleteCode = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/invitations/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        toast({ description: "Kod silindi.", className: "bg-green-500 text-white border-none" });
        loadInvitationCodes();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Kod silinemedi." });
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewCode({...newCode, code});
  };

  const handleCreatePrediction = async () => {
    if (!newPrediction.home || !newPrediction.away || !newPrediction.prediction) {
      toast({ variant: "destructive", description: "Takımlar ve tahmin zorunludur." });
      return;
    }
    if (!newPrediction.odds) {
      toast({ variant: "destructive", description: "Oran giriniz." });
      return;
    }
    try {
      const res = await fetch('/api/admin/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_team: newPrediction.home,
          away_team: newPrediction.away,
          home_logo: newPrediction.homeLogo,
          away_logo: newPrediction.awayLogo,
          league_id: newPrediction.leagueId,
          league_name: newPrediction.leagueName,
          league_logo: newPrediction.leagueLogo,
          prediction: newPrediction.prediction,
          odds: newPrediction.odds,
          match_time: newPrediction.time,
          match_date: newPrediction.date || null,
          analysis: newPrediction.analysis,
          confidence: newPrediction.confidence,
          is_hero: newPrediction.isHero
        }),
        credentials: 'include'
      });
      if (res.ok) {
        toast({ description: "Tahmin yayınlandı!", className: "bg-green-500 text-white border-none" });
        handleCancelSelection();
        loadPredictions();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Tahmin eklenemedi." });
    }
  };

  const handleDeletePrediction = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/predictions/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        toast({ description: "Tahmin silindi.", className: "bg-green-500 text-white border-none" });
        loadPredictions();
        loadWonPredictions();
        loadLostPredictions();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Tahmin silinemedi." });
    }
  };

  const handleMarkResult = async (id: number, result: 'won' | 'lost') => {
    try {
      const res = await fetch(`/api/admin/predictions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
        credentials: 'include'
      });
      if (res.ok) {
        toast({ description: result === 'won' ? "Kazandı!" : "Kaybetti.", className: result === 'won' ? "bg-green-500 text-white border-none" : "bg-red-500 text-white border-none" });
        loadPredictions();
        loadWonPredictions();
        loadLostPredictions();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Güncellenemedi." });
    }
  };

  const handleSetAsHero = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/predictions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hero: true }),
        credentials: 'include'
      });
      if (res.ok) {
        toast({ description: "Günün tahmini olarak ayarlandı!", className: "bg-primary text-black border-none" });
        loadPredictions();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Güncellenemedi." });
    }
  };

  const handleCreateCoupon = async () => {
    if (!newCouponName || !newCouponDate) {
      toast({ variant: "destructive", description: "Kupon adı ve tarih gerekli." });
      return;
    }
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCouponName, date: newCouponDate }),
        credentials: 'include'
      });
      if (res.ok) {
        toast({ description: "Kupon oluşturuldu!", className: "bg-green-500 text-white border-none" });
        setNewCouponName("");
        setNewCouponDate("");
        loadCoupons();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Kupon oluşturulamadı." });
    }
  };

  const getFilteredMatches = () => {
    let filtered = upcomingMatches;
    if (matchFilter !== "all") {
      filtered = filtered.filter(m => m.league.id.toString() === matchFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.homeTeam.name.toLowerCase().includes(q) ||
        m.awayTeam.name.toLowerCase().includes(q) ||
        m.league.name.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const getUniqueLeagues = () => {
    const leaguesMap = new Map();
    upcomingMatches.forEach(m => {
      if (!leaguesMap.has(m.league.id)) {
        leaguesMap.set(m.league.id, { id: m.league.id, name: m.league.name, logo: m.league.logo });
      }
    });
    return Array.from(leaguesMap.values());
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  const successRate = wonPredictions.length + lostPredictions.length > 0 
    ? Math.round((wonPredictions.length / (wonPredictions.length + lostPredictions.length)) * 100) 
    : 0;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-display font-black text-white tracking-tight">
              TUTTURDUK<span className="text-primary">.COM</span>
            </h1>
            <Badge variant="outline" className="border-primary/50 text-primary">Admin Panel</Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">Hoş geldin, <span className="text-white font-medium">{user.username}</span></span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-400 hover:text-white">
              <LogOut className="w-4 h-4 mr-2" /> Çıkış
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-64px)] bg-zinc-900/50 border-r border-white/5 hidden lg:block">
          <nav className="p-4 space-y-2">
            {[
              { id: "dashboard", icon: LayoutDashboard, label: "Genel Bakış" },
              { id: "predictions", icon: Trophy, label: "Tahminler" },
              { id: "coupons", icon: Ticket, label: "Kuponlar" },
              { id: "users", icon: Users, label: "Kullanıcılar" },
              { id: "invitations", icon: Award, label: "Davetiye Kodları" },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === item.id 
                    ? "bg-primary text-black font-semibold" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Mobile Tab Bar */}
          <div className="lg:hidden mb-6 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {[
                { id: "dashboard", icon: LayoutDashboard, label: "Bakış" },
                { id: "predictions", icon: Trophy, label: "Tahminler" },
                { id: "coupons", icon: Ticket, label: "Kuponlar" },
                { id: "users", icon: Users, label: "Kullanıcılar" },
                { id: "invitations", icon: Award, label: "Davetiyeler" },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${
                    activeTab === item.id 
                      ? "bg-primary text-black font-semibold" 
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold text-white">Genel Bakış</h2>
                <Button variant="outline" size="sm" onClick={loadAllData} className="border-white/10">
                  <RefreshCcw className="w-4 h-4 mr-2" /> Yenile
                </Button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-400 mb-1">Başarı Oranı</p>
                        <p className="text-3xl font-bold text-white">{successRate}%</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-green-400" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs">
                      <ArrowUpRight className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">{wonPredictions.length} kazanılan</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-400 mb-1">Aktif Tahminler</p>
                        <p className="text-3xl font-bold text-white">{predictions.length}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Target className="w-6 h-6 text-blue-400" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs">
                      <Clock className="w-3 h-3 text-blue-400" />
                      <span className="text-blue-400">Sonuç bekleniyor</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-400 mb-1">Kullanıcılar</p>
                        <p className="text-3xl font-bold text-white">{users.length}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Users className="w-6 h-6 text-purple-400" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs">
                      <Zap className="w-3 h-3 text-purple-400" />
                      <span className="text-purple-400">{invitationCodes.filter(c => c.status === 'active').length} aktif davetiye</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-amber-400 mb-1">Toplam Kupon</p>
                        <p className="text-3xl font-bold text-white">{coupons.length}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Ticket className="w-6 h-6 text-amber-400" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs">
                      <BarChart3 className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-400">{coupons.filter(c => c.result === 'won').length} kazanan kupon</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-zinc-900/50 border-white/5">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" /> Son Tahminler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {predictions.slice(0, 5).map(pred => (
                      <div key={pred.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div>
                          <p className="font-medium text-white text-sm">{pred.home_team} vs {pred.away_team}</p>
                          <p className="text-xs text-zinc-500">{pred.prediction} @ {pred.odds}</p>
                        </div>
                        <Badge variant="outline" className="text-primary border-primary/30">{pred.confidence}</Badge>
                      </div>
                    ))}
                    {predictions.length === 0 && (
                      <p className="text-zinc-500 text-center py-4">Henüz aktif tahmin yok</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-white/5">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" /> Son Kazananlar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {wonPredictions.slice(0, 5).map(pred => (
                      <div key={pred.id} className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                        <div>
                          <p className="font-medium text-white text-sm">{pred.home_team} vs {pred.away_team}</p>
                          <p className="text-xs text-zinc-500">{pred.prediction} @ {pred.odds}</p>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Kazandı</Badge>
                      </div>
                    ))}
                    {wonPredictions.length === 0 && (
                      <p className="text-zinc-500 text-center py-4">Henüz kazanan tahmin yok</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Predictions Tab */}
          {activeTab === "predictions" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold text-white">Maç Yayınlama</h2>
                <div className="flex gap-2">
                  <Button onClick={loadPublishedMatches} variant="outline" size="sm" className="border-white/10">
                    <RefreshCcw className="w-4 h-4 mr-2" /> Yenile
                  </Button>
                  <Button onClick={loadUpcomingMatches} variant="outline" size="sm" className="border-white/10">
                    <Calendar className="w-4 h-4 mr-2" /> Maçları Getir
                  </Button>
                </div>
              </div>

              {/* Published Matches */}
              {publishedMatches.length > 0 && (
                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" /> Yayındaki Maçlar ({publishedMatches.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {publishedMatches.map(pm => (
                        <div key={pm.id} className="flex items-center justify-between p-3 rounded-lg bg-black/30">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {pm.home_logo && <img src={pm.home_logo} alt="" className="w-5 h-5" />}
                              <span className="text-white text-sm">{pm.home_team}</span>
                            </div>
                            <span className="text-zinc-500 text-xs">vs</span>
                            <div className="flex items-center gap-2">
                              {pm.away_logo && <img src={pm.away_logo} alt="" className="w-5 h-5" />}
                              <span className="text-white text-sm">{pm.away_team}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">{pm.match_date} {pm.match_time}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => unpublishMatch(pm.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Match Selection */}
                <Card className="bg-zinc-900/50 border-white/5">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" /> Yaklaşan Maçlar
                    </CardTitle>
                    <CardDescription>Tahmin eklemek için maç seçin</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input 
                          placeholder="Takım veya lig ara..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="pl-9 bg-black/50 border-white/10 text-white"
                        />
                      </div>
                      <Select value={matchFilter} onValueChange={setMatchFilter}>
                        <SelectTrigger className="w-48 bg-black/50 border-white/10 text-white">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Lig filtrele" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10">
                          <SelectItem value="all">Tüm Ligler</SelectItem>
                          {getUniqueLeagues().map(league => (
                            <SelectItem key={league.id} value={league.id.toString()}>
                              <div className="flex items-center gap-2">
                                <img src={league.logo} alt="" className="w-4 h-4" />
                                {league.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Match List */}
                    {loadingMatches ? (
                      <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                        <p className="text-zinc-500">Maçlar yükleniyor...</p>
                      </div>
                    ) : getFilteredMatches().length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-500">
                          {upcomingMatches.length === 0 
                            ? "Maç bulunamadı. API ücretli üyelik gerekebilir." 
                            : "Filtreye uygun maç yok."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 max-h-[500px] overflow-y-auto pr-2">
                        {getFilteredMatches().map(match => {
                          const published = isMatchPublished(match.id);
                          return (
                            <div
                              key={match.id}
                              className={`p-4 rounded-xl transition-all border ${published ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-transparent hover:border-primary/30'}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="text-center min-w-[60px]">
                                    <p className="text-xs text-zinc-500">{match.localDate}</p>
                                    <p className="text-sm font-bold text-primary">{match.localTime}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <img src={match.league.logo} alt="" className="w-5 h-5 object-contain" />
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2">
                                        <img src={match.homeTeam.logo} alt="" className="w-6 h-6 object-contain" />
                                        <span className="text-white font-medium text-sm">{match.homeTeam.name}</span>
                                      </div>
                                      <span className="text-zinc-600 text-sm">vs</span>
                                      <div className="flex items-center gap-2">
                                        <img src={match.awayTeam.logo} alt="" className="w-6 h-6 object-contain" />
                                        <span className="text-white font-medium text-sm">{match.awayTeam.name}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {published ? (
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                      <CheckCircle className="w-3 h-3 mr-1" /> Yayında
                                    </Badge>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      onClick={() => publishMatch(match)}
                                      disabled={publishingId === match.id}
                                      className="bg-primary text-black hover:bg-white font-semibold"
                                    >
                                      {publishingId === match.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <>
                                          <Plus className="w-4 h-4 mr-1" /> Yayınla
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

              {/* Active Predictions */}
              <Card className="bg-zinc-900/50 border-white/5">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-500" /> Aktif Tahminler ({predictions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {predictions.length === 0 ? (
                    <p className="text-zinc-500 text-center py-8">Henüz aktif tahmin yok</p>
                  ) : (
                    <div className="space-y-3">
                      {predictions.map(pred => (
                        <div key={pred.id} className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              {pred.is_hero && (
                                <Badge className="bg-primary/20 text-primary">
                                  <Star className="w-3 h-3 mr-1" /> HERO
                                </Badge>
                              )}
                              <span className="font-bold text-white">{pred.home_team} vs {pred.away_team}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-white border-white/20">{pred.prediction}</Badge>
                              <Badge variant="outline" className="text-primary border-primary/30">{pred.odds}x</Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-zinc-500">
                              {getLeague(pred.league_id)?.name || pred.league_id} • {formatDate(pred.match_date)} • {pred.match_time}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost" onClick={() => handleSetAsHero(pred.id)} className="text-primary hover:bg-primary/20">
                                <Star className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleMarkResult(pred.id, 'won')} className="text-green-500 hover:bg-green-500/20">
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleMarkResult(pred.id, 'lost')} className="text-red-500 hover:bg-red-500/20">
                                <XCircle className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeletePrediction(pred.id)} className="text-zinc-500 hover:bg-zinc-500/20">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Coupons Tab */}
          {activeTab === "coupons" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-bold text-white">Kupon Yönetimi</h2>
              
              <Card className="bg-zinc-900/50 border-white/5">
                <CardHeader>
                  <CardTitle className="text-white">Yeni Kupon Oluştur</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label className="text-zinc-400">Kupon Adı</Label>
                      <Input 
                        value={newCouponName}
                        onChange={e => setNewCouponName(e.target.value)}
                        placeholder="Günün Kuponu"
                        className="bg-black/50 border-white/10 text-white mt-1"
                      />
                    </div>
                    <div className="w-48">
                      <Label className="text-zinc-400">Tarih</Label>
                      <Input 
                        type="date"
                        value={newCouponDate}
                        onChange={e => setNewCouponDate(e.target.value)}
                        className="bg-black/50 border-white/10 text-white mt-1"
                      />
                    </div>
                    <Button onClick={handleCreateCoupon} className="bg-primary text-black font-bold">
                      <Plus className="w-4 h-4 mr-2" /> Oluştur
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                {coupons.map(coupon => (
                  <Card key={coupon.id} className="bg-zinc-900/50 border-white/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-white">{coupon.name}</h3>
                          <p className="text-sm text-zinc-500">{formatDate(coupon.coupon_date)} • {coupon.combined_odds}x kombine</p>
                        </div>
                        <Badge className={
                          coupon.result === 'won' ? 'bg-green-500/20 text-green-400' :
                          coupon.result === 'lost' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }>
                          {coupon.result === 'won' ? 'Kazandı' : coupon.result === 'lost' ? 'Kaybetti' : 'Bekliyor'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {coupons.length === 0 && (
                  <p className="text-zinc-500 text-center py-8">Henüz kupon oluşturulmamış</p>
                )}
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-bold text-white">Kullanıcı Yönetimi</h2>
              
              <Card className="bg-zinc-900/50 border-white/5">
                <CardContent className="p-0">
                  <div className="divide-y divide-white/5">
                    {users.map(u => (
                      <div key={u.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                            <span className="font-bold text-primary">{u.username[0].toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-white">{u.username}</p>
                            <p className="text-xs text-zinc-500">Davetiye: {u.referral_code || '-'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            u.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                            u.role === 'vip' ? 'bg-primary/20 text-primary' :
                            'bg-zinc-500/20 text-zinc-400'
                          }>
                            {u.role.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-zinc-500">{formatDate(u.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Invitations Tab */}
          {activeTab === "invitations" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-bold text-white">Davetiye Kodları</h2>
              
              <Card className="bg-zinc-900/50 border-white/5">
                <CardHeader>
                  <CardTitle className="text-white">Yeni Davetiye Kodu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <Label className="text-zinc-400">Kod</Label>
                      <div className="flex gap-2 mt-1">
                        <Input 
                          value={newCode.code}
                          onChange={e => setNewCode({...newCode, code: e.target.value.toUpperCase()})}
                          placeholder="TUTTURDUK24"
                          className="bg-black/50 border-white/10 text-white font-mono"
                        />
                        <Button variant="outline" onClick={generateRandomCode} className="border-white/10">
                          <RefreshCcw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="w-36">
                      <Label className="text-zinc-400">Tür</Label>
                      <Select value={newCode.type} onValueChange={v => setNewCode({...newCode, type: v})}>
                        <SelectTrigger className="bg-black/50 border-white/10 text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10">
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="vip">VIP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-28">
                      <Label className="text-zinc-400">Max Kullanım</Label>
                      <Input 
                        type="number"
                        value={newCode.maxUses}
                        onChange={e => setNewCode({...newCode, maxUses: parseInt(e.target.value) || 1})}
                        className="bg-black/50 border-white/10 text-white mt-1"
                      />
                    </div>
                    <Button onClick={handleCreateCode} className="bg-primary text-black font-bold">
                      <Plus className="w-4 h-4 mr-2" /> Oluştur
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-white/5">
                <CardContent className="p-0">
                  <div className="divide-y divide-white/5">
                    {invitationCodes.map(code => (
                      <div key={code.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                            <Ticket className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-mono font-bold text-white tracking-wider">{code.code}</p>
                            <p className="text-xs text-zinc-500">{code.uses}/{code.max_uses} kullanım</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={code.type === 'vip' ? 'bg-primary/20 text-primary' : 'bg-zinc-500/20 text-zinc-400'}>
                            {code.type.toUpperCase()}
                          </Badge>
                          <Badge className={code.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                            {code.status === 'active' ? 'Aktif' : 'Kullanıldı'}
                          </Badge>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteCode(code.id)} className="text-red-500 hover:bg-red-500/20">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

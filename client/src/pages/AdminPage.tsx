import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LayoutDashboard, Users, Trophy, LogOut, Plus, Trash2, RefreshCcw, 
  CheckCircle, XCircle, Clock, Star, Ticket, Calendar, Loader2,
  TrendingUp, Target, Zap, ChevronRight, ChevronDown, Search,
  Award, Menu, X, Check, Brain
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
  { id: "dashboard", icon: LayoutDashboard, label: "Bakis" },
  { id: "predictions", icon: Trophy, label: "Maclar" },
  { id: "coupons", icon: Ticket, label: "Kuponlar" },
  { id: "users", icon: Users, label: "Uyeler" },
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
  
  // AI Check states
  const [aiCheckResults, setAiCheckResults] = useState<Map<number, { karar: string; prediction?: any; reason?: string }>>(new Map());
  const [aiCheckLoading, setAiCheckLoading] = useState(false);
  const [aiCheckProgress, setAiCheckProgress] = useState({ current: 0, total: 0 });
  const [bulkPublishing, setBulkPublishing] = useState(false);
  
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
    if (activeTab === "predictions" && upcomingMatches.length === 0) {
      loadUpcomingMatches(true);
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

  const loadUpcomingMatches = async (validated: boolean = false) => {
    setLoadingMatches(true);
    try {
      if (validated) {
        toast({ description: "Kaliteli maclar yukleniyor..." });
        const res = await fetch('/api/football/fixtures-validated');
        if (res.ok) {
          const data = await res.json();
          const matchesArray = data.matches || data;
          const formatted = matchesArray.map((m: any) => ({
            id: m.id,
            date: m.date,
            timestamp: m.timestamp,
            status: { long: 'Not Started', short: 'NS', elapsed: null },
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            league: m.league,
            goals: m.goals || { home: null, away: null },
            localDate: m.localDate,
            localTime: m.localTime,
            validated: true
          }));
          setUpcomingMatches(formatted);
          
          const unpublishedIds = formatted.filter((m: any) => !publishedMatches.some((p: any) => p.fixture_id === m.id)).map((m: any) => m.id);
          loadCachedAIResults(unpublishedIds);
          
          toast({ description: `${matchesArray.length} mac yuklendi` });
        }
      }
    } catch (error) {
      console.error('Failed to load predictions:', error);
      toast({ variant: "destructive", description: "Maclar yuklenemedi" });
    } finally {
      setLoadingMatches(false);
    }
  };

  const loadCachedAIResults = async (fixtureIds: number[]) => {
    if (fixtureIds.length === 0) return;
    try {
      const res = await fetch('/api/admin/matches/ai-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fixtureIds })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const newResults = new Map<number, { karar: string; prediction?: any; reason?: string }>();
          for (const result of data.results) {
            newResults.set(result.fixtureId, {
              karar: result.karar,
              prediction: result.prediction,
              reason: result.reason
            });
          }
          setAiCheckResults(newResults);
        }
      }
    } catch (error) {
      console.error('Failed to load cached AI results:', error);
    }
  };

  const runAICheck = async () => {
    if (upcomingMatches.length === 0) {
      toast({ variant: "destructive", description: "Once maclari yukleyin" });
      return;
    }
    
    const unpublishedMatches = upcomingMatches.filter(m => !isMatchPublished(m.id));
    if (unpublishedMatches.length === 0) {
      toast({ description: "Tum maclar zaten yayinlanmis" });
      return;
    }
    
    const fixtureIds = unpublishedMatches.map(m => m.id);
    setAiCheckLoading(true);
    setAiCheckProgress({ current: 0, total: fixtureIds.length });
    setAiCheckResults(new Map());
    
    const newResults = new Map<number, { karar: string; prediction?: any; reason?: string }>();
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 3000;
    
    try {
      toast({ description: `${fixtureIds.length} mac analiz edilecek` });
      
      for (let i = 0; i < fixtureIds.length; i += BATCH_SIZE) {
        const batch = fixtureIds.slice(i, i + BATCH_SIZE);
        
        const res = await fetch('/api/admin/matches/ai-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ fixtureIds: batch })
        });
        
        if (res.ok) {
          const data = await res.json();
          for (const result of data.results) {
            newResults.set(result.fixtureId, {
              karar: result.karar,
              prediction: result.prediction,
              reason: result.reason
            });
          }
          setAiCheckResults(new Map(newResults));
          setAiCheckProgress({ current: Math.min(i + BATCH_SIZE, fixtureIds.length), total: fixtureIds.length });
        }
        
        if (i + BATCH_SIZE < fixtureIds.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }
      
      const bahisCount = Array.from(newResults.values()).filter(r => r.karar === 'bahis').length;
      toast({ description: `${bahisCount} bahis bulundu` });
    } catch (error) {
      toast({ variant: "destructive", description: "AI kontrol basarisiz" });
    } finally {
      setAiCheckLoading(false);
    }
  };

  const publishMatch = async (match: UpcomingMatch) => {
    setPublishingId(match.id);
    try {
      const res = await fetch('/api/admin/matches/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fixtureId: match.id, isFeatured: false })
      });
      if (res.ok) {
        toast({ description: `${match.homeTeam.name} vs ${match.awayTeam.name} yayinlandi` });
        loadPublishedMatches();
      } else {
        const err = await res.json();
        toast({ variant: "destructive", description: err.message });
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Mac yayinlanamadi" });
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
      toast({ variant: "destructive", description: "Mac kaldirilamadi" });
    }
  };

  const isMatchPublished = (fixtureId: number) => {
    return publishedMatches.some(m => m.fixture_id === fixtureId);
  };

  const publishTodayMatches = async () => {
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
    
    const bahisMatches = upcomingMatches.filter(m => {
      const aiResult = aiCheckResults.get(m.id);
      const matchDate = m.localDate || m.date.split('T')[0];
      return aiResult?.karar === 'bahis' && matchDate === todayStr && !isMatchPublished(m.id);
    });
    
    if (bahisMatches.length === 0) {
      toast({ variant: 'destructive', description: 'Bugun icin AI onayli mac bulunamadi' });
      return;
    }
    
    setBulkPublishing(true);
    let success = 0;
    
    for (const match of bahisMatches) {
      try {
        const res = await fetch('/api/admin/matches/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ fixtureId: match.id, isFeatured: false })
        });
        if (res.ok) success++;
      } catch {}
    }
    
    setBulkPublishing(false);
    loadPublishedMatches();
    toast({ description: `${success} mac yayinlandi` });
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
      toast({ variant: "destructive", description: "Kupon adi gerekli" });
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
        toast({ description: "Kupon olusturuldu" });
        setNewCouponName("");
        loadCoupons();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Kupon olusturulamadi" });
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
        toast({ description: "Davetiye kodu olusturuldu" });
        setNewCode({ code: "", type: "standard", maxUses: 1 });
        loadInvitationCodes();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Kod olusturulamadi" });
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

  const getFilteredMatches = () => {
    if (!searchQuery) return upcomingMatches;
    const q = searchQuery.toLowerCase();
    return upcomingMatches.filter(m => 
      m.homeTeam.name.toLowerCase().includes(q) ||
      m.awayTeam.name.toLowerCase().includes(q) ||
      m.league.name.toLowerCase().includes(q)
    );
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
              <h2 className="text-lg font-bold text-slate-800">Genel Bakis</h2>
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
                      <p className="text-xs text-slate-500">Yayindaki Mac</p>
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
                  <Clock className="w-4 h-4 text-emerald-500" /> Son Yayinlanan Maclar
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
                  <p className="text-slate-400 text-center py-4 text-sm">Henuz yayinlanmis mac yok</p>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-800">Mac Yonetimi</h2>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => loadUpcomingMatches(true)} 
                  disabled={loadingMatches}
                  size="sm"
                  className="bg-slate-800 text-white hover:bg-slate-700"
                >
                  {loadingMatches ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4 mr-1" />}
                  Maclari Cek
                </Button>
                <Button 
                  onClick={runAICheck}
                  disabled={aiCheckLoading || upcomingMatches.length === 0}
                  size="sm"
                  className="bg-purple-600 text-white hover:bg-purple-500"
                >
                  {aiCheckLoading ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" />{aiCheckProgress.current}/{aiCheckProgress.total}</>
                  ) : (
                    <><Brain className="w-4 h-4 mr-1" /> AI Kontrol</>
                  )}
                </Button>
                <Button 
                  onClick={publishTodayMatches}
                  disabled={bulkPublishing || aiCheckResults.size === 0}
                  size="sm"
                  className="bg-emerald-500 text-white hover:bg-emerald-400"
                >
                  {bulkPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
                  Bugunu Yayinla
                </Button>
              </div>
            </div>

            {/* AI Stats */}
            {aiCheckResults.size > 0 && (
              <div className="flex gap-2">
                <Badge className="bg-emerald-100 text-emerald-700 border-0">
                  {Array.from(aiCheckResults.values()).filter(r => r.karar === 'bahis').length} Bahis
                </Badge>
                <Badge className="bg-red-100 text-red-700 border-0">
                  {Array.from(aiCheckResults.values()).filter(r => r.karar === 'pas').length} Pas
                </Badge>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Mac ara..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-slate-200"
              />
            </div>

            {/* Published Matches */}
            {publishedMatches.length > 0 && (
              <Card className="bg-white border-emerald-200">
                <button 
                  onClick={() => toggleDay('published')}
                  className="w-full flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                    <span className="text-sm font-semibold text-slate-700">Yayindaki Maclar</span>
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

            {/* Match List */}
            <Card className="bg-white border-slate-200 overflow-hidden">
              {loadingMatches ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-3" />
                  <p className="text-sm text-slate-500">Maclar yukleniyor...</p>
                </div>
              ) : getFilteredMatches().length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Calendar className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">Mac bulunamadi</p>
                  <p className="text-xs text-slate-400 mt-1">Yukariyi kullanarak maclari cekin</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {groupMatchesByDate(getFilteredMatches()).map(({ date, displayDate, matches }) => {
                    const isExpanded = expandedDays.has(date);
                    const isToday = date === new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
                    
                    return (
                      <div key={date}>
                        <button
                          onClick={() => toggleDay(date)}
                          className={`w-full flex items-center justify-between p-3 ${isToday ? 'bg-emerald-50' : 'bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            <span className={`text-sm font-semibold ${isToday ? 'text-emerald-700' : 'text-slate-700'}`}>
                              {isToday ? 'Bugun - ' : ''}{displayDate}
                            </span>
                            <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500">{matches.length}</Badge>
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="divide-y divide-slate-50">
                            {matches.map(match => {
                              const published = isMatchPublished(match.id);
                              const aiResult = aiCheckResults.get(match.id);
                              
                              return (
                                <div key={match.id} className={`p-3 ${published ? 'bg-emerald-50/50' : ''}`}>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <span className="text-xs font-mono text-emerald-600 w-12 flex-shrink-0">{match.localTime}</span>
                                      <img src={match.league.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <img src={match.homeTeam.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                                        <span className="text-xs text-slate-700 truncate">{match.homeTeam.name}</span>
                                        <span className="text-[10px] text-slate-400">vs</span>
                                        <span className="text-xs text-slate-700 truncate">{match.awayTeam.name}</span>
                                        <img src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                                      </div>
                                    </div>
                                    
                                    {/* AI Result + Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {aiResult && (
                                        aiResult.karar === 'bahis' ? (
                                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">
                                            <CheckCircle className="w-3 h-3 mr-0.5" /> Bahis
                                          </Badge>
                                        ) : (
                                          <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">
                                            <XCircle className="w-3 h-3 mr-0.5" /> Pas
                                          </Badge>
                                        )
                                      )}
                                      
                                      {published ? (
                                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Yayinda</Badge>
                                      ) : (
                                        <Button 
                                          onClick={() => publishMatch(match)}
                                          disabled={publishingId === match.id || aiResult?.karar === 'pas'}
                                          size="sm"
                                          className={`h-7 text-xs ${
                                            aiResult?.karar === 'pas' 
                                              ? 'bg-slate-200 text-slate-400' 
                                              : 'bg-emerald-500 text-white hover:bg-emerald-400'
                                          }`}
                                        >
                                          {publishingId === match.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yayinla'}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Coupons */}
        {activeTab === "coupons" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Kupon Yonetimi</h2>

            {/* Create Coupon */}
            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Input 
                    value={newCouponName}
                    onChange={e => setNewCouponName(e.target.value)}
                    placeholder="Kupon adi"
                    className="flex-1 bg-white border-slate-200"
                  />
                  <Button onClick={handleCreateCoupon} className="bg-emerald-500 text-white hover:bg-emerald-400">
                    <Plus className="w-4 h-4 mr-1" /> Olustur
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
                <p className="text-slate-400 text-center py-8 text-sm">Henuz kupon olusturulmamis</p>
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
                    <p className="text-xs text-slate-500">Mevcut tahminler (eklemek icin tikla):</p>
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
            <h2 className="text-lg font-bold text-slate-800">Kullanici Yonetimi</h2>

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
                        {u.role === 'admin' ? 'Admin' : 'Uye'}
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
            <h2 className="text-lg font-bold text-slate-800">Davetiye Kodlari</h2>

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

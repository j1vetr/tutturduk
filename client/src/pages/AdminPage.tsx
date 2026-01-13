import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  Trophy, 
  LogOut, 
  Plus,
  Save,
  Trash2,
  RefreshCcw,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Star,
  Ticket,
  Calendar,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { teams as staticTeams, leagues, getTeamsByLeague as getStaticTeamsByLeague, getLeague } from "@/lib/teamsData";

interface ApiTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  logo: string;
  leagueId: string;
}

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
  homeTeam: { id: number; name: string; shortName: string; logo: string; };
  awayTeam: { id: number; name: string; shortName: string; logo: string; };
  utcDate: string;
  localDate: string;
  localTime: string;
  matchday: number;
  status: string;
  competition: { id: number; code: string; name: string; logo: string; };
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
  const [apiTeamsCache, setApiTeamsCache] = useState<Record<string, ApiTeam[]>>({});
  const [loadingTeams, setLoadingTeams] = useState(false);
  
  // New match selection states
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<UpcomingMatch | null>(null);
  const [matchFilter, setMatchFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  
  // Form states
  const [newCode, setNewCode] = useState({ code: "", type: "standard", maxUses: 1 });
  const [editingPrediction, setEditingPrediction] = useState<Prediction | null>(null);
  const [newPrediction, setNewPrediction] = useState({
    home: "",
    away: "",
    homeLogo: "",
    awayLogo: "",
    prediction: "",
    odds: "",
    leagueId: "",
    leagueName: "",
    leagueLogo: "",
    time: "",
    date: "",
    analysis: "",
    confidence: "medium",
    isHero: false
  });

  // Load data
  useEffect(() => {
    if (!user) {
      setLocation("/admin-login");
      return;
    }
    loadAllData();
  }, [user, setLocation]);

  // Load matches when predictions tab is active
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
  };

  const loadUpcomingMatches = async () => {
    setLoadingMatches(true);
    try {
      const res = await fetch('/api/football/upcoming-matches');
      if (res.ok) {
        const matches = await res.json();
        setUpcomingMatches(matches);
      }
    } catch (error) {
      console.error('Failed to load upcoming matches:', error);
      toast({ variant: "destructive", description: "Maçlar yüklenemedi." });
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleSelectMatch = (match: UpcomingMatch) => {
    setSelectedMatch(match);
    setNewPrediction({
      home: match.homeTeam.shortName,
      away: match.awayTeam.shortName,
      homeLogo: match.homeTeam.logo,
      awayLogo: match.awayTeam.logo,
      prediction: "",
      odds: "",
      leagueId: match.competition.code.toLowerCase(),
      leagueName: match.competition.name,
      leagueLogo: match.competition.logo,
      time: match.localTime,
      date: match.utcDate.split('T')[0],
      analysis: "",
      confidence: "medium",
      isHero: false
    });
  };

  const handleCancelSelection = () => {
    setSelectedMatch(null);
    setNewPrediction({
      home: "", away: "", homeLogo: "", awayLogo: "",
      prediction: "", odds: "", leagueId: "", leagueName: "", leagueLogo: "",
      time: "", date: "", analysis: "", confidence: "medium", isHero: false
    });
  };

  const getFilteredMatches = () => {
    let filtered = upcomingMatches;
    
    if (matchFilter !== "all") {
      filtered = filtered.filter(m => m.competition.code === matchFilter);
    }
    
    if (dateFilter !== "all") {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      if (dateFilter === "today") {
        filtered = filtered.filter(m => m.utcDate.split('T')[0] === today);
      } else if (dateFilter === "tomorrow") {
        filtered = filtered.filter(m => m.utcDate.split('T')[0] === tomorrow);
      }
    }
    
    return filtered;
  };

  const getUniqueDates = () => {
    const dates = [...new Set(upcomingMatches.map(m => m.localDate))];
    return dates;
  };

  const getUniqueLeagues = () => {
    const leaguesMap = new Map();
    upcomingMatches.forEach(m => {
      if (!leaguesMap.has(m.competition.code)) {
        leaguesMap.set(m.competition.code, { code: m.competition.code, name: m.competition.name, logo: m.competition.logo });
      }
    });
    return Array.from(leaguesMap.values());
  };

  const loadTeamsFromApi = async (leagueId: string) => {
    if (leagueId === 'superlig') return;
    if (apiTeamsCache[leagueId]) return;
    
    setLoadingTeams(true);
    try {
      const res = await fetch(`/api/football/teams/${leagueId}`);
      if (res.ok) {
        const teams = await res.json();
        setApiTeamsCache(prev => ({ ...prev, [leagueId]: teams }));
      }
    } catch (error) {
      console.error('Failed to load teams from API:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const getTeamsByLeague = (leagueId: string) => {
    if (leagueId === 'superlig') {
      return getStaticTeamsByLeague(leagueId);
    }
    const apiTeams = apiTeamsCache[leagueId];
    if (apiTeams) {
      return apiTeams.map(t => ({
        id: t.tla?.toLowerCase() || t.id.toString(),
        name: t.shortName || t.name,
        logo: t.logo,
        leagueId: t.leagueId,
      }));
    }
    return getStaticTeamsByLeague(leagueId);
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

  const handleLogout = () => {
    logout();
    setLocation("/admin-login");
  };

  // Invitation code handlers
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

  // Prediction handlers
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
        toast({ description: "Tahmin eklendi!", className: "bg-green-500 text-white border-none" });
        handleCancelSelection();
        loadPredictions();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Tahmin eklenemedi." });
    }
  };

  const handleUpdatePrediction = async (id: number, updates: Partial<Prediction>) => {
    try {
      const res = await fetch(`/api/admin/predictions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include'
      });
      if (res.ok) {
        toast({ description: "Tahmin güncellendi.", className: "bg-green-500 text-white border-none" });
        setEditingPrediction(null);
        loadPredictions();
        loadWonPredictions();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Tahmin güncellenemedi." });
    }
  };

  const handleDeletePrediction = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/predictions/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        toast({ description: "Tahmin silindi.", className: "bg-green-500 text-white border-none" });
        loadPredictions();
        loadWonPredictions();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Tahmin silinemedi." });
    }
  };

  const handleMarkResult = async (id: number, result: 'won' | 'lost') => {
    await handleUpdatePrediction(id, { result });
  };

  const handleSetAsHero = async (id: number) => {
    await handleUpdatePrediction(id, { is_hero: true });
  };

  if (!user) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  return (
    <div className="min-h-screen bg-black font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-white/5 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <h1 className="text-lg font-display font-black text-white tracking-tight">
            ADMIN<span className="text-primary">PANEL</span>
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <Button variant={activeTab === "dashboard" ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => setActiveTab("dashboard")}>
            <LayoutDashboard className="w-4 h-4 mr-2" /> Genel Bakış
          </Button>
          <Button variant={activeTab === "predictions" ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => setActiveTab("predictions")}>
            <Trophy className="w-4 h-4 mr-2" /> Tahmin Yönetimi
          </Button>
          <Button variant={activeTab === "users" ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => setActiveTab("users")}>
            <Users className="w-4 h-4 mr-2" /> Kullanıcılar
          </Button>
          <Button variant={activeTab === "invitations" ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => setActiveTab("invitations")}>
            <Ticket className="w-4 h-4 mr-2" /> Davetiye Kodları
          </Button>
          <Button variant={activeTab === "settings" ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => setActiveTab("settings")}>
            <Settings className="w-4 h-4 mr-2" /> Ayarlar
          </Button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <Button variant="destructive" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Çıkış Yap
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-900 border-b border-white/5 flex items-center justify-between px-4 z-50">
        <span className="font-display font-black text-white">ADMIN</span>
        <Button size="icon" variant="ghost" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-black p-4 md:p-8 mt-16 md:mt-0">
        
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Genel Bakış</h2>
              <p className="text-zinc-400">Sistem istatistikleri ve özet.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-zinc-900 border-white/5">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-white">{users.length}</p>
                    <p className="text-xs text-zinc-500 font-bold uppercase">Toplam Kullanıcı</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-white/5">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Trophy className="w-5 h-5 text-green-500" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-white">{predictions.length}</p>
                    <p className="text-xs text-zinc-500 font-bold uppercase">Aktif Tahmin</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-white/5">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-white">{wonPredictions.length}</p>
                    <p className="text-xs text-zinc-500 font-bold uppercase">Kazanan Tahmin</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Predictions Tab */}
        {activeTab === "predictions" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Tahmin Yönetimi</h2>
                <p className="text-zinc-400">Maç seçin, tahmin girin, yayınlayın.</p>
              </div>
              <Button variant="outline" onClick={loadUpcomingMatches} disabled={loadingMatches} className="border-white/10 text-white">
                <RefreshCcw className={`w-4 h-4 mr-2 ${loadingMatches ? 'animate-spin' : ''}`} /> Maçları Yenile
              </Button>
            </div>

            {/* Selected Match - Prediction Form */}
            {selectedMatch && (
              <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-primary flex items-center gap-2">
                      <Plus className="w-5 h-5" /> Tahmin Ekle
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleCancelSelection} className="text-zinc-400 hover:text-white">
                      <XCircle className="w-4 h-4 mr-1" /> İptal
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Selected Match Display */}
                  <div className="bg-black/40 rounded-xl p-4 flex items-center justify-center gap-6">
                    <div className="flex flex-col items-center gap-2">
                      <img src={newPrediction.homeLogo} alt={newPrediction.home} className="w-12 h-12 object-contain" onError={(e) => { e.currentTarget.src = '/placeholder-team.png'; }} />
                      <span className="text-white font-bold text-sm">{newPrediction.home}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-zinc-500 text-xs">{newPrediction.date}</span>
                      <span className="text-2xl font-black text-primary">VS</span>
                      <span className="text-zinc-400 text-sm">{newPrediction.time}</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <img src={newPrediction.awayLogo} alt={newPrediction.away} className="w-12 h-12 object-contain" onError={(e) => { e.currentTarget.src = '/placeholder-team.png'; }} />
                      <span className="text-white font-bold text-sm">{newPrediction.away}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 justify-center">
                    <img src={newPrediction.leagueLogo} alt="" className="w-5 h-5 object-contain" />
                    <span className="text-zinc-400 text-sm">{newPrediction.leagueName}</span>
                  </div>

                  {/* Prediction Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-400">Tahmin *</Label>
                      <Select value={newPrediction.prediction} onValueChange={(val) => setNewPrediction({...newPrediction, prediction: val})}>
                        <SelectTrigger className="bg-black border-white/10 text-white">
                          <SelectValue placeholder="Tahmin Seç" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                          <SelectItem value="MS 1">MS 1 (Ev Sahibi Kazanır)</SelectItem>
                          <SelectItem value="MS X">MS X (Beraberlik)</SelectItem>
                          <SelectItem value="MS 2">MS 2 (Deplasman Kazanır)</SelectItem>
                          <SelectItem value="1X">1X (Ev Sahibi Kaybetmez)</SelectItem>
                          <SelectItem value="X2">X2 (Deplasman Kaybetmez)</SelectItem>
                          <SelectItem value="12">12 (Beraberlik Olmaz)</SelectItem>
                          <SelectItem value="2.5 ÜST">2.5 Üst (3+ Gol)</SelectItem>
                          <SelectItem value="2.5 ALT">2.5 Alt (0-2 Gol)</SelectItem>
                          <SelectItem value="1.5 ÜST">1.5 Üst (2+ Gol)</SelectItem>
                          <SelectItem value="3.5 ÜST">3.5 Üst (4+ Gol)</SelectItem>
                          <SelectItem value="KG VAR">KG Var (İki Takım da Gol Atar)</SelectItem>
                          <SelectItem value="KG YOK">KG Yok</SelectItem>
                          <SelectItem value="İY MS 1-1">İY/MS 1-1</SelectItem>
                          <SelectItem value="İY MS 2-2">İY/MS 2-2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400">Oran *</Label>
                      <Input value={newPrediction.odds} onChange={(e) => setNewPrediction({...newPrediction, odds: e.target.value})} placeholder="1.85" className="bg-black border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400">Güven</Label>
                      <Select value={newPrediction.confidence} onValueChange={(val) => setNewPrediction({...newPrediction, confidence: val})}>
                        <SelectTrigger className="bg-black border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                          <SelectItem value="low">🔵 Düşük</SelectItem>
                          <SelectItem value="medium">🟡 Orta</SelectItem>
                          <SelectItem value="high">🔴 Yüksek</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400">Analiz</Label>
                    <Textarea value={newPrediction.analysis} onChange={(e) => setNewPrediction({...newPrediction, analysis: e.target.value})} className="bg-black border-white/10 text-white min-h-[80px]" placeholder="Maç hakkında kısa analiz yazın..." />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={newPrediction.isHero} onCheckedChange={(checked) => setNewPrediction({...newPrediction, isHero: checked})} />
                      <Label className="text-zinc-400">Günün Öne Çıkan Tahmini</Label>
                    </div>
                    <Button onClick={handleCreatePrediction} className="bg-primary text-black font-bold hover:bg-white px-6">
                      <Plus className="w-4 h-4 mr-2" /> Tahmin Yayınla
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Matches List */}
            {!selectedMatch && (
              <Card className="bg-zinc-900 border-white/5">
                <CardHeader className="pb-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" /> Yaklaşan Maçlar ({getFilteredMatches().length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-[130px] bg-black border-white/10 text-white text-sm">
                          <SelectValue placeholder="Tarih" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                          <SelectItem value="all">Tüm Günler</SelectItem>
                          <SelectItem value="today">Bugün</SelectItem>
                          <SelectItem value="tomorrow">Yarın</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={matchFilter} onValueChange={setMatchFilter}>
                        <SelectTrigger className="w-[180px] bg-black border-white/10 text-white text-sm">
                          <SelectValue placeholder="Lig" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                          <SelectItem value="all">Tüm Ligler</SelectItem>
                          {getUniqueLeagues().map(league => (
                            <SelectItem key={league.code} value={league.code}>
                              <div className="flex items-center gap-2">
                                <img src={league.logo} alt="" className="w-4 h-4 object-contain" />
                                {league.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingMatches ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-zinc-500">Maçlar yükleniyor...</p>
                    </div>
                  ) : getFilteredMatches().length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">
                      {upcomingMatches.length === 0 ? "Maç bulunamadı. Yenilemek için butona tıklayın." : "Filtrelere uygun maç yok."}
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                      {getFilteredMatches().map((match) => (
                        <div
                          key={match.id}
                          className="p-4 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between group"
                          onClick={() => handleSelectMatch(match)}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="text-center min-w-[60px]">
                              <p className="text-xs text-zinc-500">{match.localDate}</p>
                              <p className="text-sm font-bold text-white">{match.localTime}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <img src={match.competition.logo} alt="" className="w-5 h-5 object-contain" />
                              <span className="text-xs text-zinc-500 hidden md:inline">{match.competition.name}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex items-center gap-2 flex-1 justify-end">
                                <span className="text-white font-medium text-sm">{match.homeTeam.shortName}</span>
                                <img src={match.homeTeam.logo} alt="" className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />
                              </div>
                              <span className="text-zinc-600 font-bold text-xs">VS</span>
                              <div className="flex items-center gap-2 flex-1">
                                <img src={match.awayTeam.logo} alt="" className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />
                                <span className="text-white font-medium text-sm">{match.awayTeam.shortName}</span>
                              </div>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                            <Plus className="w-4 h-4 mr-1" /> Tahmin Ekle
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Active Predictions List */}
            <Card className="bg-zinc-900 border-white/5">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" /> Aktif Tahminler ({predictions.length})
                </CardTitle>
                <CardDescription>Bekleyen tahminleri yönetin, sonuçlandırın veya silin.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {predictions.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">Henüz aktif tahmin yok.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {predictions.map((pred) => (
                      <div key={pred.id} className="p-4 hover:bg-white/5 transition-colors" data-testid={`prediction-${pred.id}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {pred.is_hero && (
                              <Badge className="bg-primary/20 text-primary border-primary/30">
                                <Star className="w-3 h-3 mr-1" /> HERO
                              </Badge>
                            )}
                            <div>
                              <p className="font-bold text-white text-lg">{pred.home_team} vs {pred.away_team}</p>
                              <p className="text-xs text-zinc-500">
                                {getLeague(pred.league_id)?.name || pred.league_id} • {formatDate(pred.match_date)} • {pred.match_time}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-white border-white/20">{pred.prediction}</Badge>
                            <Badge variant="outline" className="text-primary border-primary/30">{pred.odds}</Badge>
                          </div>
                        </div>
                        {pred.analysis && (
                          <p className="text-sm text-zinc-400 mt-2 line-clamp-1">{pred.analysis}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" variant="outline" className="border-green-500/30 text-green-500 hover:bg-green-500/10" onClick={() => handleMarkResult(pred.id, 'won')} data-testid={`button-won-${pred.id}`}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Kazandı
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => handleMarkResult(pred.id, 'lost')} data-testid={`button-lost-${pred.id}`}>
                            <XCircle className="w-4 h-4 mr-1" /> Kaybetti
                          </Button>
                          {!pred.is_hero && (
                            <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => handleSetAsHero(pred.id)} data-testid={`button-hero-${pred.id}`}>
                              <Star className="w-4 h-4 mr-1" /> Hero Yap
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-red-500 ml-auto" onClick={() => handleDeletePrediction(pred.id)} data-testid={`button-delete-${pred.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Won Predictions */}
            <Card className="bg-zinc-900 border-white/5">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" /> Kazanan Tahminler ({wonPredictions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {wonPredictions.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">Henüz kazanan tahmin yok.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {wonPredictions.map((pred) => (
                      <div key={pred.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-bold text-white">{pred.home_team} vs {pred.away_team}</p>
                            <p className="text-xs text-zinc-500">{formatDate(pred.match_date)} • {pred.prediction} @ {pred.odds}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-red-500" onClick={() => handleDeletePrediction(pred.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Kullanıcı Yönetimi</h2>
              <p className="text-zinc-400">Kayıtlı kullanıcıları görüntüleyin.</p>
            </div>

            <Card className="bg-zinc-900 border-white/5">
              <CardHeader>
                <CardTitle className="text-white">Üye Listesi ({users.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {users.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">Henüz kayıtlı kullanıcı yok.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {users.map((u) => (
                      <div key={u.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors" data-testid={`user-${u.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-white">
                            {u.username.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white">{u.username}</p>
                            <p className="text-xs text-zinc-500">Kod: {u.referral_code || "-"} • Kayıt: {formatDate(u.created_at)}</p>
                          </div>
                        </div>
                        <Badge variant={u.role === "admin" ? "default" : u.role === "vip" ? "secondary" : "outline"} className={u.role === "admin" ? "bg-red-500" : u.role === "vip" ? "bg-primary text-black" : ""}>
                          {u.role.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === "invitations" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Davetiye Yönetimi</h2>
              <p className="text-zinc-400">Kullanıcı kayıtları için davetiye kodları oluşturun.</p>
            </div>

            {/* Create Code Card */}
            <Card className="bg-zinc-900 border-white/5">
              <CardHeader>
                <CardTitle className="text-white text-lg">Hızlı Kod Oluştur</CardTitle>
                <CardDescription>Tek kullanımlık veya çoklu davetiye kodu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="space-y-2 flex-1 w-full">
                    <Label className="text-zinc-400">Kod (Otomatik veya Özel)</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Örn: OZELUYE2024" 
                        className="bg-black border-white/10 text-white font-mono uppercase" 
                        value={newCode.code}
                        onChange={(e) => setNewCode({...newCode, code: e.target.value.toUpperCase()})}
                        data-testid="input-code"
                      />
                      <Button variant="outline" className="border-white/10 shrink-0" onClick={generateRandomCode} data-testid="button-generate-code">
                        <RefreshCcw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 w-full md:w-48">
                    <Label className="text-zinc-400">Kullanım Limiti</Label>
                    <Input 
                      type="number" 
                      value={newCode.maxUses} 
                      onChange={(e) => setNewCode({...newCode, maxUses: parseInt(e.target.value) || 1})}
                      className="bg-black border-white/10 text-white" 
                      data-testid="input-max-uses"
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-48">
                    <Label className="text-zinc-400">Üyelik Tipi</Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      value={newCode.type}
                      onChange={(e) => setNewCode({...newCode, type: e.target.value})}
                      data-testid="select-type"
                    >
                      <option value="standard">Standart</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                  <Button className="bg-primary text-black font-bold hover:bg-white w-full md:w-auto" onClick={handleCreateCode} data-testid="button-create-code">
                    <Plus className="w-4 h-4 mr-2" /> Oluştur
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Active Codes List */}
            <Card className="bg-zinc-900 border-white/5">
              <CardHeader>
                <CardTitle className="text-white text-lg">Aktif Davetiye Kodları ({invitationCodes.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {invitationCodes.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">Henüz davetiye kodu oluşturulmamış.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {invitationCodes.map((code) => (
                      <div key={code.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors" data-testid={`code-${code.id}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Ticket className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-mono font-bold text-white text-lg tracking-wider" data-testid={`text-code-${code.id}`}>{code.code}</p>
                            <p className="text-xs text-zinc-500">
                              {code.type === 'vip' ? 'VIP Üyelik' : 'Standart Üyelik'} • {code.max_uses - code.uses} hak kaldı
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden md:block">
                            <div className="text-xs text-zinc-400 mb-1">Kullanım</div>
                            <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${(code.uses / code.max_uses) * 100}%` }} />
                            </div>
                          </div>
                          <Badge variant={code.status === 'active' ? 'default' : 'secondary'} className={code.status === 'active' ? 'bg-green-500' : 'bg-zinc-600'}>
                            {code.status === 'active' ? 'Aktif' : 'Kullanıldı'}
                          </Badge>
                          <Button size="icon" variant="ghost" className="text-zinc-500 hover:text-red-500" onClick={() => handleDeleteCode(code.id)} data-testid={`button-delete-${code.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Sistem Ayarları</h2>
              <p className="text-zinc-400">Genel yapılandırma.</p>
            </div>

            <Card className="bg-zinc-900 border-white/5">
              <CardContent className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white text-base">Bakım Modu</Label>
                    <p className="text-xs text-zinc-500">Siteyi geçici olarak erişime kapat</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white text-base">Yeni Üye Alımı</Label>
                    <p className="text-xs text-zinc-500">Kayıt formunu aktif/pasif yap</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2 pt-4 border-t border-white/5">
                  <Label className="text-zinc-400">iddaa.com Bayi Kodu</Label>
                  <p className="text-xs text-zinc-500 mb-2">Kullanıcıların iddaa.com'a kayıt olurken girmesi gereken referans kodu.</p>
                  <div className="flex gap-2">
                    <Input defaultValue="303603" className="bg-black border-white/10 text-white" />
                    <Button size="icon" variant="outline" className="border-white/10"><Save className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

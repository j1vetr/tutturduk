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
  league_id: string;
  prediction: string;
  odds: number;
  match_time: string;
  match_date: string | null;
  analysis: string | null;
  is_hero: boolean;
  result: string;
  created_at: string;
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
  
  // Form states
  const [newCode, setNewCode] = useState({ code: "", type: "standard", maxUses: 1 });
  const [editingPrediction, setEditingPrediction] = useState<Prediction | null>(null);
  const [newPrediction, setNewPrediction] = useState({
    home: "",
    away: "",
    prediction: "",
    odds: "",
    leagueId: "superlig",
    time: "21:00",
    date: "",
    analysis: "",
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

  // Load teams when predictions tab is active
  useEffect(() => {
    if (activeTab === "predictions" && newPrediction.leagueId !== 'superlig') {
      loadTeamsFromApi(newPrediction.leagueId);
    }
  }, [activeTab]);

  const loadAllData = () => {
    loadInvitationCodes();
    loadUsers();
    loadPredictions();
    loadWonPredictions();
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
      toast({ variant: "destructive", description: "Ev sahibi, deplasman ve tahmin zorunludur." });
      return;
    }
    try {
      const res = await fetch('/api/admin/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_team: newPrediction.home,
          away_team: newPrediction.away,
          league_id: newPrediction.leagueId,
          prediction: newPrediction.prediction,
          odds: newPrediction.odds || "1.00",
          match_time: newPrediction.time,
          match_date: newPrediction.date || null,
          analysis: newPrediction.analysis,
          is_hero: newPrediction.isHero
        }),
        credentials: 'include'
      });
      if (res.ok) {
        toast({ description: "Tahmin eklendi.", className: "bg-green-500 text-white border-none" });
        setNewPrediction({ home: "", away: "", prediction: "", odds: "", leagueId: "superlig", time: "21:00", date: "", analysis: "", isHero: false });
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
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Tahmin Yönetimi</h2>
              <p className="text-zinc-400">Günün tahminlerini ekleyin, düzenleyin ve sonuçlandırın.</p>
            </div>

            {/* Add New Prediction Form */}
            <Card className="bg-zinc-900 border-white/5">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Yeni Tahmin Ekle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* League Selection */}
                <div className="space-y-2">
                  <Label className="text-zinc-400">Lig</Label>
                  <Select value={newPrediction.leagueId} onValueChange={(val) => { loadTeamsFromApi(val); setNewPrediction({...newPrediction, leagueId: val, home: "", away: ""}); }}>
                    <SelectTrigger className="bg-black border-white/10 text-white">
                      <SelectValue placeholder="Lig Seçiniz" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      {leagues.map(league => (
                        <SelectItem key={league.id} value={league.id}>
                          <div className="flex items-center gap-2">
                            <img src={league.logo} alt={league.name} className="w-4 h-4 object-contain" />
                            {league.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Ev Sahibi {loadingTeams && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}</Label>
                    <Select value={newPrediction.home} onValueChange={(val) => setNewPrediction({...newPrediction, home: val})} disabled={loadingTeams}>
                      <SelectTrigger className="bg-black border-white/10 text-white">
                        <SelectValue placeholder={loadingTeams ? "Yükleniyor..." : "Ev Sahibi Seç"} />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white max-h-[300px]">
                        <SelectGroup>
                          {getTeamsByLeague(newPrediction.leagueId).map(team => (
                            <SelectItem key={team.id} value={team.name}>
                              <div className="flex items-center gap-2">
                                <img src={team.logo} alt={team.name} className="w-5 h-5 object-contain bg-white/10 rounded-sm" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                {team.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Deplasman {loadingTeams && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}</Label>
                    <Select value={newPrediction.away} onValueChange={(val) => setNewPrediction({...newPrediction, away: val})} disabled={loadingTeams}>
                      <SelectTrigger className="bg-black border-white/10 text-white">
                        <SelectValue placeholder={loadingTeams ? "Yükleniyor..." : "Deplasman Seç"} />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white max-h-[300px]">
                        <SelectGroup>
                          {getTeamsByLeague(newPrediction.leagueId).map(team => (
                            <SelectItem key={team.id} value={team.name}>
                              <div className="flex items-center gap-2">
                                <img src={team.logo} alt={team.name} className="w-5 h-5 object-contain bg-white/10 rounded-sm" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                {team.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Tarih</Label>
                    <Input type="date" value={newPrediction.date} onChange={(e) => setNewPrediction({...newPrediction, date: e.target.value})} className="bg-black border-white/10 text-white" data-testid="input-date" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Saat</Label>
                    <Input value={newPrediction.time} onChange={(e) => setNewPrediction({...newPrediction, time: e.target.value})} className="bg-black border-white/10 text-white" data-testid="input-time" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Tahmin</Label>
                    <Input value={newPrediction.prediction} onChange={(e) => setNewPrediction({...newPrediction, prediction: e.target.value})} placeholder="MS 1, 2.5 Üst, vb." className="bg-black border-white/10 text-white" data-testid="input-prediction" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Oran</Label>
                    <Input value={newPrediction.odds} onChange={(e) => setNewPrediction({...newPrediction, odds: e.target.value})} placeholder="2.10" className="bg-black border-white/10 text-white" data-testid="input-odds" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">Analiz</Label>
                  <Textarea value={newPrediction.analysis} onChange={(e) => setNewPrediction({...newPrediction, analysis: e.target.value})} className="bg-black border-white/10 text-white min-h-[80px]" placeholder="Maç analizi..." data-testid="input-analysis" />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={newPrediction.isHero} onCheckedChange={(checked) => setNewPrediction({...newPrediction, isHero: checked})} />
                    <Label className="text-zinc-400">Günün Tahmini (Hero) olarak ayarla</Label>
                  </div>
                  <Button onClick={handleCreatePrediction} className="bg-primary text-black font-bold hover:bg-white" data-testid="button-add-prediction">
                    <Plus className="w-4 h-4 mr-2" /> Tahmin Ekle
                  </Button>
                </div>
              </CardContent>
            </Card>

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

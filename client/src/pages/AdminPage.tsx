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
  TrendingUp, Target, Zap, Eye, ChevronRight, ChevronDown, Search, Filter,
  BarChart3, Award, Sparkles, ArrowUpRight, ArrowDownRight, Goal, Lock, Flame, Check, Brain
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

function CouponManagementTab({ 
  coupons, 
  newCouponName, 
  setNewCouponName, 
  handleCreateCoupon, 
  loadCoupons, 
  formatDate, 
  toast 
}: {
  coupons: Coupon[];
  newCouponName: string;
  setNewCouponName: (v: string) => void;
  handleCreateCoupon: () => void;
  loadCoupons: () => void;
  formatDate: (d: string) => string;
  toast: any;
}) {
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [availableBestBets, setAvailableBestBets] = useState<BestBet[]>([]);
  const [loadingBestBets, setLoadingBestBets] = useState(false);
  const [couponDetails, setCouponDetails] = useState<Coupon | null>(null);

  const loadCouponDetails = async (couponId: number) => {
    try {
      const res = await fetch(`/api/admin/coupons/${couponId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCouponDetails(data);
      }
    } catch (error) {
      console.error('Failed to load coupon details:', error);
    }
  };

  const loadAvailableBestBets = async () => {
    setLoadingBestBets(true);
    try {
      const res = await fetch('/api/admin/best-bets/all', { credentials: 'include' });
      if (res.ok) {
        setAvailableBestBets(await res.json());
      }
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
        const updated = await res.json();
        setCouponDetails(updated);
        loadCoupons();
        toast({ description: "Tahmin kupona eklendi!", className: "bg-green-500 text-white border-none" });
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Tahmin eklenemedi." });
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
        const updated = await res.json();
        setCouponDetails(updated);
        loadCoupons();
        toast({ description: "Tahmin kupondan çıkarıldı.", className: "bg-amber-500 text-white border-none" });
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Tahmin çıkarılamadı." });
    }
  };

  const handleDeleteCoupon = async (couponId: number) => {
    try {
      const res = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        loadCoupons();
        setSelectedCoupon(null);
        setCouponDetails(null);
        toast({ description: "Kupon silindi.", className: "bg-red-500 text-white border-none" });
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Kupon silinemedi." });
    }
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'düşük') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (risk === 'orta') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold text-white">Kupon Yönetimi</h2>
      
      <Card className="bg-zinc-900/50 border-white/5">
        <CardHeader>
          <CardTitle className="text-white">Yeni Kupon Oluştur</CardTitle>
          <p className="text-sm text-zinc-500">Bugün için yeni kupon oluşturun ve AI tahminlerinden ekleyin</p>
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
            <Button onClick={handleCreateCoupon} className="bg-primary text-black font-bold">
              <Plus className="w-4 h-4 mr-2" /> Oluştur
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Mevcut Kuponlar</h3>
          {coupons.map(coupon => (
            <Card 
              key={coupon.id} 
              className={`bg-zinc-900/50 border-white/5 cursor-pointer transition-all hover:border-primary/50 ${selectedCoupon?.id === coupon.id ? 'border-primary ring-1 ring-primary/30' : ''}`}
              onClick={() => handleSelectCoupon(coupon)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">{coupon.name}</h3>
                    <p className="text-sm text-zinc-500">{formatDate(coupon.coupon_date)} • {Number(coupon.combined_odds || 1).toFixed(2)}x kombine</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      coupon.result === 'won' ? 'bg-green-500/20 text-green-400' :
                      coupon.result === 'lost' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }>
                      {coupon.result === 'won' ? 'Kazandı' : coupon.result === 'lost' ? 'Kaybetti' : 'Bekliyor'}
                    </Badge>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={(e) => { e.stopPropagation(); handleDeleteCoupon(coupon.id); }}
                      className="h-8 w-8 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {coupons.length === 0 && (
            <p className="text-zinc-500 text-center py-8">Henüz kupon oluşturulmamış</p>
          )}
        </div>

        {selectedCoupon && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">{selectedCoupon.name} - Tahminler</h3>
            
            {couponDetails?.predictions && couponDetails.predictions.length > 0 && (
              <Card className="bg-zinc-900/50 border-white/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-400">Kupona Eklenen Tahminler</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {couponDetails.predictions.map(pred => (
                    <div key={pred.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        {pred.home_logo && <img src={pred.home_logo} className="w-5 h-5" alt="" />}
                        <span className="text-sm text-white">{pred.home_team}</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sm text-white">{pred.away_team}</span>
                        {pred.away_logo && <img src={pred.away_logo} className="w-5 h-5" alt="" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{pred.prediction}</Badge>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleRemoveBestBetFromCoupon(pred.id)}
                          className="h-6 w-6 text-red-400 hover:bg-red-500/20"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="bg-zinc-900/50 border-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-400">Mevcut AI Tahminleri</CardTitle>
                <p className="text-xs text-zinc-600">Kupona eklemek için tıklayın</p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                {loadingBestBets ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : availableBestBets.length > 0 ? (
                  availableBestBets.map(bet => (
                    <div 
                      key={bet.id} 
                      className="flex items-center justify-between p-3 bg-black/30 rounded-lg cursor-pointer hover:bg-black/50 transition-colors"
                      onClick={() => handleAddBestBetToCoupon(bet.id)}
                    >
                      <div className="flex items-center gap-3">
                        {bet.home_logo && <img src={bet.home_logo} className="w-5 h-5" alt="" />}
                        <span className="text-sm text-white">{bet.home_team}</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sm text-white">{bet.away_team}</span>
                        {bet.away_logo && <img src={bet.away_logo} className="w-5 h-5" alt="" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRiskColor(bet.risk_level)}>{bet.bet_type}</Badge>
                        <Plus className="w-4 h-4 text-emerald-400" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-500 text-center py-4 text-sm">
                    Henüz AI tahmini yok. Maç yayınlayın ve AI analizi yapın.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  
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
  
  // Match & prediction states
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<UpcomingMatch | null>(null);
  const [apiPrediction, setApiPrediction] = useState<ApiPrediction | null>(null);
  const [loadingApiPrediction, setLoadingApiPrediction] = useState(false);
  const [matchFilter, setMatchFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [quickFilters, setQuickFilters] = useState({
    over25: false,
    under25: false,
    kilit: false,
    published: false,
    unpublished: false,
  });
  const [matchPredictions, setMatchPredictions] = useState<Map<number, ApiPrediction>>(new Map());
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  
  // Coupon states
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [newCouponName, setNewCouponName] = useState("");
  
  // Published matches
  const [publishedMatches, setPublishedMatches] = useState<any[]>([]);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  
  // Bulk selection
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<number>>(new Set());
  const [bulkPublishing, setBulkPublishing] = useState(false);
  
  // AI Check states
  const [aiCheckResults, setAiCheckResults] = useState<Map<number, { karar: string; prediction?: any; reason?: string }>>(new Map());
  const [aiCheckLoading, setAiCheckLoading] = useState(false);
  const [aiCheckProgress, setAiCheckProgress] = useState({ current: 0, total: 0 });
  
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
      loadUpcomingMatches(true); // Load validated/quality matches by default
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

  const runAICheck = async () => {
    if (upcomingMatches.length === 0) {
      toast({ variant: "destructive", description: "Önce maçları yükleyin" });
      return;
    }
    
    const unpublishedMatches = upcomingMatches.filter(m => !isMatchPublished(m.id));
    if (unpublishedMatches.length === 0) {
      toast({ description: "Tüm maçlar zaten yayınlanmış" });
      return;
    }
    
    setAiCheckLoading(true);
    setAiCheckProgress({ current: 0, total: unpublishedMatches.length });
    setAiCheckResults(new Map());
    
    const fixtureIds = unpublishedMatches.map(m => m.id);
    
    try {
      toast({ title: "AI Kontrol Başladı", description: `${fixtureIds.length} maç analiz ediliyor...` });
      
      const res = await fetch('/api/admin/matches/ai-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fixtureIds })
      });
      
      if (res.ok) {
        const data = await res.json();
        const newResults = new Map<number, { karar: string; prediction?: any; reason?: string }>();
        
        for (const result of data.results) {
          newResults.set(result.fixtureId, {
            karar: result.karar,
            prediction: result.prediction,
            reason: result.reason
          });
        }
        
        setAiCheckResults(newResults);
        toast({ 
          title: "AI Kontrol Tamamlandı", 
          description: `${data.summary.bahis} bahis, ${data.summary.pas} pas`,
          className: data.summary.bahis > 0 ? 'bg-emerald-500 text-white border-none' : 'bg-amber-500 text-black border-none'
        });
      } else {
        const err = await res.json();
        toast({ variant: "destructive", description: err.message });
      }
    } catch (error) {
      console.error('AI check failed:', error);
      toast({ variant: "destructive", description: "AI kontrol başarısız" });
    } finally {
      setAiCheckLoading(false);
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

  const toggleMatchSelection = (matchId: number) => {
    setSelectedMatchIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) newSet.delete(matchId);
      else newSet.add(matchId);
      return newSet;
    });
  };

  const selectAllUnpublished = () => {
    const unpublishedIds = upcomingMatches
      .filter(m => !isMatchPublished(m.id))
      .map(m => m.id);
    setSelectedMatchIds(new Set(unpublishedIds));
  };

  const clearSelection = () => {
    setSelectedMatchIds(new Set());
  };

  const bulkPublishMatches = async () => {
    if (selectedMatchIds.size === 0) return;
    setBulkPublishing(true);
    let successCount = 0;
    let failCount = 0;
    const matchIds = Array.from(selectedMatchIds);
    
    for (let i = 0; i < matchIds.length; i++) {
      const matchId = matchIds[i];
      const match = upcomingMatches.find(m => m.id === matchId);
      if (!match || isMatchPublished(matchId)) continue;
      
      try {
        const res = await fetch('/api/admin/matches/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ fixtureId: matchId, isFeatured: false })
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
      
      // 3 second delay between each match to avoid rate limits
      if (i < matchIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    toast({
      title: `${successCount} maç yayınlandı`,
      description: failCount > 0 ? `${failCount} maç yayınlanamadı (istatistik eksik olabilir)` : undefined,
      className: successCount > 0 ? 'bg-emerald-500 text-black border-none' : undefined
    });
    
    setSelectedMatchIds(new Set());
    loadPublishedMatches();
    setBulkPublishing(false);
  };

  const loadUpcomingMatches = async (validated: boolean = false) => {
    setLoadingMatches(true);
    try {
      if (validated) {
        // Sadece istatistiği ve H2H olan maçlar
        toast({ title: "Kontrol ediliyor...", description: "Kaliteli maçlar filtreleniyor (bu biraz sürebilir)" });
        const res = await fetch('/api/football/fixtures-validated');
        if (res.ok) {
          const data = await res.json();
          const formatted = data.map((m: any) => ({
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
            apiPrediction: null,
            validated: true
          }));
          setUpcomingMatches(formatted);
          toast({ 
            title: "Kaliteli maçlar yüklendi", 
            description: `${data.length} maç (istatistik + H2H var)`,
            className: 'bg-emerald-500 text-black border-none'
          });
        }
      } else {
        // Tüm tahminleri maçlarla birlikte çek
        const res = await fetch('/api/football/all-predictions');
        if (res.ok) {
          const data = await res.json();
          const formatted = data.map((m: any) => ({
            id: m.id,
            date: m.date,
            timestamp: new Date(m.date).getTime() / 1000,
            status: { long: 'Not Started', short: 'NS', elapsed: null },
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            league: m.league,
            goals: { home: null, away: null },
            localDate: m.localDate,
            localTime: m.localTime,
            apiPrediction: m.prediction
          }));
          setUpcomingMatches(formatted);
          toast({ 
            title: "Tahminler yüklendi", 
            description: `${data.length} maç ve tahmin getirildi` 
          });
        }
      }
    } catch (error) {
      console.error('Failed to load predictions:', error);
      toast({ title: "Hata", description: "Tahminler yüklenemedi", variant: "destructive" });
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
        loadBestBetsStats();
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
        loadBestBetsStats();
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
        loadBestBetsStats();
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
        loadBestBetsStats();
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Güncellenemedi." });
    }
  };

  const handleCreateCoupon = async () => {
    if (!newCouponName) {
      toast({ variant: "destructive", description: "Kupon adı gerekli." });
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCouponName, date: today }),
        credentials: 'include'
      });
      if (res.ok) {
        toast({ description: "Kupon oluşturuldu!", className: "bg-green-500 text-white border-none" });
        setNewCouponName("");
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

  const getMatchSignals = (fixtureId: number) => {
    const pred = matchPredictions.get(fixtureId);
    if (!pred) return { over25: false, under25: false, btts: false, kilit: false };
    
    const homeGoals = parseFloat(pred.goals?.home || '0');
    const awayGoals = parseFloat(pred.goals?.away || '0');
    const totalGoals = homeGoals + awayGoals;
    
    const homePercent = parseInt(pred.percent?.home?.replace('%', '') || '0');
    const awayPercent = parseInt(pred.percent?.away?.replace('%', '') || '0');
    const drawPercent = parseInt(pred.percent?.draw?.replace('%', '') || '0');
    
    const over25 = totalGoals >= 2.5;
    const under25 = totalGoals < 2.0;
    const btts = homeGoals >= 0.8 && awayGoals >= 0.8;
    const kilit = drawPercent >= 25 && Math.abs(homePercent - awayPercent) < 20;
    
    return { over25, under25, btts, kilit };
  };

  const groupMatchesByDate = (matches: UpcomingMatch[]) => {
    const groups: { [key: string]: UpcomingMatch[] } = {};
    matches.forEach(match => {
      const dateKey = match.date.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(match);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, matches]) => ({
        date,
        displayDate: new Date(date).toLocaleDateString('tr-TR', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        }).toUpperCase(),
        matches: matches.sort((a, b) => a.timestamp - b.timestamp)
      }));
  };

  const getDaySummary = (matches: UpcomingMatch[]) => {
    let over25Count = 0, under25Count = 0, kilitCount = 0, publishedCount = 0;
    matches.forEach(m => {
      const signals = getMatchSignals(m.id);
      if (signals.over25) over25Count++;
      if (signals.under25) under25Count++;
      if (signals.kilit) kilitCount++;
      if (isMatchPublished(m.id)) publishedCount++;
    });
    return { total: matches.length, over25Count, under25Count, kilitCount, publishedCount };
  };

  const getAdvancedFilteredMatches = () => {
    let filtered = getFilteredMatches();
    
    if (quickFilters.over25) {
      filtered = filtered.filter(m => getMatchSignals(m.id).over25);
    }
    if (quickFilters.under25) {
      filtered = filtered.filter(m => getMatchSignals(m.id).under25);
    }
    if (quickFilters.kilit) {
      filtered = filtered.filter(m => getMatchSignals(m.id).kilit);
    }
    if (quickFilters.published) {
      filtered = filtered.filter(m => isMatchPublished(m.id));
    }
    if (quickFilters.unpublished) {
      filtered = filtered.filter(m => !isMatchPublished(m.id));
    }
    
    return filtered;
  };

  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const loadAllPredictions = async () => {
    if (upcomingMatches.length === 0) return;
    setLoadingPredictions(true);
    const newPreds = new Map<number, ApiPrediction>();
    
    const batchSize = 5;
    for (let i = 0; i < upcomingMatches.length; i += batchSize) {
      const batch = upcomingMatches.slice(i, i + batchSize);
      await Promise.all(batch.map(async (match) => {
        try {
          const res = await fetch(`/api/football/predictions/${match.id}`);
          if (res.ok) {
            const data = await res.json();
            newPreds.set(match.id, data);
          }
        } catch (e) {}
      }));
    }
    
    setMatchPredictions(newPreds);
    setLoadingPredictions(false);
    
    const today = new Date().toISOString().split('T')[0];
    setExpandedDays(new Set([today]));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  const successRate = bestBetsStats.successRate;

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
                      <span className="text-green-400">{bestBetsStats.wonCount} kazanılan</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-400 mb-1">Yayındaki Maçlar</p>
                        <p className="text-3xl font-bold text-white">{publishedMatches.length}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Target className="w-6 h-6 text-blue-400" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs">
                      <Clock className="w-3 h-3 text-blue-400" />
                      <span className="text-blue-400">AI tahminli maçlar</span>
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
                      <Clock className="w-5 h-5 text-primary" /> Son Yayınlanan Maçlar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {publishedMatches.slice(0, 5).map(pm => (
                      <div key={pm.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="flex items-center gap-2">
                          <img src={pm.home_logo} alt="" className="w-5 h-5 object-contain" />
                          <p className="font-medium text-white text-sm">{pm.home_team} vs {pm.away_team}</p>
                          <img src={pm.away_logo} alt="" className="w-5 h-5 object-contain" />
                        </div>
                        <Badge variant="outline" className="text-primary border-primary/30">{pm.match_time}</Badge>
                      </div>
                    ))}
                    {publishedMatches.length === 0 && (
                      <p className="text-zinc-500 text-center py-4">Henüz yayınlanmış maç yok</p>
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
                    {bestBetsStats.wonBets.slice(0, 5).map((bet: any) => (
                      <div key={bet.id} className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                        <div>
                          <p className="font-medium text-white text-sm">{bet.home_team || 'Maç'} vs {bet.away_team || ''}</p>
                          <p className="text-xs text-zinc-500">{bet.bet_type} @ {bet.odds}</p>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Kazandı</Badge>
                      </div>
                    ))}
                    {bestBetsStats.wonBets.length === 0 && (
                      <p className="text-zinc-500 text-center py-4">Henüz kazanan tahmin yok</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Predictions Tab - Premium Design */}
          {activeTab === "predictions" && (
            <div className="space-y-8">
              {/* Header Section */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/20 via-zinc-900 to-zinc-900 border border-emerald-500/20 p-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-display font-black text-white mb-1">Maç yönetimi</h2>
                    <p className="text-sm text-zinc-400">Maçları yayınla, öne çıkar ve yönet</p>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <Button onClick={loadPublishedMatches} variant="outline" className="border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400">
                      <RefreshCcw className="w-4 h-4 mr-2" /> Yenile
                    </Button>
                    <Button 
                      onClick={async () => {
                        toast({ title: 'Bugün yayınlanıyor...', description: 'Bugünün maçları çekiliyor (saat başı 5 maç, max 70)...', className: 'bg-emerald-500 text-white border-none' });
                        try {
                          const res = await fetch('/api/admin/auto-publish-today', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ totalLimit: 70, perHour: 5 })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            toast({ title: 'Bugünün Maçları', description: data.message, className: 'bg-emerald-500 text-white border-none' });
                            loadPublishedMatches();
                          } else {
                            toast({ variant: 'destructive', description: data.message });
                          }
                        } catch (e) {
                          toast({ variant: 'destructive', description: 'İşlem başarısız' });
                        }
                      }}
                      className="bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                    >
                      <Zap className="w-4 h-4 mr-2" /> Bugünün Maçları
                    </Button>
                    <Button 
                      onClick={async () => {
                        toast({ title: 'Yarın yayınlanıyor...', description: 'Yarının maçları çekiliyor (saat başı 5 maç, max 70)...', className: 'bg-blue-500 text-white border-none' });
                        try {
                          const res = await fetch('/api/admin/auto-publish', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ totalLimit: 70, perHour: 5 })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            toast({ title: 'Yarının Maçları', description: data.message, className: 'bg-blue-500 text-white border-none' });
                            loadPublishedMatches();
                          } else {
                            toast({ variant: 'destructive', description: data.message });
                          }
                        } catch (e) {
                          toast({ variant: 'destructive', description: 'İşlem başarısız' });
                        }
                      }}
                      className="bg-blue-500 text-white font-bold hover:bg-blue-400"
                    >
                      <Zap className="w-4 h-4 mr-2" /> Yarının Maçları
                    </Button>
                    <Button onClick={() => loadUpcomingMatches(true)} disabled={loadingMatches} className="bg-amber-500 text-black font-bold hover:bg-amber-400">
                      {loadingMatches ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kontrol ediliyor...</>
                      ) : (
                        <><Target className="w-4 h-4 mr-2" /> Kaliteli Maçlar</>
                      )}
                    </Button>
                    <Button 
                      onClick={runAICheck} 
                      disabled={aiCheckLoading || upcomingMatches.length === 0} 
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold hover:from-purple-500 hover:to-indigo-500"
                    >
                      {aiCheckLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI Analiz Yapılıyor...</>
                      ) : (
                        <><Brain className="w-4 h-4 mr-2" /> AI Kontrol Et</>
                      )}
                    </Button>
                    <Button onClick={() => loadUpcomingMatches(false)} disabled={loadingMatches} variant="outline" className="border-zinc-500/30 bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-400">
                      {loadingMatches ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Yükleniyor...</>
                      ) : (
                        <>Tüm Maçlar</>
                      )}
                    </Button>
                    <Button 
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/admin/clear-cache', {
                            method: 'POST',
                            credentials: 'include'
                          });
                          const data = await res.json();
                          if (res.ok) {
                            toast({ title: 'Cache Temizlendi', description: data.message, className: 'bg-purple-500 text-white border-none' });
                          } else {
                            toast({ variant: 'destructive', description: data.message });
                          }
                        } catch (e) {
                          toast({ variant: 'destructive', description: 'İşlem başarısız' });
                        }
                      }}
                      variant="outline" 
                      className="border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400"
                    >
                      <RefreshCcw className="w-4 h-4 mr-2" /> Cache Temizle
                    </Button>
                    <Button 
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/admin/re-evaluate', {
                            method: 'POST',
                            credentials: 'include'
                          });
                          const data = await res.json();
                          if (res.ok) {
                            toast({ title: 'Değerlendirme Tamamlandı', description: data.message, className: 'bg-green-500 text-white border-none' });
                          } else {
                            toast({ variant: 'destructive', description: data.message });
                          }
                        } catch (e) {
                          toast({ variant: 'destructive', description: 'İşlem başarısız' });
                        }
                      }}
                      variant="outline" 
                      className="border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400"
                    >
                      <RefreshCcw className="w-4 h-4 mr-2" /> Sonuçları Değerlendir
                    </Button>
                    <Button 
                      onClick={async () => {
                        const confirmCode = prompt('Veritabanını sıfırlamak için "SIFIRLA" yazın:');
                        if (confirmCode !== 'SIFIRLA') {
                          toast({ variant: 'destructive', description: 'Onay kodu yanlış' });
                          return;
                        }
                        try {
                          const res = await fetch('/api/admin/reset-database', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ confirmReset: 'SIFIRLA' })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            toast({ title: 'Sıfırlandı', description: data.message, className: 'bg-red-500 text-white border-none' });
                            loadPublishedMatches();
                          } else {
                            toast({ variant: 'destructive', description: data.message });
                          }
                        } catch (e) {
                          toast({ variant: 'destructive', description: 'İşlem başarısız' });
                        }
                      }}
                      variant="outline" 
                      className="border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> DB Sıfırla
                    </Button>
                  </div>
                </div>
              </div>

              {/* Published Matches - Compact Collapsible */}
              {publishedMatches.length > 0 && (
                <div className="rounded-xl border border-emerald-500/20 bg-zinc-900/50 overflow-hidden">
                  <button 
                    onClick={() => setExpandedDays(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('published')) newSet.delete('published');
                      else newSet.add('published');
                      return newSet;
                    })}
                    className="w-full flex items-center justify-between p-3 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                      <span className="text-sm font-bold text-white">Yayındaki maçlar</span>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">{publishedMatches.length}</Badge>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${expandedDays.has('published') ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedDays.has('published') && (
                    <div className="border-t border-zinc-800 divide-y divide-zinc-800/50 max-h-[300px] overflow-y-auto">
                      {publishedMatches.map(pm => (
                        <div key={pm.id} className="flex items-center justify-between p-2 px-3 hover:bg-zinc-800/30">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs font-mono text-emerald-400 w-10">{pm.match_time}</span>
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <img src={pm.home_logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                              <span className="text-xs text-white truncate">{pm.home_team}</span>
                              <span className="text-[10px] text-zinc-600">vs</span>
                              <span className="text-xs text-white truncate">{pm.away_team}</span>
                              <img src={pm.away_logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                            </div>
                            {pm.is_featured && <Star className="w-3 h-3 text-amber-400 fill-current flex-shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={async () => {
                                const res = await fetch(`/api/admin/matches/${pm.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ is_featured: !pm.is_featured })
                                });
                                if (res.ok) loadPublishedMatches();
                              }}
                              className="h-6 w-6 rounded bg-zinc-800 text-zinc-400 hover:text-amber-400"
                            >
                              <Star className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => unpublishMatch(pm.id)}
                              className="h-6 w-6 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Match Selection - Premium Design with Day Grouping */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-blue-500 rounded-full" />
                    <h3 className="text-lg font-bold text-white">Tüm Maçlar</h3>
                    {upcomingMatches.length > 0 && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {upcomingMatches.length} maç
                      </Badge>
                    )}
                    {aiCheckResults.size > 0 && (
                      <>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          {Array.from(aiCheckResults.values()).filter(r => r.karar === 'bahis').length} bahis
                        </Badge>
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          {Array.from(aiCheckResults.values()).filter(r => r.karar === 'pas').length} pas
                        </Badge>
                      </>
                    )}
                  </div>
                  
                  {/* Bulk Actions */}
                  <div className="flex items-center gap-2">
                    {selectedMatchIds.size > 0 && (
                      <>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {selectedMatchIds.size} seçili
                        </Badge>
                        <Button
                          onClick={clearSelection}
                          variant="ghost"
                          size="sm"
                          className="h-8 text-zinc-400 hover:text-white"
                        >
                          Temizle
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={selectAllUnpublished}
                      variant="outline"
                      size="sm"
                      className="h-8 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      Tümünü Seç
                    </Button>
                    {aiCheckResults.size > 0 && (
                      <Button
                        onClick={() => {
                          const bahisMatchIds = upcomingMatches
                            .filter(m => !isMatchPublished(m.id) && aiCheckResults.get(m.id)?.karar === 'bahis')
                            .map(m => m.id);
                          setSelectedMatchIds(new Set(bahisMatchIds));
                        }}
                        variant="outline"
                        size="sm"
                        className="h-8 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Bahis Olanları Seç
                      </Button>
                    )}
                    <Button
                      onClick={bulkPublishMatches}
                      disabled={selectedMatchIds.size === 0 || bulkPublishing}
                      size="sm"
                      className="h-8 bg-emerald-500 text-black font-bold hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {bulkPublishing ? (
                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Yayınlanıyor...</>
                      ) : (
                        <>Seçilenleri Yayınla ({selectedMatchIds.size})</>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800 overflow-hidden">
                  {/* Search & Filter Bar */}
                  <div className="p-4 border-b border-zinc-800 bg-zinc-900 space-y-3">
                    <div className="flex flex-wrap gap-3">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input 
                          placeholder="Takım veya lig ara..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="pl-11 h-11 bg-zinc-800 border-zinc-700 text-white rounded-xl focus:border-emerald-500/50"
                        />
                      </div>
                      <Select value={matchFilter} onValueChange={setMatchFilter}>
                        <SelectTrigger className="w-52 h-11 bg-zinc-800 border-zinc-700 text-white rounded-xl">
                          <Filter className="w-4 h-4 mr-2 text-zinc-500" />
                          <SelectValue placeholder="Lig filtrele" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 rounded-xl max-h-64 overflow-y-auto">
                          <SelectItem value="all">Tüm ligler</SelectItem>
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
                    
                    {/* Quick Filters */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setQuickFilters(f => ({ ...f, over25: !f.over25 }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          quickFilters.over25 
                            ? 'bg-emerald-500 text-black' 
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        <Goal className="w-3 h-3 inline mr-1" /> 2.5 ÜST
                      </button>
                      <button
                        onClick={() => setQuickFilters(f => ({ ...f, under25: !f.under25 }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          quickFilters.under25 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        2.5 ALT
                      </button>
                      <button
                        onClick={() => setQuickFilters(f => ({ ...f, kilit: !f.kilit }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          quickFilters.kilit 
                            ? 'bg-amber-500 text-black' 
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        <Lock className="w-3 h-3 inline mr-1" /> Kilit Maç
                      </button>
                      <div className="w-px h-6 bg-zinc-700 mx-1" />
                      <button
                        onClick={() => setQuickFilters(f => ({ ...f, published: !f.published, unpublished: false }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          quickFilters.published 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        Yayında
                      </button>
                      <button
                        onClick={() => setQuickFilters(f => ({ ...f, unpublished: !f.unpublished, published: false }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          quickFilters.unpublished 
                            ? 'bg-zinc-600 text-white' 
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        Yayınlanmamış
                      </button>
                    </div>
                  </div>

                  {/* Day-Grouped Match List */}
                  <div className="max-h-[800px] overflow-y-auto">
                    {loadingMatches ? (
                      <div className="text-center py-16">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                        </div>
                        <p className="text-zinc-500">Maçlar yükleniyor...</p>
                      </div>
                    ) : getAdvancedFilteredMatches().length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800 flex items-center justify-center">
                          <Calendar className="w-8 h-8 text-zinc-600" />
                        </div>
                        <p className="text-zinc-400 font-medium">
                          {upcomingMatches.length === 0 
                            ? "Maç bulunamadı" 
                            : "Filtreye uygun maç yok"}
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">Yukarıdan maçları getir butonuna tıklayın</p>
                      </div>
                    ) : (
                      <div>
                        {groupMatchesByDate(getAdvancedFilteredMatches()).map(({ date, displayDate, matches }) => {
                          const summary = getDaySummary(matches);
                          const isExpanded = expandedDays.has(date);
                          const isToday = date === new Date().toISOString().split('T')[0];
                          
                          return (
                            <div key={date} className="border-b border-zinc-800 last:border-b-0">
                              {/* Day Header */}
                              <button
                                onClick={() => toggleDay(date)}
                                className={`w-full px-4 py-3 flex items-center justify-between transition-all ${
                                  isToday ? 'bg-emerald-500/10' : 'bg-zinc-900/50 hover:bg-zinc-800/50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {isExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-zinc-500" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-zinc-500" />
                                  )}
                                  <span className={`font-bold ${isToday ? 'text-emerald-400' : 'text-white'}`}>
                                    {isToday ? '📅 BUGÜN - ' : ''}{displayDate}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                                    {summary.total} maç
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-[10px]">
                                  {summary.over25Count > 0 && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                      {summary.over25Count} ÜST
                                    </span>
                                  )}
                                  {summary.under25Count > 0 && (
                                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                      {summary.under25Count} ALT
                                    </span>
                                  )}
                                  {summary.kilitCount > 0 && (
                                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                      {summary.kilitCount} Kilit
                                    </span>
                                  )}
                                  {summary.publishedCount > 0 && (
                                    <span className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">
                                      {summary.publishedCount} yayında
                                    </span>
                                  )}
                                </div>
                              </button>
                              
                              {/* Day Matches */}
                              {isExpanded && (
                                <div className="divide-y divide-zinc-800/50">
                                  {matches.map(match => {
                                    const published = isMatchPublished(match.id);
                                    const signals = getMatchSignals(match.id);
                                    const hasPrediction = matchPredictions.has(match.id);
                                    
                                    return (
                                      <div
                                        key={match.id}
                                        className={`p-4 transition-all hover:bg-white/[0.02] ${published ? 'bg-emerald-500/5' : ''} ${selectedMatchIds.has(match.id) ? 'bg-blue-500/10' : ''}`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-4">
                                            {/* Checkbox */}
                                            {!published && (
                                              <button
                                                onClick={() => toggleMatchSelection(match.id)}
                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                                  selectedMatchIds.has(match.id)
                                                    ? 'bg-emerald-500 border-emerald-500 text-black'
                                                    : 'border-zinc-600 hover:border-emerald-500'
                                                }`}
                                              >
                                                {selectedMatchIds.has(match.id) && <Check className="w-3 h-3" />}
                                              </button>
                                            )}
                                            
                                            {/* Time */}
                                            <div className="min-w-[60px] text-center">
                                              <p className="text-lg font-black text-emerald-400">{match.localTime}</p>
                                            </div>
                                            
                                            {/* League */}
                                            <div className="w-7 h-7 rounded-lg bg-zinc-800 p-1">
                                              <img src={match.league.logo} alt="" className="w-full h-full object-contain" />
                                            </div>

                                            {/* Teams */}
                                            <div className="flex items-center gap-3">
                                              <div className="flex items-center gap-2">
                                                <img src={match.homeTeam.logo} alt="" className="w-6 h-6 object-contain" />
                                                <span className="text-white font-medium text-sm">{match.homeTeam.name}</span>
                                              </div>
                                              <span className="text-zinc-700 text-xs font-bold">vs</span>
                                              <div className="flex items-center gap-2">
                                                <img src={match.awayTeam.logo} alt="" className="w-6 h-6 object-contain" />
                                                <span className="text-white font-medium text-sm">{match.awayTeam.name}</span>
                                              </div>
                                            </div>
                                            
                                            {/* Signal Badges */}
                                            <div className="flex items-center gap-1 ml-2">
                                              {signals.over25 && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                  2.5Ü
                                                </span>
                                              )}
                                              {signals.under25 && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                                  2.5A
                                                </span>
                                              )}
                                              {signals.btts && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                  KG
                                                </span>
                                              )}
                                              {signals.kilit && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                  <Lock className="w-2.5 h-2.5 inline" />
                                                </span>
                                              )}
                                              {!hasPrediction && matchPredictions.size > 0 && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-700 text-zinc-500">
                                                  Veri yok
                                                </span>
                                              )}
                                            </div>
                                            
                                            {/* AI Check Results */}
                                            {aiCheckResults.has(match.id) && (
                                              <div className="flex items-center gap-2 ml-2">
                                                {aiCheckResults.get(match.id)?.karar === 'bahis' ? (
                                                  <div className="flex items-center gap-1">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-emerald-500/30 to-green-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                                      <CheckCircle className="w-3 h-3" />
                                                      BAHİS
                                                    </span>
                                                    {aiCheckResults.get(match.id)?.prediction && (
                                                      <span className="px-2 py-0.5 rounded text-[9px] font-medium bg-zinc-700/50 text-zinc-200">
                                                        {aiCheckResults.get(match.id)?.prediction.bet} ({aiCheckResults.get(match.id)?.prediction.confidence}%)
                                                      </span>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <div className="flex items-center gap-1">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                                                      <XCircle className="w-3 h-3" />
                                                      PAS
                                                    </span>
                                                    <span className="text-[9px] text-zinc-500 max-w-[150px] truncate" title={aiCheckResults.get(match.id)?.reason}>
                                                      {aiCheckResults.get(match.id)?.reason?.substring(0, 40)}...
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Status & Actions */}
                                          <div className="flex items-center gap-2">
                                            {published ? (
                                              <>
                                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                                                  Yayında
                                                </Badge>
                                                <Button 
                                                  variant="ghost" 
                                                  size="sm"
                                                  onClick={() => {
                                                    const pm = publishedMatches.find(p => p.fixture_id === match.id);
                                                    if (pm) unpublishMatch(pm.id);
                                                  }}
                                                  className="h-8 px-2 text-red-400 hover:bg-red-500/10"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                {hasPrediction ? (
                                                  <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-[10px]">
                                                    Hazır
                                                  </Badge>
                                                ) : matchPredictions.size > 0 ? (
                                                  <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]">
                                                    Eksik
                                                  </Badge>
                                                ) : null}
                                                <Button 
                                                  onClick={() => publishMatch(match)}
                                                  disabled={publishingId === match.id || aiCheckResults.get(match.id)?.karar === 'pas'}
                                                  size="sm"
                                                  className={`h-8 font-bold text-xs ${
                                                    aiCheckResults.get(match.id)?.karar === 'pas' 
                                                      ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                                                      : 'bg-emerald-500 text-black hover:bg-emerald-400'
                                                  }`}
                                                >
                                                  {publishingId === match.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                  ) : aiCheckResults.get(match.id)?.karar === 'pas' ? (
                                                    'Pas'
                                                  ) : (
                                                    'Yayınla'
                                                  )}
                                                </Button>
                                              </>
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
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Coupons Tab */}
          {activeTab === "coupons" && (
            <CouponManagementTab 
              coupons={coupons}
              newCouponName={newCouponName}
              setNewCouponName={setNewCouponName}
              handleCreateCoupon={handleCreateCoupon}
              loadCoupons={loadCoupons}
              formatDate={formatDate}
              toast={toast}
            />
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
                            'bg-zinc-500/20 text-zinc-400'
                          }>
                            {u.role === 'admin' ? 'ADMİN' : 'ÜYE'}
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
                          <Badge className="bg-zinc-500/20 text-zinc-400">
                            STANDARD
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

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  Trophy, 
  LogOut, 
  Search,
  TrendingUp,
  Activity,
  DollarSign,
  Plus,
  Save,
  Trash2,
  RefreshCcw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Mock Data
const MOCK_STATS = [
   { title: "Toplam Kullanıcı", value: "1,245", change: "+12%", icon: Users },
   { title: "Aktif Aboneler", value: "843", change: "+5%", icon: Activity },
   { title: "Toplam Gelir", value: "₺45,200", change: "+18%", icon: DollarSign },
   { title: "Başarı Oranı", value: "%78", change: "+2%", icon: TrendingUp },
];

const MOCK_USERS = [
   { id: 1, username: "ahmet123", email: "ahmet@gmail.com", role: "user", status: "active", date: "2024-03-12" },
   { id: 2, username: "mehmet_b", email: "mehmet@hotmail.com", role: "vip", status: "active", date: "2024-03-10" },
   { id: 3, username: "ayse_k", email: "ayse@outlook.com", role: "user", status: "expired", date: "2024-02-28" },
];

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [heroMatch, setHeroMatch] = useState({
     home: "Real Madrid",
     away: "Barcelona",
     prediction: "MS 1",
     odds: "2.15",
     league: "LA LIGA",
     time: "22:00",
     analysis: "Real Madrid evinde son 5 maçtır kaybetmiyor..."
  });

  // Protect Route
  useEffect(() => {
    // In a real app, check specifically for admin role
    if (!user) {
      setLocation("/admin-login");
    }
  }, [user, setLocation]);

  const handleLogout = () => {
     logout();
     setLocation("/admin-login");
  };

  const handleSaveHero = () => {
     toast({
        title: "Başarılı",
        description: "Günün tahmini güncellendi.",
        className: "bg-green-500 text-white border-none"
     });
  };

  if (!user) return null;

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
             <Button 
                variant={activeTab === "dashboard" ? "secondary" : "ghost"} 
                className="w-full justify-start" 
                onClick={() => setActiveTab("dashboard")}
             >
                <LayoutDashboard className="w-4 h-4 mr-2" /> Genel Bakış
             </Button>
             <Button 
                variant={activeTab === "predictions" ? "secondary" : "ghost"} 
                className="w-full justify-start" 
                onClick={() => setActiveTab("predictions")}
             >
                <Trophy className="w-4 h-4 mr-2" /> Tahmin Yönetimi
             </Button>
             <Button 
                variant={activeTab === "users" ? "secondary" : "ghost"} 
                className="w-full justify-start" 
                onClick={() => setActiveTab("users")}
             >
                <Users className="w-4 h-4 mr-2" /> Kullanıcılar
             </Button>
             <Button 
                variant={activeTab === "settings" ? "secondary" : "ghost"} 
                className="w-full justify-start" 
                onClick={() => setActiveTab("settings")}
             >
                <Settings className="w-4 h-4 mr-2" /> Ayarlar
             </Button>
          </nav>

          <div className="p-4 border-t border-white/5">
             <Button variant="destructive" className="w-full" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Çıkış Yap
             </Button>
          </div>
       </aside>

       {/* Mobile Header (Visible only on mobile) */}
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
                   <p className="text-zinc-400">Sistem istatistikleri ve özet raporlar.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   {MOCK_STATS.map((stat, i) => (
                      <Card key={i} className="bg-zinc-900 border-white/5">
                         <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                               <div className="p-2 bg-primary/10 rounded-lg">
                                  <stat.icon className="w-5 h-5 text-primary" />
                               </div>
                               <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                  {stat.change}
                               </Badge>
                            </div>
                            <div className="space-y-1">
                               <p className="text-2xl font-black text-white">{stat.value}</p>
                               <p className="text-xs text-zinc-500 font-bold uppercase">{stat.title}</p>
                            </div>
                         </CardContent>
                      </Card>
                   ))}
                </div>

                {/* Recent Users Table */}
                <Card className="bg-zinc-900 border-white/5">
                   <CardHeader>
                      <CardTitle className="text-white">Son Üyeler</CardTitle>
                   </CardHeader>
                   <CardContent>
                      <div className="space-y-4">
                         {MOCK_USERS.map((u) => (
                            <div key={u.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                                     {u.username.substring(0,2).toUpperCase()}
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold text-white">{u.username}</p>
                                     <p className="text-xs text-zinc-500">{u.email}</p>
                                  </div>
                               </div>
                               <Badge variant={u.status === "active" ? "default" : "destructive"}>
                                  {u.status}
                               </Badge>
                            </div>
                         ))}
                      </div>
                   </CardContent>
                </Card>
             </div>
          )}

          {/* Predictions Tab */}
          {activeTab === "predictions" && (
             <div className="space-y-6 max-w-4xl">
                <div>
                   <h2 className="text-2xl font-bold text-white mb-1">Tahmin Yönetimi</h2>
                   <p className="text-zinc-400">Günün bankosunu ve diğer tahminleri düzenleyin.</p>
                </div>

                <Card className="bg-zinc-900 border-white/5">
                   <CardHeader>
                      <CardTitle className="text-primary flex items-center gap-2">
                         <Trophy className="w-5 h-5" /> Günün Tahmini (Hero)
                      </CardTitle>
                      <CardDescription>Ana sayfadaki büyük kartı düzenle</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label className="text-zinc-400">Ev Sahibi</Label>
                            <Input 
                               value={heroMatch.home} 
                               onChange={(e) => setHeroMatch({...heroMatch, home: e.target.value})}
                               className="bg-black border-white/10 text-white" 
                            />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-zinc-400">Deplasman</Label>
                            <Input 
                               value={heroMatch.away}
                               onChange={(e) => setHeroMatch({...heroMatch, away: e.target.value})} 
                               className="bg-black border-white/10 text-white" 
                            />
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="space-y-2">
                            <Label className="text-zinc-400">Lig</Label>
                            <Input 
                               value={heroMatch.league}
                               onChange={(e) => setHeroMatch({...heroMatch, league: e.target.value})}
                               className="bg-black border-white/10 text-white" 
                            />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-zinc-400">Saat</Label>
                            <Input 
                               value={heroMatch.time}
                               onChange={(e) => setHeroMatch({...heroMatch, time: e.target.value})}
                               className="bg-black border-white/10 text-white" 
                            />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-zinc-400">Oran</Label>
                            <Input 
                               value={heroMatch.odds}
                               onChange={(e) => setHeroMatch({...heroMatch, odds: e.target.value})}
                               className="bg-black border-white/10 text-white" 
                            />
                         </div>
                      </div>

                      <div className="space-y-2">
                         <Label className="text-zinc-400">Tahmin Seçimi</Label>
                         <Input 
                            value={heroMatch.prediction}
                            onChange={(e) => setHeroMatch({...heroMatch, prediction: e.target.value})}
                            className="bg-black border-white/10 text-white" 
                         />
                      </div>

                      <div className="space-y-2">
                         <Label className="text-zinc-400">Yapay Zeka Analizi</Label>
                         <Textarea 
                            value={heroMatch.analysis}
                            onChange={(e) => setHeroMatch({...heroMatch, analysis: e.target.value})}
                            className="bg-black border-white/10 text-white min-h-[100px]" 
                         />
                      </div>

                      <div className="pt-4 flex justify-end">
                         <Button onClick={handleSaveHero} className="bg-primary text-black font-bold hover:bg-white">
                            <Save className="w-4 h-4 mr-2" /> Değişiklikleri Kaydet
                         </Button>
                      </div>
                   </CardContent>
                </Card>
             </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <div>
                      <h2 className="text-2xl font-bold text-white mb-1">Kullanıcı Yönetimi</h2>
                      <p className="text-zinc-400">Davetiye kodları ve üyelikler.</p>
                   </div>
                   <Button className="bg-primary text-black font-bold">
                      <Plus className="w-4 h-4 mr-2" /> Yeni Davetiye
                   </Button>
                </div>

                <div className="flex gap-4 mb-6">
                   <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input placeholder="Kullanıcı ara..." className="pl-9 bg-zinc-900 border-white/10 text-white" />
                   </div>
                </div>

                <Card className="bg-zinc-900 border-white/5">
                   <CardContent className="p-0">
                      <div className="divide-y divide-white/5">
                         {MOCK_USERS.map((u) => (
                            <div key={u.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-white">
                                     {u.username.substring(0,2).toUpperCase()}
                                  </div>
                                  <div>
                                     <p className="font-bold text-white">{u.username}</p>
                                     <p className="text-xs text-zinc-500">{u.email}</p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-4">
                                  <Badge variant="outline" className="border-white/10 text-zinc-400">
                                     {u.role.toUpperCase()}
                                  </Badge>
                                  <Button size="icon" variant="ghost" className="text-zinc-500 hover:text-red-500">
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

          {/* Settings Tab */}
          {activeTab === "settings" && (
             <div className="space-y-6 max-w-2xl">
                <div>
                   <h2 className="text-2xl font-bold text-white mb-1">Sistem Ayarları</h2>
                   <p className="text-zinc-400">Genel yapılandırma ve API ayarları.</p>
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
                         <Label className="text-zinc-400">Bayi Kodu</Label>
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

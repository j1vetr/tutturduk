import { MobileLayout } from "@/components/MobileLayout";
import { useAuth, BAYI_KODU } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut, User as UserIcon, Shield, Settings, Trophy, Wallet, Star, Copy, ChevronRight, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <MobileLayout activeTab="profile">
      <div className="pb-20">
        {/* Hero Profile Header */}
        <div className="relative mb-6">
          <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-background border-b border-primary/10 relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
             <div className="absolute right-0 top-0 p-4">
                <Badge variant="outline" className="bg-black/20 backdrop-blur-md border-primary/20 text-primary animate-pulse">
                  <Star className="w-3 h-3 mr-1 fill-primary" />
                  PREMIUM ÜYE
                </Badge>
             </div>
          </div>
          
          <div className="px-6 -mt-12 flex items-end justify-between relative z-10">
             <div className="flex items-end gap-4">
                <div className="w-24 h-24 rounded-2xl bg-black border-4 border-background shadow-2xl flex items-center justify-center relative group">
                   <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-xl" />
                   <UserIcon className="w-10 h-10 text-primary" />
                   <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-4 border-background rounded-full" />
                </div>
                <div className="mb-2">
                   <h2 className="text-2xl font-display font-bold text-foreground leading-none">{user?.username}</h2>
                   <p className="text-xs text-muted-foreground mt-1 font-medium">Üye ID: <span className="text-foreground font-mono">#{user?.id}</span></p>
                </div>
             </div>
          </div>
        </div>

        <div className="px-4 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
             <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
                <CardContent className="p-3 flex flex-col items-center justify-center text-center gap-1">
                   <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center mb-1">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                   </div>
                   <span className="text-lg font-display font-bold text-foreground">12</span>
                   <span className="text-[10px] text-muted-foreground uppercase font-bold">Kazanılan</span>
                </CardContent>
             </Card>
             <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
                <CardContent className="p-3 flex flex-col items-center justify-center text-center gap-1">
                   <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center mb-1">
                      <Wallet className="w-4 h-4 text-green-500" />
                   </div>
                   <span className="text-lg font-display font-bold text-foreground">%78</span>
                   <span className="text-[10px] text-muted-foreground uppercase font-bold">Başarı</span>
                </CardContent>
             </Card>
             <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
                <CardContent className="p-3 flex flex-col items-center justify-center text-center gap-1">
                   <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mb-1">
                      <Star className="w-4 h-4 text-blue-500" />
                   </div>
                   <span className="text-lg font-display font-bold text-foreground">345</span>
                   <span className="text-[10px] text-muted-foreground uppercase font-bold">Puan</span>
                </CardContent>
             </Card>
          </div>

          {/* Menu Options */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Hesap Ayarları</h3>
            
            <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
               {user?.role === "admin" && (
                 <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <Settings className="w-4 h-4 text-purple-500" />
                       </div>
                       <span className="text-sm font-medium text-foreground">Yönetim Paneli</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                 </button>
               )}

               <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-blue-500" />
                     </div>
                     <span className="text-sm font-medium text-foreground">Gizlilik ve Güvenlik</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
               </button>

               <button 
                  onClick={logout}
                  className="w-full flex items-center justify-between p-4 hover:bg-destructive/10 transition-colors group"
               >
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20">
                        <LogOut className="w-4 h-4 text-destructive" />
                     </div>
                     <span className="text-sm font-medium text-destructive">Çıkış Yap</span>
                  </div>
               </button>
            </div>
          </div>
          
          <div className="text-center">
             <p className="text-[10px] text-muted-foreground/50">v2.4.0 • Build 20241214</p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}

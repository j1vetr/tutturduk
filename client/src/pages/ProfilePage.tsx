import { MobileLayout } from "@/components/MobileLayout";
import { useAuth, BAYI_KODU } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User as UserIcon, Shield, Settings } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <MobileLayout activeTab="profile">
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary border border-primary/30">
            <UserIcon className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{user?.username}</h2>
            <p className="text-xs text-muted-foreground">Üye ID: {user?.id}</p>
            {user?.role === "admin" && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-destructive/20 text-destructive text-[10px] font-bold rounded uppercase">Admin</span>
            )}
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Referans Bilgisi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
              <span className="text-sm font-medium">Kayıt Olunan Bayi Kodu</span>
              <span className="text-lg font-bold text-primary font-mono">{user?.referralCode || BAYI_KODU}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {user?.role === "admin" && (
            <Button variant="outline" className="w-full justify-start h-12" asChild>
              <a href="/admin">
                <Settings className="w-4 h-4 mr-2" />
                Yönetim Paneli
              </a>
            </Button>
          )}

          <Button variant="outline" className="w-full justify-start h-12 text-muted-foreground hover:text-foreground">
            <Shield className="w-4 h-4 mr-2" />
            Gizlilik Politikası
          </Button>

          <Button 
            variant="destructive" 
            className="w-full justify-start h-12 mt-4"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış Yap
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}

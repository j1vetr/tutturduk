import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { MOCK_PREDICTIONS, MOCK_COUPONS } from "@/lib/mockData";

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("predictions");

  if (user?.role !== "admin") {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20 font-sans">
      <header className="bg-card border-b border-border h-16 flex items-center px-4 gap-4 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/profile")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">Yönetim Paneli</h1>
      </header>

      <main className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full bg-card border border-border">
            <TabsTrigger value="predictions">Tahminler</TabsTrigger>
            <TabsTrigger value="coupons">Kuponlar</TabsTrigger>
            <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Yeni Tahmin Ekle</CardTitle>
                <Button size="sm" className="h-8"><Plus className="w-4 h-4 mr-1" /> Ekle</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Lig</Label>
                    <Input placeholder="Örn: Premier Lig" className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label>Maç</Label>
                    <Input placeholder="Örn: City - Arsenal" className="bg-background" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tahmin</Label>
                    <Input placeholder="Örn: MS 1" className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label>Oran</Label>
                    <Input type="number" step="0.01" placeholder="1.50" className="bg-background" />
                  </div>
                </div>
                <div className="space-y-2">
                   <Label>Yorum</Label>
                   <Textarea placeholder="Admin yorumu..." className="bg-background" />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">Mevcut Tahminler</h3>
              {MOCK_PREDICTIONS.map((p) => (
                <div key={p.id} className="bg-card p-3 rounded-lg border border-border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm">{p.match}</div>
                    <div className="text-xs text-muted-foreground">{p.prediction} • {p.status}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8">Düzenle</Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="coupons" className="space-y-4">
             <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Yeni Kupon Ekle</CardTitle>
                <Button size="sm" className="h-8"><Plus className="w-4 h-4 mr-1" /> Ekle</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Kupon Başlığı</Label>
                  <Input placeholder="Örn: Günün Bankosu" className="bg-background" />
                </div>
                <div className="space-y-2">
                   <Label>Maçlar (Her satıra bir maç)</Label>
                   <Textarea placeholder="Match 1..." className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Durum</Label>
                  <Select defaultValue="won">
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="won">Kazandı</SelectItem>
                      <SelectItem value="lost">Kaybetti</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">Mevcut Kuponlar</h3>
              {MOCK_COUPONS.map((c) => (
                <div key={c.id} className="bg-card p-3 rounded-lg border border-border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm">{c.title}</div>
                    <div className="text-xs text-muted-foreground">{c.totalOdds} Oran • {c.status}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8">Düzenle</Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Referans Kodları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                  <div>
                     <div className="font-mono font-bold text-primary">303603</div>
                     <div className="text-xs text-muted-foreground">Ana Bayi Kodu</div>
                  </div>
                  <div className="text-sm font-bold">Active</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

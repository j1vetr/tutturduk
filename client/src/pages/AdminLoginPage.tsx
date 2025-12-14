import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Loader2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // For mockup purposes, we'll simulate a specific admin login
      // In a real app, this would validate against the backend with role check
      if (username === "admin" && password === "admin123") {
         // Mock successful admin login by calling the auth provider's login
         // This is a simplification for the prototype
         await login(username, password);
         
         toast({
            title: "Giriş Başarılı",
            description: "Yönetici paneline yönlendiriliyorsunuz.",
            className: "bg-green-500 text-white border-none",
         });
         
         setTimeout(() => setLocation("/admin"), 1000);
      } else {
        throw new Error("Geçersiz yönetici bilgileri");
      }
    } catch (error) {
      toast({
        title: "Giriş Hatası",
        description: "Kullanıcı adı veya şifre hatalı.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
         <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <Card className="w-full max-w-md bg-zinc-900/80 border-white/10 backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
             <ShieldAlert className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display font-black text-white uppercase tracking-tight">
             Yönetici Girişi
          </CardTitle>
          <CardDescription className="text-zinc-400">
             Sistem ayarlarına erişmek için giriş yapın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-zinc-300">Kullanıcı Adı</Label>
              <div className="relative">
                 <Input 
                   id="username"
                   type="text" 
                   value={username}
                   onChange={(e) => setUsername(e.target.value)}
                   className="bg-black/50 border-white/10 text-white pl-10 focus-visible:ring-primary"
                   placeholder="admin"
                   required
                 />
                 <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Şifre</Label>
              <div className="relative">
                 <Input 
                   id="password"
                   type="password" 
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="bg-black/50 border-white/10 text-white pl-10 focus-visible:ring-primary"
                   placeholder="••••••••"
                   required
                 />
                 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-primary text-black hover:bg-primary/90 font-bold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş Yapılıyor...
                </>
              ) : (
                "Panele Giriş Yap"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function UserIcon(props: any) {
   return (
      <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
   )
}

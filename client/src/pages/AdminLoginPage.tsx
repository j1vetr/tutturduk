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
      const success = await login(username, password, false);
      
      if (success) {
         toast({
            title: "Giriş Başarılı",
            description: "Yönetici paneline yönlendiriliyorsunuz.",
            className: "bg-emerald-500 text-white border-none",
         });
         setTimeout(() => setLocation("/admin"), 1000);
      } else {
        throw new Error("Geçersiz bilgiler");
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-100 rounded-full blur-[100px]" />
         <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-100 rounded-full blur-[100px]" />
      </div>

      <Card className="w-full max-w-md bg-white border-gray-200 shadow-xl relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
             <ShieldAlert className="w-6 h-6 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl font-display font-black text-gray-800 uppercase tracking-tight">
             Yönetici Girişi
          </CardTitle>
          <CardDescription className="text-gray-500">
             Sistem ayarlarına erişmek için giriş yapın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700">Kullanıcı Adı</Label>
              <div className="relative">
                 <Input 
                   id="username"
                   type="text" 
                   value={username}
                   onChange={(e) => setUsername(e.target.value)}
                   className="bg-gray-50 border-gray-200 text-gray-800 pl-10 focus-visible:ring-emerald-500"
                   placeholder="admin"
                   required
                 />
                 <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Şifre</Label>
              <div className="relative">
                 <Input 
                   id="password"
                   type="password" 
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="bg-gray-50 border-gray-200 text-gray-800 pl-10 focus-visible:ring-emerald-500"
                   placeholder="••••••••"
                   required
                 />
                 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-emerald-500 text-white hover:bg-emerald-600 font-bold"
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

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, CheckCheck } from "lucide-react";
import { Coupon } from "@/lib/mockData";

interface CouponCardProps {
  coupon: Coupon;
}

export function CouponCard({ coupon }: CouponCardProps) {
  return (
    <div className="relative group">
      {/* Ticket Perforation Effect */}
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-8 bg-background rounded-r-full z-10" />
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-8 bg-background rounded-l-full z-10" />
      
      <Card className="border-none bg-gradient-to-br from-card to-zinc-900 overflow-hidden relative shadow-lg">
        {/* Top Decorative Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-secondary/50 via-secondary to-secondary/50" />

        <div className="absolute top-4 right-4 animate-in zoom-in duration-500 delay-100">
           <div className="bg-secondary text-black font-bold text-[10px] px-2 py-0.5 rounded shadow-[0_0_10px_rgba(0,255,0,0.3)] flex items-center gap-1">
              <CheckCheck className="w-3 h-3" />
              KAZANDI
           </div>
        </div>
        
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary/20 to-transparent border border-secondary/20 flex items-center justify-center shadow-inner">
              <Trophy className="w-6 h-6 text-secondary drop-shadow-[0_0_8px_rgba(0,200,83,0.5)]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-foreground tracking-wide">{coupon.title}</h3>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <Calendar className="w-3 h-3" />
                {coupon.date}
              </div>
            </div>
          </div>

          <div className="space-y-1 relative">
            {/* Dashed line connector */}
            <div className="absolute left-[5px] top-2 bottom-2 w-[1px] border-l border-dashed border-border/50" />
            
            {coupon.matches.map((match, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm text-muted-foreground py-1 relative z-10 group/match hover:text-foreground transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary border-2 border-card flex-shrink-0 shadow-[0_0_5px_rgba(0,200,83,0.5)]" />
                <span className="truncate font-medium">{match}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-dashed border-border/30">
            <div className="flex flex-col">
               <span className="text-[10px] text-muted-foreground uppercase font-bold">Toplam Oran</span>
               <span className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">{coupon.totalOdds.toFixed(2)}</span>
            </div>
            
            <div className="h-10 w-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
               <div className="w-6 h-6 border-2 border-white/20 rounded-full border-t-secondary animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

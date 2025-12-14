import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar } from "lucide-react";
import { Coupon } from "@/lib/mockData";

interface CouponCardProps {
  coupon: Coupon;
}

export function CouponCard({ coupon }: CouponCardProps) {
  return (
    <Card className="border-secondary/20 bg-card overflow-hidden relative">
      <div className="absolute top-0 right-0 p-2">
         <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary">
            KAZANDI
         </Badge>
      </div>
      
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">{coupon.title}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {coupon.date}
            </div>
          </div>
        </div>

        <div className="space-y-2 bg-background/50 rounded-lg p-3 border border-border/50">
          {coupon.matches.map((match, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
              {match}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <span className="text-sm text-muted-foreground">Toplam Oran</span>
          <span className="text-2xl font-bold text-primary">{coupon.totalOdds.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

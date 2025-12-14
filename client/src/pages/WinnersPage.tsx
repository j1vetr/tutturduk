import { MobileLayout } from "@/components/MobileLayout";
import { CouponCard } from "@/components/CouponCard";
import { MOCK_COUPONS } from "@/lib/mockData";

export default function WinnersPage() {
  return (
    <MobileLayout activeTab="winners">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-display text-foreground border-l-4 border-secondary pl-3">Kazanan Kuponlar</h2>
          <p className="text-xs text-muted-foreground pl-4">Geçmiş başarılarımız ve kazandıran kuponlar.</p>
        </div>

        <div className="space-y-4">
          {MOCK_COUPONS.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}

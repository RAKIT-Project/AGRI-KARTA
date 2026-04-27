import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Commodity } from "@/types";
import { cn } from "@/lib/utils";

export function CommodityCard({ 
  commodity, 
  isSelected, 
  onClick 
}: { 
  commodity: Commodity; 
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const priceChange = commodity.currentPrice - commodity.previousPrice;
  const percentageChange = (priceChange / commodity.previousPrice) * 100;
  const isUp = priceChange > 0;

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "bg-card border-border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20 hover:border-primary/50 cursor-pointer active:scale-95",
        isSelected && "border-primary ring-1 ring-primary/20"
      )}
    >
      <CardHeader className="pb-2 p-6">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">
              {commodity.name}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs mt-1">
              Kategori: {commodity.category}
            </CardDescription>
          </div>
          <div className="bg-muted px-2 py-1 rounded text-xs font-medium text-muted-foreground">
            Per {commodity.unit}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="flex items-end gap-3 mt-2">
          <span className="text-2xl font-bold text-white">
            Rp {commodity.currentPrice.toLocaleString("id-ID")}
          </span>
          <div className={cn(
            "flex items-center text-sm font-medium mb-1",
            isUp ? "text-destructive" : "text-[#39FF14]" // Red for up (inflation), Green for down 
          )}>
            {isUp ? <TrendingUp className="w-6 h-6 mr-1" /> : <TrendingDown className="w-6 h-6 mr-1" />}
            {Math.abs(percentageChange).toFixed(1)}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

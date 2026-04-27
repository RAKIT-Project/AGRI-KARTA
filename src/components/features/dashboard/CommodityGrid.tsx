"use client";

import { useState } from "react";
import type { Commodity } from "@/types";
import { CommodityCard } from "./CommodityCard";
import { PriceChart } from "./PriceChart";
import { PackageSearch } from "lucide-react";

export function CommodityGrid({ commodities }: { commodities: Commodity[] }) {
  const [selectedCommodity, setSelectedCommodity] = useState<Commodity>(commodities[0]);

  if (!commodities || commodities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-muted/50 w-20 h-20 rounded-full flex items-center justify-center mb-4">
          <PackageSearch className="w-10 h-10 text-muted-foreground/60" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Belum Ada Data Komoditas</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          Data harga komoditas belum tersedia dari server. Silakan cek kembali nanti.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:grid md:grid-cols-3 gap-6 relative">
      <div className="md:col-span-1 md:order-last sticky top-0 z-10 bg-background/95 backdrop-blur p-4 rounded-xl border border-border md:static md:bg-transparent md:backdrop-blur-none md:p-0 md:rounded-none md:border-none md:sticky md:top-6 md:self-start">
        <h3 className="text-lg font-bold mb-4 text-foreground">{selectedCommodity?.name} Trend</h3>
        {selectedCommodity && (
          <div className="bg-card p-4 rounded-xl border border-border">
            <PriceChart data={[...selectedCommodity.history, ...selectedCommodity.predicted]} />
            <div className="flex justify-between items-center mt-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Harga Aktual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded-full border border-secondary border-dashed" />
                <span className="text-muted-foreground">Prediksi AI (H+1 s/d H+7)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {commodities.map((commodity, i) => (
          <div 
            key={commodity.id} 
            className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <CommodityCard 
              commodity={commodity} 
              isSelected={selectedCommodity?.id === commodity.id}
              onClick={() => setSelectedCommodity(commodity)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

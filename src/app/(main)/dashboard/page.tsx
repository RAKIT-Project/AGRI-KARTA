import { fetchCommodities } from "@/lib/data-fetching";
import { COMMODITIES as DUMMY_COMMODITIES } from "@/lib/dummy-data";
import { CommodityGrid } from "@/components/dashboard/CommodityGrid";
import Image from "next/image";

export default async function DashboardPage() {
  // Fetch real data from Supabase; gracefully fall back to dummy data if empty
  let commodities = await fetchCommodities();
  const isUsingDummyData = commodities.length === 0;
  if (isUsingDummyData) {
    commodities = DUMMY_COMMODITIES;
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
        <Image 
          src="/logo.png"
          alt="AGRI-KARTA Logo"
          width={80}
          height={80}
          className="w-16 h-16 object-contain rounded-md"
          priority
        />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">AGRI-KARTA Dashboard</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Sistem Informasi Cerdas Pemantauan Harga Komoditas Pertanian dan Prediksi AI untuk wilayah Yogyakarta.
          </p>
          {isUsingDummyData && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-secondary/15 text-secondary-foreground px-3 py-1.5 rounded-full border border-secondary/30">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              Menampilkan data simulasi — data live belum tersedia
            </div>
          )}
        </div>
      </div>
      
      <CommodityGrid commodities={commodities} />
    </div>
  );
}

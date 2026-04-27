import { fetchCommodities } from "@/services/commodity.service";
import { CommodityGrid } from "@/components/features/dashboard/CommodityGrid";
import Image from "next/image";

export default async function DashboardPage() {
  const commodities = await fetchCommodities();

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
        </div>
      </div>
      
      <CommodityGrid commodities={commodities} />
    </div>
  );
}

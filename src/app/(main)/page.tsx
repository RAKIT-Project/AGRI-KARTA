import { COMMODITIES } from "@/lib/dummy-data";
import { CommodityGrid } from "@/components/dashboard/CommodityGrid";
import Image from "next/image";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
        <Image 
          src="/logo.jpg"
          alt="AGRI-KARTA Logo"
          width={80}
          height={80}
          className="w-16 h-16 object-contain rounded-md"
        />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">AGRI-KARTA Dashboard</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Sistem Informasi Cerdas Pemantauan Harga Komoditas Pertanian dan Prediksi AI untuk wilayah Yogyakarta.
          </p>
        </div>
      </div>
      
      <CommodityGrid commodities={COMMODITIES} />
    </div>
  );
}

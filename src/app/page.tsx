import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, LineChart, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 md:py-32 gap-12 text-center max-w-4xl mx-auto px-4">
      <div className="space-y-6 flex flex-col items-center">
        <Image 
          src="/tipografi.png"
          alt="AGRI-KARTA"
          width={300}
          height={80}
          className="h-16 w-auto object-contain mb-4"
          priority
        />
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Platform Cerdas Pemantauan <span className="text-primary">Harga Pangan</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          AGRI-KARTA membantu Petani, Pedagang, dan Konsumen untuk memantau harga komoditas penting di wilayah Yogyakarta secara real-time.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 w-full text-left">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <BarChart3 className="text-primary w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold mb-2">Apa itu AGRI-KARTA?</h3>
          <p className="text-muted-foreground text-sm">
            Platform pemantauan dan prediksi harga komoditas pangan berbasis data AI untuk stabilitas ekonomi regional.
          </p>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="bg-secondary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <LineChart className="text-secondary w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold mb-2">Kegunaan Utama</h3>
          <p className="text-muted-foreground text-sm">
            Membantu pengguna melihat tren harga komoditas real-time dan mendapatkan akses prediksi berbasis AI untuk 7 hari ke depan.
          </p>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <ShieldCheck className="text-primary w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold mb-2">Nilai Tambah</h3>
          <p className="text-muted-foreground text-sm">
            Meningkatkan transparansi pasar, memastikan pengambilan keputusan yang lebih baik, dan memitigasi risiko kerugian akibat lonjakan harga.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Link 
          href="/dashboard"
          className="inline-flex items-center justify-center whitespace-nowrap text-primary-foreground bg-primary hover:bg-primary/90 h-11 rounded-full px-8 text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          Lihat Dashboard <ArrowRight className="ml-2 w-5 h-5" />
        </Link>
        <Link 
          href="/login"
          className="inline-flex items-center justify-center whitespace-nowrap border border-primary text-primary hover:bg-primary/10 h-11 rounded-full px-8 text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          Login Pengguna
        </Link>
      </div>
    </div>
  );
}

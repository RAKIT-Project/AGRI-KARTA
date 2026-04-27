import { CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";

// WhatsApp Bot number — replace with the actual Meta bot number
const WA_BOT_NUMBER = "6281234567890";
const WA_ACTIVATION_LINK = `https://wa.me/${WA_BOT_NUMBER}?text=AKTIFKAN%20AGRI-KARTA`;

interface WhatsAppStatusProps {
  isVerified: boolean;
}

export function WhatsAppStatus({ isVerified }: WhatsAppStatusProps) {
  if (isVerified) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-[#166534]/10 border border-[#166534]/20">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#25D366]/15">
          <CheckCircle2 className="w-5 h-5 text-[#25D366]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#166534]">
              WhatsApp Terverifikasi
            </span>
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#25D366] text-white rounded-full">
              Aktif
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Anda akan menerima notifikasi harga secara real-time melalui WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg bg-secondary/10 border border-secondary/20">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary/15 shrink-0">
          <AlertTriangle className="w-5 h-5 text-secondary" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-foreground">
            WhatsApp Belum Terverifikasi
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verifikasi nomor WhatsApp Anda untuk menerima notifikasi harga real-time. 
            Klik tombol di bawah untuk mengirim pesan aktivasi ke bot kami.
          </p>
        </div>
      </div>
      <a
        href={WA_ACTIVATION_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center w-full sm:w-auto h-9 px-4 rounded-lg text-sm font-medium bg-[#25D366] hover:bg-[#25D366]/90 text-white shadow-lg shadow-[#25D366]/25 transition-all hover:shadow-xl hover:shadow-[#25D366]/30 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/50"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Verifikasi WhatsApp
        <ExternalLink className="w-4 h-4 ml-2" />
      </a>
    </div>
  );
}

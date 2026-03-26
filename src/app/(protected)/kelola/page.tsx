"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Bell, Smartphone, Mail, Save } from "lucide-react";

const COMMODITIES = [
  { id: "beras", label: "Beras Medium" },
  { id: "cabai-merah", label: "Cabai Merah Keriting" },
  { id: "bawang-merah", label: "Bawang Merah" },
  { id: "bawang-putih", label: "Bawang Putih Honan" },
  { id: "telur-ayam", label: "Telur Ayam Ras" },
  { id: "daging-ayam", label: "Daging Ayam Ras" },
];

export default function KelolaPreferencesPage() {
  const [useEmail, setUseEmail] = useState(true);
  const [useWhatsapp, setUseWhatsapp] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set(["beras", "cabai-merah"]));

  const toggleCommodity = (id: string) => {
    const newItems = new Set(selectedItems);
    if (newItems.has(id)) {
      newItems.delete(id);
    } else {
      newItems.add(id);
    }
    setSelectedItems(newItems);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate toast
    alert("Preferensi notifikasi berhasil disimpan!");
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Bell className="w-8 h-8" />
          Kelola Notifikasi
        </h1>
        <p className="text-muted-foreground mt-2">
          Atur komoditas yang ingin Anda pantau dan cara kami menghubungi Anda.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Preferensi Komoditas</CardTitle>
            <CardDescription>
              Pilih komoditas yang peringatan harganya ingin Anda terima.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            {COMMODITIES.map((item) => (
              <div key={item.id} className="flex flex-row items-center space-x-3 space-y-0 p-4 border border-border rounded-md hover:bg-muted/50 transition-colors">
                <Checkbox 
                  id={item.id}
                  checked={selectedItems.has(item.id)}
                  onCheckedChange={() => toggleCommodity(item.id)}
                />
                <Label htmlFor={item.id} className="font-normal cursor-pointer flex-1">
                  {item.label}
                </Label>
              </div>
            ))}
          </CardContent>
          <CardHeader className="border-t border-border mt-4">
            <CardTitle>Metode Pengiriman</CardTitle>
            <CardDescription>
              Bagaimana Anda ingin menerima peringatan perubahan harga?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Notifikasi Email
                </Label>
                <div className="text-sm text-muted-foreground">
                  Terima ringkasan harian via email.
                </div>
              </div>
              <Switch 
                checked={useEmail} 
                onCheckedChange={setUseEmail} 
              />
            </div>
            
            <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-secondary" />
                    Notifikasi WhatsApp
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    Terima peringatan instan (real-time) via WA.
                  </div>
                </div>
                <Switch 
                  checked={useWhatsapp} 
                  onCheckedChange={setUseWhatsapp} 
                />
              </div>
              
              {useWhatsapp && (
                <div className="pt-4 border-t border-border animate-in fade-in slide-in-from-top-2">
                  <Label htmlFor="wa" className="mb-2 block">Nomor WhatsApp Aktif</Label>
                  <Input 
                    id="wa"
                    placeholder="Contoh: 081234567890" 
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    required={useWhatsapp}
                    className="max-w-xs"
                  />
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t border-border pt-6">
            <Button type="submit" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" />
              Simpan Preferensi
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

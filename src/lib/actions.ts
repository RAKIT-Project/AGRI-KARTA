"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  success: boolean;
  message: string;
}

/**
 * Server Action: Update user's phone number in the `users` table.
 * Validates the number format before saving.
 * If the user row doesn't exist yet, creates one via upsert.
 */
export async function updatePhoneNumber(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const phoneNumber = formData.get("phone_number") as string;

  if (!phoneNumber || phoneNumber.trim() === "") {
    return { success: false, message: "Nomor telepon wajib diisi." };
  }

  // Validate Indonesian phone number format
  const cleaned = phoneNumber.replace(/[\s\-()]/g, "");
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;
  if (!phoneRegex.test(cleaned)) {
    return {
      success: false,
      message: "Format nomor telepon tidak valid. Gunakan format: 08xx atau +628xx.",
    };
  }

  // Normalize to international format (+628xx)
  let normalized = cleaned;
  if (normalized.startsWith("08")) {
    normalized = "+62" + normalized.substring(1);
  } else if (normalized.startsWith("628")) {
    normalized = "+" + normalized;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Anda belum login." };
  }

  // Try update first
  const { error: updateError } = await supabase
    .from("users")
    .update({
      phone_number: normalized,
      is_wa_verified: false, // Reset verification when number changes
    })
    .eq("id", user.id);

  if (updateError) {
    // If the row doesn't exist, try upsert
    const { error: upsertError } = await supabase.from("users").upsert({
      id: user.id,
      email: user.email,
      phone_number: normalized,
      is_wa_verified: false,
    });

    if (upsertError) {
      console.error("[updatePhoneNumber] Supabase error:", upsertError.message);
      return {
        success: false,
        message: "Gagal menyimpan nomor telepon. Silakan coba lagi.",
      };
    }
  }

  revalidatePath("/profile");
  revalidatePath("/kelola");

  return {
    success: true,
    message: "Nomor telepon berhasil disimpan! Silakan verifikasi WhatsApp Anda.",
  };
}

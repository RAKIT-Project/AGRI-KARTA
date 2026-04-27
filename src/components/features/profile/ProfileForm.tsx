"use client";

import { useActionState } from "react";
import { updatePhoneNumber, type ActionResult } from "@/actions/user.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Phone, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ProfileFormProps {
  currentPhoneNumber: string | null;
}

export function ProfileForm({ currentPhoneNumber }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    updatePhoneNumber,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone_number" className="flex items-center gap-1.5 text-sm font-medium">
          <Phone className="w-4 h-4 text-muted-foreground" />
          Nomor WhatsApp
        </Label>
        <div className="flex gap-3">
          <Input
            id="phone_number"
            name="phone_number"
            type="tel"
            placeholder="Contoh: 081234567890"
            defaultValue={currentPhoneNumber ?? ""}
            className="max-w-xs bg-input border-border focus-visible:ring-primary"
            disabled={isPending}
          />
          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan Nomor"
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Gunakan format Indonesia: 08xx, +628xx, atau 628xx
        </p>
      </div>

      {/* Success/Error feedback */}
      {state && (
        <div
          className={`flex items-start gap-2 p-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
            state.success
              ? "bg-[#166534]/10 text-[#166534] border border-[#166534]/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {state.success ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span>{state.message}</span>
        </div>
      )}
    </form>
  );
}

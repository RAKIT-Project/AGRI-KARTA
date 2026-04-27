import { createClient } from "@/lib/supabase/server";
import type {
  Commodity,
  DailyPrice,
  DailyPriceRow,
  CommodityRow,
  PricePredictionRow,
  UserProfile,
} from "@/types";

// ──────────────────────────────────────────────────
// Fallback commodity metadata when the `commodities`
// table is empty or the join yields null.
// ──────────────────────────────────────────────────
const COMMODITY_META: Record<number, { name: string; category: string; unit: string }> = {
  1: { name: "Beras Medium", category: "Pangan Pokok", unit: "kg" },
  2: { name: "Cabai Merah Keriting", category: "Sayuran", unit: "kg" },
  3: { name: "Bawang Merah", category: "Bumbu", unit: "kg" },
  4: { name: "Bawang Putih Honan", category: "Bumbu", unit: "kg" },
  5: { name: "Telur Ayam Ras", category: "Peternakan", unit: "kg" },
  6: { name: "Daging Ayam Ras", category: "Peternakan", unit: "kg" },
};

// ──────────────────────────────────────────────────
// Commodity / Price Data Fetching (Public, read-only)
// ──────────────────────────────────────────────────

/**
 * Fetch all commodities with their historical + predicted prices.
 * Returns aggregated `Commodity[]` ready for the dashboard UI.
 *
 * Strategy:
 * 1. Query `daily_prices` for actual prices
 * 2. Query `price_predictions` for AI predictions
 * 3. Try to join with `commodities` for names; fall back to COMMODITY_META
 * 4. Group and aggregate into the frontend `Commodity` shape
 */
export async function fetchCommodities(): Promise<Commodity[]> {
  const supabase = await createClient();

  // 1. Fetch actual prices
  const { data: priceRows, error: priceError } = await supabase
    .from("daily_prices")
    .select("*")
    .order("date", { ascending: true });

  if (priceError) {
    console.error("[fetchCommodities] daily_prices error:", priceError.message);
    return [];
  }

  // 2. Fetch predictions
  const { data: predictionRows, error: predError } = await supabase
    .from("price_predictions")
    .select("*")
    .order("target_date", { ascending: true });

  if (predError) {
    console.error("[fetchCommodities] price_predictions error:", predError.message);
    // Non-fatal: continue without predictions
  }

  // 3. Try to fetch commodity metadata
  const { data: commodityRows } = await supabase
    .from("commodities")
    .select("*");

  const commodityLookup = new Map<number, { name: string; category: string; unit: string }>();
  if (commodityRows && commodityRows.length > 0) {
    for (const c of commodityRows as CommodityRow[]) {
      commodityLookup.set(c.id, {
        name: c.name ?? `Komoditas #${c.id}`,
        category: c.category ?? "Lainnya",
        unit: c.unit ?? "kg",
      });
    }
  }

  if (!priceRows || priceRows.length === 0) return [];

  return aggregateCommodities(
    priceRows as DailyPriceRow[],
    (predictionRows ?? []) as PricePredictionRow[],
    commodityLookup
  );
}

// ──────────────────────────────────────────────────
// User Profile Data Fetching (Protected)
// ──────────────────────────────────────────────────

/**
 * Fetch the current authenticated user's profile from `users` table.
 */
export async function fetchUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    // If the user row doesn't exist yet, return a sensible default
    if (error.code === "PGRST116") {
      return {
        id: user.id,
        email: user.email ?? "",
        full_name: user.user_metadata?.full_name ?? null,
        phone_number: null,
        is_wa_verified: false,
        created_at: user.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    console.error("[fetchUserProfile] Supabase error:", error.message);
    return null;
  }

  return data as UserProfile;
}

// ──────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────

function getMeta(
  commodityId: number,
  lookup: Map<number, { name: string; category: string; unit: string }>
) {
  return (
    lookup.get(commodityId) ??
    COMMODITY_META[commodityId] ?? {
      name: `Komoditas #${commodityId}`,
      category: "Lainnya",
      unit: "kg",
    }
  );
}

/**
 * Groups raw price rows + prediction rows into Commodity objects.
 * Null prices are forward-filled to keep charts connected.
 */
function aggregateCommodities(
  priceRows: DailyPriceRow[],
  predictionRows: PricePredictionRow[],
  commodityLookup: Map<number, { name: string; category: string; unit: string }>
): Commodity[] {
  // Group actual prices by commodity_id
  const actualMap = new Map<number, DailyPriceRow[]>();
  for (const row of priceRows) {
    const existing = actualMap.get(row.commodity_id) ?? [];
    existing.push(row);
    actualMap.set(row.commodity_id, existing);
  }

  // Group predictions by commodity_id
  const predMap = new Map<number, PricePredictionRow[]>();
  for (const row of predictionRows) {
    const existing = predMap.get(row.commodity_id) ?? [];
    existing.push(row);
    predMap.set(row.commodity_id, existing);
  }

  // Get all unique commodity IDs
  const allIds = new Set([...actualMap.keys(), ...predMap.keys()]);

  const commodities: Commodity[] = [];

  for (const commodityId of allIds) {
    const meta = getMeta(commodityId, commodityLookup);
    const actuals = actualMap.get(commodityId) ?? [];
    const predictions = predMap.get(commodityId) ?? [];

    const history: DailyPrice[] = [];
    let lastKnownPrice = 0;

    for (const row of actuals) {
      const price = row.actual_price ?? lastKnownPrice;
      if (row.actual_price !== null) lastKnownPrice = row.actual_price;
      history.push({ date: row.date, price, isPredicted: false });
    }

    const predicted: DailyPrice[] = [];
    for (const row of predictions) {
      const price = row.predicted_price ?? lastKnownPrice;
      if (row.predicted_price !== null) lastKnownPrice = row.predicted_price;
      predicted.push({ date: row.target_date, price, isPredicted: true });
    }

    const currentPrice =
      history.length > 0
        ? history[history.length - 1].price
        : predicted.length > 0
          ? predicted[0].price
          : 0;

    const previousPrice =
      history.length > 1 ? history[history.length - 2].price : currentPrice;

    commodities.push({
      id: String(commodityId),
      name: meta.name,
      category: meta.category,
      unit: meta.unit,
      currentPrice,
      previousPrice,
      history,
      predicted,
    });
  }

  return commodities;
}

// ──────────────────────────────────────────────────
// Supabase Database Schema Types (matches actual DB)
// ──────────────────────────────────────────────────

/** Raw row from the `daily_prices` table (public, read-only) */
export interface DailyPriceRow {
  id: number;
  commodity_id: number;
  region_id: number;
  date: string; // ISO date YYYY-MM-DD
  actual_price: number | null;
}

/** Raw row from the `commodities` table */
export interface CommodityRow {
  id: number;
  name?: string;
  category?: string;
  unit?: string;
}

/** Raw row from the `price_predictions` table */
export interface PricePredictionRow {
  id: number;
  commodity_id: number;
  region_id?: number;
  target_date: string;
  predicted_price: number | null;
}

/** User profile from the `users` table */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  is_wa_verified: boolean;
  created_at: string;
  updated_at: string;
}

/** Row from the `price_alerts` table (private per user) */
export interface PriceAlert {
  id: number;
  user_id: string;
  commodity_id: number;
  threshold_price: number;
  alert_type: "above" | "below";
  is_active: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────────
// Frontend UI Types (consumed by components)
// ──────────────────────────────────────────────────

/** Single price data point for charts */
export interface DailyPrice {
  date: string;
  price: number;
  isPredicted: boolean;
}

/** Aggregated commodity data for dashboard cards & charts */
export interface Commodity {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentPrice: number;
  previousPrice: number;
  history: DailyPrice[];
  predicted: DailyPrice[];
}

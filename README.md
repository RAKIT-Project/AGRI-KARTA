# AGRI-KARTA (Agro-Intelligence for Yogyakarta)

AGRI-KARTA is an advanced "Agro-Intelligence" system explicitly designed for the Yogyakarta region. It provides real-time agricultural commodity price monitoring, comprehensive dashboards, early warning price alerts, and AI-driven predictive analytics to help farmers, policymakers, and markets stay ahead of economic trends.

## 🚀 Key Features
- **Real-time Price Monitoring**: Track up-to-date prices of crucial agricultural commodities across Yogyakarta.
- **AI Price Prediction**: Machine learning insights providing a 7-day outlook for various staples (rice, chili, onion, chicken, eggs).
- **Early Warning System**: Configurable price alerts notify registered users when commodity limits breach critical thresholds.
- **AI Chatbot Assistant**: Ask questions and get interactive insights regarding today's prices via the integrated AI Chatbot.

## 💻 Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Styling:** Tailwind CSS v4 + Shadcn UI
- **Database / Auth:** Supabase SSR
- **PWA:** @ducanh2912/next-pwa
- **Icons & Fonts:** Lucide React, Geist / Inter Fonts

## 🛠️ Prerequisites
- Node.js (v18 or higher recommended)
- npm, yarn, or pnpm
- A Supabase account and a pre-configured Supabase project URL and Anon Key.

## ⚙️ Installation & Setup

1. **Clone the repository and install dependencies:**
   ```bash
   git clone [repository-url]
   cd panen-ai
   npm install
   ```

2. **Configure Environment Variables:**
   Copy the example environment file and fill in your Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```
   *Make sure you set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.*

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to explore AGRI-KARTA.

4. **Building for Production:**
   ```bash
   npm run build
   npm start
   ```

*Note: This project relies on Next.js Turbopack by default for the `npm run dev` and `npm run build` scripts to prevent local compilation hanging issues.*

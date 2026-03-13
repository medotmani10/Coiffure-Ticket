# 🚗 Lavage Ticket — نظام إدارة محطات غسيل السيارات

<p align="center">
  <strong>A premium, real-time queue management SaaS for car wash stations — built mobile-first with Arabic RTL support.</strong>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=flat-square">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white&style=flat-square">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white&style=flat-square">
  <img alt="PWA" src="https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white&style=flat-square">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square">
</p>

---

## 📖 Overview

**Lavage Ticket** is a full-stack SaaS queue management system designed specifically for car wash stations. It replaces physical ticketing machines with a smart digital platform: station owners manage their queue from an installed PWA, while customers join and track their position in real time by scanning a QR code or visiting the station's unique URL — no app download required.

---

## ✨ Key Features:

### 🏢 For Station Owners (Admin PWA)
| Feature | Description |
|---|---|
| **Station Dashboard** | Central dashboard — shows currently serving ticket and full waiting list |
| **Manual Ticket Creation** | Instantly add walk-in customers |
| **Next Customer Button** | Calls the next waiting customer with one tap |
| **Finish & Cancel** | Complete or cancel any active ticket at any time |
| **Station Open/Close Toggle** | Instantly opens or closes accepting new bookings |
| **All Tickets View** | Unified list of all active tickets |
| **Archive** | Full history of completed and canceled tickets |
| **Thermal Print + PDF** | Print tickets on 58mm thermal printers; auto-downloads PDF copy |
| **Real-time Sync** | Dashboard updates live via Supabase Realtime — no refresh needed |
| **Settings** | Edit station name, slug, logo, maps link, phone number |

### 📱 For Customers (Web Browser)
| Feature | Description |
|---|---|
| **Ticket Codes** | Each ticket gets a unique code |
| **Live Queue Position** | See exactly how many cars are ahead in the line |
| **Real-time Status** | Instant notification when it's their turn |
| **Ticket Tracking via QR** | Scan the printed ticket's QR → direct link to their ticket status page |
| **Cancel Ticket** | Cancel their booking at any time while waiting |
| **No Double Booking** | System prevents creating a second ticket while one is active |

---

## 🏗️ Architecture & Tech Stack

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (Vite + React)                   │
│  ┌──────────────────────┐         ┌───────────────────────┐  │
│  │    Customer Web      │         │      Admin PWA        │  │
│  │  customer.* /:slug   │         │  admin.* /admin       │  │
│  │  /t/:ticketId        │         │  /admin/archive       │  │
│  └──────────┬───────────┘         └───────────┬───────────┘  │
└─────────────┼─────────────────────────────────┼──────────────┘
              │  Supabase JS Client (REST + WS) │
┌─────────────▼─────────────────────────────────▼──────────────┐
│                       Supabase (BaaS)                        │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐    │
│  │PostgreSQL│   │ Realtime │   │   Auth   │   │ Storage │    │
│  │  tables  │   │ channels │   │  (email) │   │(logos)  │    │
│  └──────────┘   └──────────┘   └──────────┘   └─────────┘    │
└──────────────────────────────────────────────────────────────┘
```

| Layer | Technology |
|---|---|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 7 |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Backend / Database** | Supabase (PostgreSQL + Realtime + Auth + Storage) |
| **Routing** | React Router DOM v7 |
| **Notifications** | Sonner (toast) |
| **QR Code** | qrcode.react |
| **PDF Generation** | html2pdf.js |
| **PWA** | vite-plugin-pwa (workbox) |
| **Icons** | Lucide React |

---

## 🗺️ Routes

| Path | Domain/Access | Description |
|---|---|---|
| `/` | Main / Public | Landing page + auth (login/signup) |
| `/` | Super Admin / Public | Super Admin Login |
| `/admin` | Super Admin / Auth | Super Admin Dashboard |
| `/` | Admin / Public | Login page |
| `/onboarding` | Admin / Auth | Initial station setup wizard |
| `/admin` | Admin / Auth (PWA) | Main admin dashboard |
| `/admin/archive` | Admin / Auth (PWA) | Ticket history |
| `/admin/settings` | Admin / Auth (PWA) | Station settings |
| `/:slug` | Customer / Web only | Customer booking page for a specific station |
| `/t/:ticketId` | Customer / Public | Direct ticket status page (QR code target) |

> **Note:** Access control is managed through subdomains (`admin`, `superadmin`, `customer`/`costumer`) mapping to different parts of the application.

---

## 🗄️ Database Schema

### `shops`
```sql
id          uuid PRIMARY KEY
owner_id    uuid REFERENCES auth.users
slug        text UNIQUE          -- used in the public booking URL
name        text
logo_url    text (nullable)
maps_url    text (nullable)
phone       text (nullable)
is_open     boolean DEFAULT true
status      enum('pending', 'approved', 'rejected')
created_at  timestamptz
```

### `tickets`
```sql
id               uuid PRIMARY KEY
shop_id          uuid REFERENCES shops
customer_name    text
phone_number     text
people_count     integer DEFAULT 1
ticket_number    integer              -- sequential per station per day
user_session_id  text                 -- prevents duplicate bookings
status           enum('waiting', 'serving', 'completed', 'canceled')
created_at       timestamptz
updated_at       timestamptz
```

### Key Stored Procedures
| Procedure | Purpose |
|---|---|
| `get_next_ticket_number(p_shop_id)` | Returns the next sequential ticket number for today |
| `process_next_customer(p_shop_id)` | Atomically marks current ticket as complete and promotes next waiting customer; uses `FOR UPDATE SKIP LOCKED` to prevent race conditions |

---

## 🖨️ Thermal Print & PDF

When a ticket is printed from the admin dashboard:
1. A **58mm thermal-width** print window opens and auto-triggers `window.print()`
2. Simultaneously, a **PDF is downloaded** automatically
3. The **QR code** on the ticket links to `/t/:ticketId` — when scanned, the customer sees their live ticket status directly, with cancel option and realtime updates

---

## 🔐 Security

- **Row Level Security (RLS)** enabled on all tables
- Station owners can only read/write their own station's data
- Customers interact only through anon key (read public station data, insert tickets)
- Session-based duplicate prevention (one active ticket per session)
- Race condition protection via `FOR UPDATE SKIP LOCKED` in SQL stored procedures

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- A [Supabase](https://supabase.com) project

### 1. Clone & Install
```bash
git clone https://github.com/medotmani10/quesys.git
cd quesys
npm install
```

### 2. Environment Variables
```bash
cp .env.example .env
```
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Locally
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## 📱 PWA Installation

The admin interface is designed as an installable PWA:
- On Android/Chrome: **Add to Home Screen** from the browser menu
- On iOS/Safari: **Share → Add to Home Screen**
- On Desktop: install icon in the address bar

Once installed, the PWA opens in standalone mode (no browser UI).

---

## 🎨 Design Language

- **Color palette**: Black (`#000`) + Zinc grays — premium aesthetic
- **Typography**: Cairo + Noto Kufi Arabic + Outfit (Google Fonts)
- **Direction**: Full RTL (Arabic-first)
- **Animations**: `animate-in`, `fade-in`, `slide-in` for all tab/page transitions
- **Cards**: `rounded-2xl` with subtle glow on hover
- **Mobile-first**: Tested on 360px minimum viewport

---

## 📄 License

MIT License — free to use, modify, and distribute.

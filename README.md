# 🦅 Falcon Unlocker

**The first Telegram-native GSM Server.**

> 100% Telegram Bot API + Telegram Mini Apps SDK — No website. No /slash commands. Pure Telegram experience.

---

## Vision

Falcon Unlocker is **not** a website.  
It's a **Telegram-native GSM platform** where the Bot + Telegram Mini App completely replace a traditional web interface.

- No public website
- No /slash commands
- Navigation only with native Telegram buttons
- Next.js (App Router) + Vercel Serverless
- Neon PostgreSQL
- Responsive: Desktop Telegram + Mobile Telegram
- Premium dark/red interface
- Language: English only
- Currency: USD ($) only

---

## Architecture

```
Telegram
├── Native Bot
│
├── Telegram Mini App
│
└── NextJS Serverless
      │
      ├── Neon DB
      ├── Telegram Bot API
      ├── Telegram WebApp SDK
      └── Admin Panel
```

**The Bot handles:**
- Notifications
- Mini App launcher
- Confirmations
- Buttons
- Payments
- Alerts
- Quick history

**All user experience lives in the Mini App.**

---

## Chapter 1 — Foundation

**Objective:** Create an extremely clean base.

**Modules:**
- NextJS App Router
- TypeScript
- Tailwind
- Telegram SDK
- Neon
- Prisma
- Telegram Auth
- Server Actions
- Middleware
- Telegram Theme
- Safe Area
- Responsive

**Goal:** Mini App opens correctly on:
- Telegram Android
- Telegram iPhone
- Telegram Desktop
- Telegram macOS

---

## Chapter 2 — Authentication

- Automatic login via Telegram
- No login form
- No password
- Account created automatically

**User Information:**
- Telegram ID
- Username
- First Name
- Last Name
- Avatar
- Creation date
- First user flag

**Roles:**
- Customer
- Admin

---

## Chapter 3 — Dashboard

**Home Cards:**
- Balance: $152.00
- Pending Orders
- Completed
- Rejected
- News
- Promotion

**Quick Actions:**
- Recharge
- Orders
- Profile
- Support

**Navbar (top only, never bottom):**

```
☰  Falcon Unlocker  Balance  Notifications  Avatar
```

**Menu:**
- Dashboard
- IMEI
- Server
- Orders
- Wallet
- Settings
- Support
- About
- Logout

---

## Chapter 4 — IMEI Services

Created by Admin only. Each service has:

| Field | Description |
|-------|-------------|
| Name | Service name |
| Price | USD amount |
| Description | Service details |
| Estimated time | Delivery time |
| Status | Online / Offline / Maintenance |
| Badge | Popular / New / Featured |
| Image | Service icon |
| Category | Service category |
| Display order | Sort position |

**Custom Fields (per service):**

Examples: IMEI, SN, ECID, Model, Carrier, Notes

Each field type:
- Text
- Textarea
- Number
- Select
- Checkbox
- Required or optional

---

## Chapter 5 — Server Services

Same principle as IMEI. Service types:
- License
- Activation
- Credits
- Subscription
- Unlock
- FRP
- Flash
- Repair

Each service can request:
- Username
- Password
- Token
- IP
- Serial
- Custom Textbox

Admin configures all fields.

---

## Chapter 6 — Order History

**Two histories:**
- IMEI Orders
- Server Orders

**Each line:**
- Order ID
- Date
- Status
- Price
- Service
- Tracking
- Notes
- Download result

Features: Search, Filters

---

## Chapter 7 — Wallet

- Balance display
- Recharge
- Transaction history

**Manual recharge system:**

Admin configures:
- Instructions
- Account details
- Crypto addresses
- Bank info
- Mobile Money
- Custom text
- Images
- QR Codes

**Flow:**
1. User sends proof of payment
2. Recharge order created
3. Admin validates
4. Balance credited

---

## Chapter 8 — Account

- Avatar
- Telegram info
- Username
- Balance
- Language: Always English
- Currency: Always USD

**Security:**
- PIN
- Biometric
- Telegram Session
- Logout

---

## Chapter 9 — Notifications

100% via Telegram Bot.

**Examples:**
- Order received
- Payment accepted
- Payment rejected
- Order completed
- Promotion
- Maintenance
- Balance updated
- Support reply

All with native Telegram buttons.

---

## Chapter 10 — Support

- Chat
- Tickets
- FAQ
- About
- Help

All editable from Admin panel.

---

## Chapter 11 — Admin Panel

**Sections:**
- Dashboard
- Users
- Services (IMEI + Server)
- Categories
- Wallet
- Orders
- News
- Notifications
- Logs
- Settings
- Support
- About
- Statistics

### Service Management
- Create / Edit / Delete / Duplicate
- Activate / Deactivate / Maintenance
- Image / Price / Order / Description
- Delays / Category / Badge (Featured, Popular, New)

### Form Generator
Admin adds fields without coding:

| Type | Description |
|------|-------------|
| Text | Single line |
| Number | Numeric |
| Textarea | Multi-line |
| Select | Dropdown |
| Checkbox | Boolean |
| Date | Date picker |
| Password | Hidden input |
| Email | Email validation |
| IP | IP format |
| IMEI | IMEI format |
| SN | Serial number |
| ECID | ECID format |
| JSON | JSON input |

Each field supports:
- Regex Validation
- Placeholder
- Required flag
- Default Value
- Display Order

### Order Workflow

```
Pending → Checking → Processing → Completed
                                 → Rejected
                                 → Cancelled
```

Each step records: Date, Admin, Comment, History, Telegram Notification

### User Management
- Suspend / Block / Unblock
- Modify Balance
- Create Admin / Moderator
- Logs / Sessions

### News
- Create / Edit / Schedule / Pin / Popup

### Popup
- Create / Edit
- Color / Image / Animation
- Expiration date
- Button / Link

### About & Help
- Editable (Markdown + Images)
- Categories
- Search

---

## Responsive Design

### Mobile
- Fullscreen only
- Respect Safe Area
- One card per row
- Smooth vertical scroll
- Large touch targets

### Desktop Telegram
- Dynamic width
- Adaptive 3-column grid:

```
□ □ □
□ □ □
□ □ □
```

- No fixed width
- Content fills entire Telegram Desktop window

---

## UX Premium

- Smooth animations (Framer Motion)
- Skeleton loaders
- Haptic Feedback (mobile)
- Native popups
- Full-screen confirmation after order submission
- Instant search
- Dynamic filters
- Infinite pagination
- Theme synced with Telegram (light/dark)

---

## Technical Structure

```
Telegram Native Bot
│
├── Notifications
├── Native Keyboard
├── Deep Links
├── WebApp Launcher
└── Order Alerts

Mini App
│
├── Dashboard
├── IMEI
├── Server
├── Wallet
├── Orders
├── Profile
├── Support
└── Settings

Backend
│
├── Next.js Serverless
├── Prisma ORM
├── Neon PostgreSQL
├── Telegram Bot API
├── Telegram Mini App SDK
├── Authentication
├── Webhooks
└── Audit Logs
```

---

## Positioning

Falcon Unlocker differentiates from DHRU Fusion: instead of a traditional website, it becomes a fully Telegram-native GSM platform where the bot handles notifications and entry points, while the entire user experience takes place in a modern Mini App optimized for both Telegram Desktop and mobile.

---

## License

Private — All rights reserved.

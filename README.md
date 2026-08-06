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

## Provider Gateway — Global Rule

This project must never be built around a specific provider (e.g. DHRU only).

Falcon Unlocker must use a Provider Gateway Architecture, where every provider is isolated in its own connector.

Adding a new provider must never require modifying the core application. The only requirement should be creating a new connector implementing the common provider interface.

The core application must remain independent of provider-specific implementations.

---

## Chapter 12 — Provider Center (Admin)

### Objective

Create a centralized Provider Management module.

The administrator must be able to:

- Add a provider
- Edit a provider
- Delete a provider
- Enable / Disable a provider
- Test API connection
- View provider status
- View provider balance (if supported)
- Configure automatic synchronization
- View connection history

### Supported Provider Types

- DHRU Fusion API
- PHP API
- REST API
- JSON API
- XML API
- Custom API

Each provider must contain:

- Provider Name
- Provider Type
- Base URL
- Username
- API Key
- API Secret
- Token (optional)
- Timeout
- Priority
- Status
- Auto Sync (ON/OFF)

---

## Chapter 13 — Provider Connector Engine

### Objective

Create a unified connector architecture.

Every provider connector must expose the exact same interface.

**Required Functions**

- connect()
- disconnect()
- testConnection()
- getServices()
- submitOrder()
- checkOrderStatus()
- cancelOrder()
- getBalance()
- syncServices()

The Falcon core must communicate only with these methods.

No provider-specific logic should exist outside the connector.

---

## Chapter 14 — Service Mapping

### Objective

Create a Service Mapping System.

Falcon services and Provider services are independent.

Each Falcon service can be linked to one or multiple provider services.

**Features**

- Manual mapping
- Automatic mapping
- Multiple providers per service
- Provider Service ID
- Falcon Service ID
- Priority order
- Enable / Disable mapping

**Example**

```
Falcon: Apple FMI OFF
  ↓
Provider A → Service ID: 245
Provider B → Service ID: 889
```

---

## Chapter 15 — Smart Routing Engine

### Objective

Automatically choose the best provider.

**Routing options**

- Cheapest provider
- Fastest provider
- Highest success rate
- Preferred provider
- Manual provider selection

**Fallback System**

```
If Provider A fails
  ↓
Automatically retry Provider B
  ↓
Then Provider C
without user intervention.
```

---

## Chapter 16 — Automatic Synchronization

### Objective

Synchronize provider data automatically.

**Synchronizable data**

- Services
- Categories
- Prices
- Estimated Time
- Status
- Provider Balance

**Admin can configure**

- Manual Sync
- Every hour
- Every 6 hours
- Daily

Synchronization must never overwrite administrator customizations unless explicitly allowed.

---

## Chapter 17 — API Logs

### Objective

Create a complete API logging system.

Every API request must be logged.

**Stored data**

- Date
- Provider
- Endpoint
- Request
- Response
- Execution Time
- Status Code
- Error Message

**Features**

- Search
- Filters
- Export
- Retry Request

---

## Chapter 18 — Queue & Retry System

### Objective

Create a reliable queue system.

**Workflow**

```
Order → Queue → Provider → Response
```

If provider fails: retry automatically.

**Retry configuration**

- Maximum retries
- Retry delay
- Timeout
- Cancel queue
- Manual retry

Queue must prevent duplicate submissions.

---

## Chapter 19 — Security Center

### Objective

Protect every provider integration.

**Requirements**

- Encrypt API Keys
- Encrypt Secrets
- Secure Token Storage
- Audit Logs
- Admin Action Logs
- Rate Limiting
- IP Restrictions (future-ready)
- Secret Rotation Support

Sensitive credentials must never be exposed to the frontend.

---

## Chapter 20 — Monitoring Dashboard

### Objective

Create a real-time Provider Monitoring Center.

**Metrics**

- Provider Status
- Online / Offline
- Success Rate
- Failed Requests
- Average Response Time
- Active Orders
- Daily Orders
- Provider Balance
- Synchronization Status

**Charts**

- Success Rate
- Error Rate
- Response Time
- Orders per Provider

---

## Chapter 21 — Final QA & Production Validation

### Objective

Validate the platform before production.

**Telegram Compatibility**

- Telegram Android
- Telegram iOS
- Telegram Desktop Windows
- Telegram Desktop macOS
- Telegram Desktop Linux

**Responsive Validation**

Desktop:
- Adaptive 3-column grid
- Full-width layout
- Smooth scrolling

Mobile:
- Fullscreen only
- Safe Area support
- One-card layout
- Native touch interactions

**Functional Tests**

- Authentication
- Wallet
- Orders
- IMEI Services
- Server Services
- Manual Processing
- Automatic Processing
- Notifications
- Provider Gateway
- Synchronization
- API Logs
- Queue
- Retry System

**Performance**

- Fast loading
- Serverless optimized
- Lazy Loading
- Skeleton Loading
- Optimized Database Queries

**Production Checklist**

- No hardcoded provider logic
- No exposed API credentials
- Complete audit logs
- Clean error handling
- Telegram-native UX
- Stable serverless deployment on Vercel
- Fully compatible with Neon PostgreSQL

---

## Final Architecture Principle

Falcon Unlocker is not a DHRU clone.

Falcon Unlocker is a Telegram-native GSM Platform built around a modular Provider Gateway architecture.

The system must remain scalable, maintainable, and extensible.

Future providers should be integrated by creating a new connector only, without modifying the core application.

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

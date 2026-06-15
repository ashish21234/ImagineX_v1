# 🧩 ImagineX — System Design Documentation

## Problem Statement

Build a scalable, production-ready web application where users can generate AI images from text prompts, with a credit-based access model and integrated payment processing.

---

## System Requirements

### Functional Requirements
- User registration and login with secure authentication
- Text-to-image generation using an AI model
- Credit system: new users receive 5 free credits; each generation costs 1 credit
- In-app credit purchasing with three plan tiers
- Payment integration with Razorpay
- Image download capability
- Responsive UI for desktop and mobile

### Non-Functional Requirements
- Stateless backend for horizontal scalability
- Secure: passwords hashed, JWT-based auth, API keys never exposed to client
- Idempotent payment verification to prevent double-crediting
- Fast client-side navigation with React SPA
- Smooth UX with animated loading states

---

## High-Level System Design

```
                         ┌──────────────────────────────┐
                         │         Users (Browser)        │
                         └──────────────┬───────────────┘
                                        │ HTTPS
                         ┌──────────────▼───────────────┐
                         │    React SPA (Vite/CDN)       │
                         │                               │
                         │   / → Home                    │
                         │   /result → Image Generator   │
                         │   /buy → Credit Plans         │
                         └──────────────┬───────────────┘
                                        │ REST API (Axios)
                         ┌──────────────▼───────────────┐
                         │   Express.js Backend           │
                         │   Node.js (ESM, port 4000)    │
                         │                               │
                         │   ┌────────────────────────┐  │
                         │   │  userAuth Middleware    │  │
                         │   │  JWT Verification       │  │
                         │   └────────────────────────┘  │
                         │                               │
                         │   ┌──────────┬─────────────┐  │
                         │   │ /api/user│ /api/image  │  │
                         │   └────┬─────┴──────┬──────┘  │
                         └────────┼────────────┼─────────┘
                                  │            │
              ┌───────────────────┘            └──────────────────────┐
              │                                                         │
┌─────────────▼──────────────┐               ┌───────────────────────▼┐
│     MongoDB Atlas           │               │   ClipDrop API          │
│     (imaginex DB)           │               │   text-to-image/v1      │
│                             │               │   (Stability AI)        │
│  • users collection         │               │                         │
│  • transactions collection  │               │  → returns PNG binary   │
└─────────────────────────────┘               └─────────────────────────┘
              │
              │ (on payment verify)
┌─────────────▼──────────────┐
│     Razorpay                │
│     Payment Gateway         │
│  • Create order             │
│  • Fetch order status       │
└─────────────────────────────┘
```

---

## Component Design

### Frontend Components

```
App.jsx
├── Navbar.jsx            ← logo, credits, user greeting, logout dropdown
├── Login.jsx             ← modal overlay, login/signup toggle
│
├── [Route: /] Home.jsx
│   ├── Header.jsx        ← hero, CTA button, sample image gallery
│   ├── Description.jsx   ← feature description section
│   ├── Steps.jsx         ← 3-step how-it-works section
│   ├── Testimonials.jsx  ← user reviews section
│   └── GenerateBtn.jsx   ← secondary CTA
│
├── [Route: /result] Result.jsx
│   └── (standalone page) prompt input + image display + download
│
└── [Route: /buy] BuyCredit.jsx
    └── (standalone page) plan cards + Razorpay checkout
```

### State Management (AppContext)

```
AppContext provides:
  ├── user          → { name } | null
  ├── setUser
  ├── showLogin     → boolean (controls Login modal)
  ├── setShowLogin
  ├── token         → JWT string (from localStorage)
  ├── setToken
  ├── credit        → number (live credit balance)
  ├── setCredit
  ├── backendUrl    → VITE_BACKEND_URL env var
  ├── loadCreditsData() → GET /api/user/credits
  ├── generateImage(prompt) → POST /api/image/generate-image
  └── logout()      → clear token + user from state and localStorage
```

---

## Data Flow Diagrams

### Authentication Flow

```
  ┌────────┐         ┌────────────┐        ┌──────────┐       ┌──────────┐
  │ Client │         │ Login.jsx  │        │  Server  │       │ MongoDB  │
  └───┬────┘         └─────┬──────┘        └────┬─────┘       └────┬─────┘
      │   open modal       │                    │                   │
      │──────────────────►│                    │                   │
      │                   │  submit form        │                   │
      │                   │───────────────────►│                   │
      │                   │                    │  findOne(email)   │
      │                   │                    │──────────────────►│
      │                   │                    │  user document    │
      │                   │                    │◄──────────────────│
      │                   │                    │  bcrypt.compare   │
      │                   │                    │  jwt.sign(userId) │
      │                   │  { token, user }   │                   │
      │                   │◄───────────────────│                   │
      │  setToken, setUser│                    │                   │
      │  localStorage     │                    │                   │
      │◄──────────────────│                    │                   │
```

### Image Generation Flow

```
  ┌────────┐      ┌────────────┐     ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ Client │      │ Result.jsx │     │  Server  │    │ MongoDB  │    │ ClipDrop │
  └───┬────┘      └─────┬──────┘     └────┬─────┘    └────┬─────┘    └────┬─────┘
      │ submit prompt    │                 │                │               │
      │────────────────►│                 │                │               │
      │                 │  POST /generate │                │               │
      │                 │────────────────►│                │               │
      │                 │                 │  findById      │               │
      │                 │                 │───────────────►│               │
      │                 │                 │ user + balance │               │
      │                 │                 │◄───────────────│               │
      │                 │                 │  check balance │               │
      │                 │                 │  POST w/ prompt│               │
      │                 │                 │────────────────────────────────►
      │                 │                 │   PNG binary   │               │
      │                 │                 │◄────────────────────────────────
      │                 │                 │  balance - 1   │               │
      │                 │                 │───────────────►│               │
      │                 │  base64 dataURI │                │               │
      │                 │◄────────────────│                │               │
      │  render image   │                 │                │               │
      │◄────────────────│                 │                │               │
```

### Payment Flow

```
  ┌────────┐    ┌─────────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ Client │    │ BuyCredit   │    │  Server  │    │ MongoDB  │    │ Razorpay │
  └───┬────┘    └──────┬──────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
      │ choose plan     │               │                │               │
      │────────────────►│               │                │               │
      │                 │ POST pay-razor│                │               │
      │                 │──────────────►│                │               │
      │                 │               │ create txn     │               │
      │                 │               │───────────────►│               │
      │                 │               │ create order   │               │
      │                 │               │────────────────────────────────►
      │                 │               │ order object   │               │
      │                 │               │◄────────────────────────────────
      │                 │  { order }    │                │               │
      │                 │◄──────────────│                │               │
      │  open Razorpay  │               │                │               │
      │  checkout popup │               │                │               │
      │  user pays      │               │                │               │
      │                 │               │                │               │
      │  handler fires  │               │                │               │
      │────────────────►│               │                │               │
      │                 │ POST verify   │                │               │
      │                 │──────────────►│                │               │
      │                 │               │ fetch order    │               │
      │                 │               │────────────────────────────────►
      │                 │               │ status: paid   │               │
      │                 │               │◄────────────────────────────────
      │                 │               │ add credits    │               │
      │                 │               │───────────────►│               │
      │                 │               │ mark paid=true │               │
      │                 │               │───────────────►│               │
      │  "Credits Added"│               │                │               │
      │◄────────────────│               │                │               │
```

---

## API Route Map

```
/api/user
  POST   /register        → registerUser         [Public]
  POST   /login           → loginUser            [Public]
  GET    /credits         → userCredits          [Protected]
  POST   /pay-razor       → paymentRazorpay      [Protected]
  POST   /verify-razor    → verifyRazorpay       [Public*]

/api/image
  POST   /generate-image  → generateImage        [Protected]

* /verify-razor is intentionally public — it's called by Razorpay's
  handler callback which does not carry our JWT.
```

---

## Security Design

| Concern | Solution |
|---------|----------|
| Password storage | bcrypt with salt rounds 10 |
| Auth token | Signed JWT (HS256) with `JWT_SECRET` |
| API key protection | ClipDrop key only on server, never sent to client |
| Credit integrity | Balance checked server-side before deduction |
| Payment idempotency | `transaction.payment` boolean prevents replay |
| CORS | `cors()` middleware (restrict origin in production) |
| No token in URL | Token is passed as a custom `token` header |

---

## Scalability Considerations

| Layer | Approach |
|-------|----------|
| **Frontend** | Stateless SPA — can be served from any CDN |
| **Backend** | Stateless Express server — multiple instances possible behind a load balancer |
| **Database** | MongoDB Atlas auto-scales; connection pooled by Mongoose |
| **Image gen** | Proxied per-request — no server-side caching or storage (stateless) |
| **Payments** | Razorpay handles payment state externally |

**Bottlenecks to watch:**
- ClipDrop API rate limits — each generation is a synchronous external call
- MongoDB connection pool under high concurrency
- No request queuing — concurrent image requests hit ClipDrop directly

**Future scaling improvements:**
- Add a job queue (BullMQ/Redis) for image generation
- Cache user credit balance in Redis to reduce DB reads on every authenticated request
- Store generated images in S3/Cloudinary for gallery feature
- Implement API rate limiting per user with express-rate-limit

---

## Credit System Design

```
New User Registration
  └─► creditBalance = 5  (free starter credits)

Image Generation
  └─► creditBalance -= 1  (per generation)
  └─► Guard: rejects if balance <= 0

Plan Purchase
  Basic    → +100 credits  ($10)
  Advanced → +500 credits  ($50)
  Business → +5000 credits ($250)
  └─► creditBalance += plan.credits  (after payment verified)
```

The credit balance is the single source of truth stored in `users.creditBalance`. No separate credit ledger is maintained — only the final balance is persisted.

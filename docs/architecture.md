# 🏛️ ImagineX — Architecture Documentation

## Overview

ImagineX is a full-stack AI-powered text-to-image SaaS platform. Users type a prompt, and the app generates a high-quality image using the ClipDrop API. Access is gated by a credit system, with purchasing powered by Razorpay.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                       │
│  React 18 + Vite + Tailwind CSS + Framer Motion              │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐               │
│  │   Home   │  │  Result  │  │  BuyCredit   │               │
│  │  (/)     │  │ (/result)│  │  (/buy)      │               │
│  └──────────┘  └──────────┘  └──────────────┘               │
│         │             │              │                        │
│         └─────────────┴──────────────┘                       │
│                       │ Axios HTTP                            │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                   SERVER (Node.js / Express)                  │
│                      Port: 4000                               │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────────────────┐    │
│  │  /api/user       │    │  /api/image                  │    │
│  │  - /register     │    │  - /generate-image           │    │
│  │  - /login        │    └──────────────────────────────┘    │
│  │  - /credits      │              │                          │
│  │  - /pay-razor    │              │ axios POST               │
│  │  - /verify-razor │              ▼                          │
│  └──────────────────┘   ┌──────────────────────────────┐    │
│                          │  ClipDrop API (External)      │    │
│                          │  text-to-image/v1             │    │
│                          └──────────────────────────────┘    │
│                                                              │
│  ┌─────────────────┐    ┌──────────────────────────────┐    │
│  │  JWT Middleware  │    │  Razorpay SDK                │    │
│  │  (userAuth)      │    │  (create & verify orders)    │    │
│  └─────────────────┘    └──────────────────────────────┘    │
└───────────────────────────────┬──────────────────────────────┘
                                │ Mongoose ODM
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                   MongoDB Atlas (Database)                    │
│                  Database: imaginex                           │
│                                                              │
│  ┌───────────────────┐    ┌────────────────────────────┐    │
│  │  users collection  │    │  transactions collection   │    │
│  │  - name            │    │  - userId                  │    │
│  │  - email           │    │  - plan                    │    │
│  │  - password (hash) │    │  - amount                  │    │
│  │  - creditBalance   │    │  - credits                 │    │
│  └───────────────────┘    │  - payment (bool)           │    │
│                            │  - date                     │    │
│                            └────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI library |
| Vite | 5.2.0 | Build tool & dev server |
| Tailwind CSS | 3.4.10 | Utility-first styling |
| Framer Motion | 12.x | Animations |
| React Router DOM | 6.26.1 | Client-side routing |
| Axios | 1.11.0 | HTTP client |
| React Toastify | 11.0.5 | Toast notifications |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | Latest LTS | Runtime |
| Express | 5.1.0 | Web framework |
| Mongoose | 8.18.0 | MongoDB ODM |
| bcrypt | 6.0.0 | Password hashing |
| jsonwebtoken | 9.0.2 | JWT auth |
| Razorpay | 2.9.6 | Payment gateway |
| Axios | 1.11.0 | ClipDrop API calls |
| form-data | 4.0.4 | Multipart form builder |
| dotenv | 17.2.1 | Env config |
| cors | 2.8.5 | Cross-origin requests |

### External Services
| Service | Purpose |
|---------|---------|
| MongoDB Atlas | Cloud database |
| ClipDrop API | AI image generation |
| Razorpay | Payment processing |

---

## Project Folder Structure

```
ImagineX_v1/
├── client/                    # React frontend
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── assets/
│   │   │   └── assets.js      # Centralized asset exports
│   │   ├── components/
│   │   │   ├── Navbar.jsx     # Top navigation bar
│   │   │   ├── Header.jsx     # Hero section
│   │   │   ├── Footer.jsx     # Footer
│   │   │   ├── Login.jsx      # Auth modal (login/signup)
│   │   │   ├── GenerateBtn.jsx
│   │   │   ├── Description.jsx
│   │   │   ├── Steps.jsx
│   │   │   └── Testimonials.jsx
│   │   ├── context/
│   │   │   └── AppContext.jsx  # Global state (user, token, credits)
│   │   ├── pages/
│   │   │   ├── Home.jsx       # Landing page
│   │   │   ├── Result.jsx     # Image generation page
│   │   │   └── BuyCredit.jsx  # Pricing & payment page
│   │   ├── App.jsx            # Root component with routes
│   │   ├── main.jsx           # React entry point
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                    # Express backend
│   ├── config/
│   │   └── mongodb.js         # DB connection
│   ├── controllers/
│   │   ├── userController.js  # Auth + payment logic
│   │   └── imageController.js # Image generation logic
│   ├── middlewares/
│   │   └── auth.js            # JWT verification
│   ├── models/
│   │   ├── userModel.js       # User schema
│   │   └── transactionModel.js# Transaction schema
│   ├── routes/
│   │   ├── userRoutes.js      # User API routes
│   │   └── imageRoutes.js     # Image API routes
│   ├── server.js              # App entry point
│   └── package.json
│
├── docs/                      # ← You are here
│   ├── architecture.md
│   ├── api.md
│   ├── aipipeline.md
│   ├── database.md
│   ├── deploy.md
│   └── system_design.md
│
└── README.md
```

---

## Request Flow — Image Generation

```
User types prompt
      │
      ▼
Result.jsx (onSubmitHandler)
      │  calls generateImage(prompt) from AppContext
      ▼
AppContext.generateImage()
      │  POST /api/image/generate-image
      │  headers: { token }
      ▼
Express Router → userAuth middleware
      │  verifies JWT, injects userId into req.body
      ▼
imageController.generateImage()
      │  1. Find user by ID
      │  2. Check creditBalance > 0
      │  3. POST to ClipDrop API with prompt
      │  4. Receive arraybuffer → convert to base64
      │  5. Deduct 1 credit from user
      │  6. Return resultImage (data URI)
      ▼
AppContext receives resultImage
      │  updates credit display
      ▼
Result.jsx displays the image
```

---

## Request Flow — Payment

```
User clicks plan in BuyCredit.jsx
      │
      ▼
POST /api/user/pay-razor { planId }
      │
      ▼
userController.paymentRazorpay()
      │  Creates transactionModel (payment: false)
      │  Creates Razorpay order
      ▼
Client: Razorpay checkout popup
      │  User completes payment
      ▼
Razorpay handler calls POST /api/user/verify-razor
      │
      ▼
userController.verifyRazorpay()
      │  Fetches order from Razorpay
      │  If status === 'paid':
      │    - Adds credits to user
      │    - Marks transaction payment: true
      ▼
Toast: "Credits Added" + navigate to /
```

---

## Authentication Flow

```
User submits Login/Register form
      │
      ▼
POST /api/user/login or /api/user/register
      │
      ▼
userController
  Register: hash password → save user → sign JWT
  Login:    find user → bcrypt.compare → sign JWT
      │
      ▼
JWT token returned to client
      │
      ▼
localStorage.setItem('token', token)
AppContext: setToken, setUser
      │
      ▼
All future protected requests include
{ headers: { token } }
```

---

## Security Model

- **Passwords** hashed with bcrypt (salt rounds: 10) — never stored in plaintext.
- **JWT** signed with `JWT_SECRET` env variable. Token contains only `{ id: user._id }`.
- **userAuth middleware** validates JWT on every protected route before the controller runs.
- **CORS** enabled globally — restrict `origin` in production.
- **Payment idempotency** — `transactionModel.payment` flag prevents double credit grants.
- **Credit guard** — image generation rejects requests when `creditBalance <= 0`.

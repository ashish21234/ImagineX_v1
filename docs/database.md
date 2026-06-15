# 🗄️ ImagineX — Database Design Documentation

## Overview

ImagineX uses **MongoDB Atlas** as its cloud database, accessed through the **Mongoose** ODM. The database is named `imaginex` and contains two collections: `users` and `transactions`.

---

## Connection Setup

```js
// server/config/mongodb.js
import mongoose from 'mongoose';

const connectDB = async () => {
  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
  });
  await mongoose.connect(`${process.env.MONGODB_URI}/imaginex`);
};

export default connectDB;
```

- The database name `imaginex` is appended directly to the connection URI.
- The `connected` event listener provides a startup log for health confirmation.
- `connectDB()` is called at server startup in `server.js` using top-level `await`.

---

## Collections

### 1. `users`

Stores registered user accounts and their credit balances.

**Schema Definition**
```js
// server/models/userModel.js
const userSchema = new mongoose.Schema({
  name:          { type: String,  required: true },
  email:         { type: String,  required: true, unique: true },
  password:      { type: String,  required: true },
  creditBalance: { type: Number,  default: 5 },
});
```

**Field Reference**

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | yes | auto | MongoDB document ID |
| `name` | String | ✅ | — | — | Display name |
| `email` | String | ✅ | ✅ | — | Login identifier (must be unique) |
| `password` | String | ✅ | — | — | bcrypt hashed password |
| `creditBalance` | Number | — | — | `5` | Image generation credits remaining |

**Sample Document**
```json
{
  "_id": "665a1b2c3d4e5f6a7b8c9d0e",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "$2b$10$Xt7Qv3KiMzL...",
  "creditBalance": 42
}
```

**Indexes**
- `email` — unique index (enforced by `unique: true` in schema)
- `_id` — default MongoDB primary key index

---

### 2. `transactions`

Records every credit purchase attempt. The `payment` flag prevents duplicate credit grants on payment verification.

**Schema Definition**
```js
// server/models/transactionModel.js
const transactionSchema = new mongoose.Schema({
  userId:  { type: String,  required: true },
  plan:    { type: String,  required: true },
  amount:  { type: Number,  required: true },
  credits: { type: Number,  required: true },
  payment: { type: Boolean, default: false },
  date:    { type: Number },
});
```

**Field Reference**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | auto | auto | Used as Razorpay `receipt` ID |
| `userId` | String | ✅ | — | References `users._id` (as string) |
| `plan` | String | ✅ | — | Plan name: `Basic`, `Advanced`, or `Business` |
| `amount` | Number | ✅ | — | Amount charged in USD/INR |
| `credits` | Number | ✅ | — | Credits to award on payment confirmation |
| `payment` | Boolean | — | `false` | `true` once payment is verified |
| `date` | Number | — | — | Unix timestamp (`Date.now()`) |

**Sample Document**
```json
{
  "_id": "665a2c3d4e5f6a7b8c9d0e1f",
  "userId": "665a1b2c3d4e5f6a7b8c9d0e",
  "plan": "Advanced",
  "amount": 50,
  "credits": 500,
  "payment": true,
  "date": 1717430400000
}
```

**Credit Plans Mapping**

| `plan` | `credits` | `amount` |
|--------|-----------|----------|
| `Basic` | 100 | 10 |
| `Advanced` | 500 | 50 |
| `Business` | 5000 | 250 |

---

## Entity Relationship Diagram

```
┌─────────────────────────────────┐
│           users                  │
│─────────────────────────────────│
│ _id          ObjectId  (PK)     │
│ name         String             │
│ email        String  (unique)   │
│ password     String             │
│ creditBalance Number  default:5 │
└────────────────┬────────────────┘
                 │ 1
                 │
                 │ (userId stored as String ref)
                 │
                 │ N
┌────────────────▼────────────────┐
│         transactions             │
│─────────────────────────────────│
│ _id     ObjectId  (PK, receipt) │
│ userId  String    (FK → users)  │
│ plan    String                  │
│ amount  Number                  │
│ credits Number                  │
│ payment Boolean   default:false │
│ date    Number    (Unix ts)     │
└─────────────────────────────────┘
```

One user can have many transactions. The `userId` in `transactions` is a string copy of `users._id` (not a Mongoose `ref` — no `.populate()` is used).

---

## Data Flow by Feature

### Registration
```
POST /api/user/register
  → hash password with bcrypt
  → new userModel({ name, email, password, creditBalance: 5 })
  → user.save()
  → return JWT
```

### Login
```
POST /api/user/login
  → userModel.findOne({ email })
  → bcrypt.compare(password, user.password)
  → return JWT
```

### Credit Check
```
GET /api/user/credits   [protected]
  → userModel.findById(userId)
  → return user.creditBalance
```

### Image Generation (credit deduction)
```
POST /api/image/generate-image  [protected]
  → userModel.findById(userId)
  → assert creditBalance > 0
  → call ClipDrop API
  → userModel.findByIdAndUpdate(userId, { creditBalance: n - 1 })
```

### Payment Flow
```
POST /api/user/pay-razor  [protected]
  → transactionModel.create({ userId, plan, amount, credits, date, payment: false })
  → razorpay.orders.create({ amount, currency, receipt: transaction._id })

POST /api/user/verify-razor
  → razorpayInstance.orders.fetch(razorpay_order_id)
  → if status === 'paid':
      transactionModel.findById(order.receipt)  ← _id used as receipt
      userModel.findByIdAndUpdate(userId, { creditBalance: current + credits })
      transactionModel.findByIdAndUpdate(txnId, { payment: true })
```

---

## Idempotency & Safety

- **Double-payment guard**: `transactionData.payment` is checked before crediting. If it's already `true`, the request is rejected with `"Payment already processed"`.
- **Credit underflow guard**: The image controller checks `creditBalance === 0 || creditBalance < 0` before calling ClipDrop. Credits are never deducted if the call fails.
- **Unique email**: MongoDB rejects duplicate registrations at the index level.

---

## Notes & Recommendations

- `userId` in `transactionModel` is typed as `String`, not `mongoose.Schema.Types.ObjectId`. This works but means Mongoose won't automatically cast/validate it as an ObjectId. Consider migrating to `{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }` in a future version.
- There is no `timestamps: true` option on either schema. Adding it would give you automatic `createdAt` and `updatedAt` fields.
- Images are **not stored** in the database — they are generated on demand and returned as ephemeral base64 strings.

# 📡 ImagineX — API Reference

Base URL: `http://localhost:4000` (development) | `https://your-domain.com` (production)

All responses return JSON with at minimum a `success: boolean` field.

---

## Authentication
  
Protected routes require a JWT token passed in the request **header**:

```
token: <your_jwt_token>
```

The token is returned on login/register and should be stored in `localStorage`.

---

## User Endpoints

### `POST /api/user/register`

Register a new user. New accounts receive **5 free credits**.

**Request Body**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "yourpassword"
}
```

**Success Response** `200 OK`
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "name": "John Doe"
  }
}
```

**Error Response**
```json
{
  "success": false,
  "message": "Please fill all the fields"
}
```

---

### `POST /api/user/login`

Authenticate an existing user and receive a JWT token.

**Request Body**
```json
{
  "email": "john@example.com",
  "password": "yourpassword"
}
```

**Success Response** `200 OK`
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "name": "John Doe"
  }
}
```

**Error Responses**
```json
{ "success": false, "message": "User not found" }
{ "success": false, "message": "Invalid credentials" }
```

---

### `GET /api/user/credits` 🔒 Protected

Fetch the authenticated user's current credit balance and profile info.

**Headers**
```
token: <jwt_token>
```

**Success Response** `200 OK`
```json
{
  "success": true,
  "credits": 42,
  "user": {
    "name": "John Doe"
  }
}
```

---

### `POST /api/user/pay-razor` 🔒 Protected

Initiate a Razorpay payment order for a credit plan.

**Headers**
```
token: <jwt_token>
```

**Request Body**
```json
{
  "planId": "Basic"
}
```

**Available Plan IDs**

| `planId` | Credits | Amount |
|----------|---------|--------|
| `Basic` | 100 | $10 / ₹10 |
| `Advanced` | 500 | $50 / ₹50 |
| `Business` | 5000 | $250 / ₹250 |

**Success Response** `200 OK`
```json
{
  "success": true,
  "order": {
    "id": "order_ABC123",
    "entity": "order",
    "amount": 1000,
    "currency": "INR",
    "status": "created",
    "receipt": "<transaction_id>"
  }
}
```

**Error Response**
```json
{ "success": false, "message": "plan not found" }
```

---

### `POST /api/user/verify-razor`

Verify payment completion from Razorpay's handler callback. Credits are credited to the user's account only when `orderInfo.status === 'paid'`.

**Request Body** *(sent automatically by Razorpay checkout handler)*
```json
{
  "razorpay_order_id": "order_ABC123",
  "razorpay_payment_id": "pay_XYZ789",
  "razorpay_signature": "..."
}
```

**Success Response** `200 OK`
```json
{
  "success": true,
  "message": "Credits Added"
}
```

**Error Responses**
```json
{ "success": false, "message": "Payment failed" }
{ "success": false, "message": "Payment already processed" }
```

---

## Image Endpoints

### `POST /api/image/generate-image` 🔒 Protected

Generate an AI image from a text prompt using the ClipDrop API. Deducts **1 credit** per generation.

**Headers**
```
token: <jwt_token>
```

**Request Body**
```json
{
  "prompt": "A futuristic city at sunset with flying cars"
}
```

**Success Response** `200 OK`
```json
{
  "success": true,
  "message": "Image generated successfully",
  "creditBalance": 4,
  "resultImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Error Responses**
```json
{
  "success": false,
  "message": "Insufficient credits, please recharge",
  "creditBalance": 0
}
```
```json
{
  "success": false,
  "message": "User not found or prompt missing"
}
```

> **Note:** `resultImage` is a base64-encoded PNG data URI. It can be used directly as an `<img src>` or downloaded via an anchor tag with the `download` attribute.

---

## Health Check

### `GET /`

Returns a plain text response confirming the API is live.

**Response** `200 OK`
```
API working fine
```

---

## Error Handling

All errors follow this shape:

```json
{
  "success": false,
  "message": "<human-readable error description>"
}
```

Errors are caught server-side via `try/catch` and always return HTTP `200` (the `success` field indicates failure). Frontend code should check `data.success` before using `data` fields.

---

## Environment Variables Required

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `CLIPDROP_API` | ClipDrop API key |
| `RAZORPAY_KEY_ID` | Razorpay public key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key |
| `CURRENCY` | Currency code (default: `INR`) |
| `PORT` | Server port (default: `4000`) |

---

## Client Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_BACKEND_URL` | Backend base URL (e.g. `http://localhost:4000`) |
| `VITE_RAZORPAY_KEY_ID` | Razorpay public key (used in checkout) |

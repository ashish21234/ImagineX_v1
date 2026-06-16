# Credit Purchase Workflow (Razorpay Integration)

This document explains the complete end-to-end flow of the credit purchase system using Razorpay, from the moment a user selects a pricing plan to the successful update of credits in the application.

---

## Overview

The payment workflow is divided into three major phases:

1. **Payment Initialization** – Frontend requests an order from the backend.
2. **Checkout Processing** – User completes payment through Razorpay.
3. **Verification & Credit Update** – Backend verifies payment and updates user credits.

---

# Phase 1: Payment Initialization

## Step 1: Frontend – `paymentRazorpay(planId)`

**Location:** `BuyCredit.jsx`

### Purpose

This function is triggered when a user clicks on a pricing plan.

### Responsibilities

* Checks whether the user is authenticated.
* Opens the login modal if the user is not logged in.
* Sends a `POST` request to the backend endpoint:

```http
POST /api/user/pay-razor
```

* Includes:

  * Selected `planId`
  * User authentication token

### Flow

```text
User Clicks Plan
       │
       ▼
paymentRazorpay(planId)
       │
       ├── User Not Logged In → Show Login Modal
       │
       └── User Logged In
                │
                ▼
       Send Request to Backend
```

---

## Step 2: Backend Middleware – `userAuth(req, res, next)`

**Location:** `auth.js`

### Purpose

Acts as a security layer for protected routes.

### Responsibilities

* Reads JWT token from request headers.
* Verifies and decodes the token.
* Extracts the authenticated user's ID.
* Attaches the ID to:

```js
req.body.userId
```

* Passes control to the next middleware/controller.

### Flow

```text
Incoming Request
       │
       ▼
Validate JWT Token
       │
       ▼
Extract User ID
       │
       ▼
req.body.userId = decodedUserId
       │
       ▼
next()
```

---

## Step 3: Backend Controller – `paymentRazorpay(req, res)`

**Location:** `userController.js`

### Purpose

Determines the selected plan details and creates a payment order.

### Responsibilities

1. Maps `planId` to:

   * Price
   * Credit Amount

2. Creates a pending transaction record:

```js
{
    payment: false
}
```

3. Generates a Razorpay order.

### Example

| Plan     | Price | Credits |
| -------- | ----- | ------- |
| Basic    | $10   | 100     |
| Advanced | $50   | 500     |
| Business | $250  | 5000    |

---

## Step 4: Razorpay Order Creation

**Location:** `userController.js`

### Function

```js
razorpayInstance.orders.create(options)
```

### Purpose

Creates a secure order directly on Razorpay servers.

### Why?

Prevents users from manipulating prices from the browser.

### Result

Razorpay returns:

```json
{
  "id": "order_xxxxxx",
  "amount": 1000,
  "currency": "USD"
}
```

The order is then sent back to the frontend.

---

# Phase 2: Checkout Processing

## Step 5: Frontend – `initPay(order)`

**Location:** `BuyCredit.jsx`

### Purpose

Configures the Razorpay checkout window.

### Responsibilities

* Receives the generated order.
* Creates checkout options:

  * Payment Key
  * Amount
  * Currency
  * Order ID
* Registers a payment success handler.

### Flow

```text
Receive Order
      │
      ▼
Configure Checkout Options
      │
      ▼
Register Success Handler
```

---

## Step 6: Razorpay Checkout – `rzp.open()`

**Location:** `BuyCredit.jsx`

### Purpose

Launches the Razorpay payment interface.

### Responsibilities

* Displays Razorpay's secure checkout modal.
* Allows payment via:

  * UPI
  * Debit Card
  * Credit Card
  * Wallets
  * Net Banking

### Flow

```text
initPay()
     │
     ▼
rzp.open()
     │
     ▼
User Completes Payment
```

---

# Phase 3: Payment Verification & Credit Update

## Step 7: Frontend Success Handler – `handler(response)`

**Location:** `BuyCredit.jsx`

### Purpose

Runs automatically after successful payment.

### Receives

```json
{
  "razorpay_payment_id": "...",
  "razorpay_order_id": "...",
  "razorpay_signature": "..."
}
```

### Responsibilities

Sends verification data to:

```http
POST /api/user/verify-razor
```

### Flow

```text
Payment Success
      │
      ▼
Receive Razorpay Response
      │
      ▼
Send Verification Request
```

---

## Step 8: Backend Controller – `verifyRazorpay(req, res)`

**Location:** `userController.js`

### Purpose

Verifies payment authenticity and updates credits.

### Responsibilities

#### 1. Fetch Order Details

```js
razorpayInstance.orders.fetch(orderId)
```

Retrieves the actual payment status from Razorpay.

---

#### 2. Validate Payment

Checks whether:

```js
status === "paid"
```

---

#### 3. Find Transaction

Searches the corresponding transaction record stored in MongoDB.

---

#### 4. Prevent Duplicate Processing

Ensures:

```js
transaction.payment === false
```

This prevents users from receiving credits multiple times for the same payment.

---

#### 5. Update User Credits

Adds purchased credits to the user's account.

Example:

```text
Current Credits = 200
Purchased Credits = 100

Updated Credits = 300
```

---

#### 6. Mark Transaction Completed

```js
{
    payment: true
}
```

---

### Verification Flow

```text
Receive Verification Request
           │
           ▼
Fetch Order From Razorpay
           │
           ▼
Is Status = Paid?
           │
      Yes  ▼
           │
Find Transaction
           │
           ▼
Already Processed?
           │
     No    ▼
           │
Update Credits
           │
           ▼
Mark Transaction Paid
           │
           ▼
Return Success
```

---

## Step 9: Frontend – `loadCreditsData()`

**Location:** `AppContext.jsx`

### Purpose

Refreshes the user's credit balance after successful verification.

### Responsibilities

* Requests updated user data from the backend.
* Retrieves the latest credit balance.
* Updates global application state.
* Refreshes the credit count shown in the navigation bar.

### Flow

```text
Verification Success
         │
         ▼
loadCreditsData()
         │
         ▼
Fetch Updated Credits
         │
         ▼
Update Context State
         │
         ▼
Navbar Credit Count Updated
```

---

# Complete System Flow

```text
User Selects Plan
        │
        ▼
paymentRazorpay(planId)
        │
        ▼
userAuth Middleware
        │
        ▼
paymentRazorpay Controller
        │
        ▼
Create Razorpay Order
        │
        ▼
Return Order To Frontend
        │
        ▼
initPay(order)
        │
        ▼
rzp.open()
        │
        ▼
User Completes Payment
        │
        ▼
handler(response)
        │
        ▼
verifyRazorpay()
        │
        ▼
Validate Payment
        │
        ▼
Update Credits
        │
        ▼
loadCreditsData()
        │
        ▼
Updated Credits Displayed
```

### Final Outcome

After a successful Razorpay transaction:

* Payment authenticity is verified.
* Duplicate credit additions are prevented.
* User credits are updated in MongoDB.
* Transaction status is marked as completed.
* The updated credit balance is instantly reflected in the application UI.

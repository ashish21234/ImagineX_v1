# 🚀 ImagineX — Deployment Guide

## Prerequisites

Before deploying, make sure you have accounts and API keys for:

- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) — free M0 cluster works
- [ClipDrop](https://clipdrop.co/apis) — for the image generation API key
- [Razorpay](https://razorpay.com) — for payment processing (test mode for development)

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ashish21234/ImagineX_v1.git
cd ImagineX_v1
```

### 2. Configure the Server

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net
JWT_SECRET=your_super_secret_key_here
CLIPDROP_API=your_clipdrop_api_key
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
CURRENCY=INR
PORT=4000
```

Start the server:
```bash
npm run server      # uses nodemon (auto-restart on changes)
# or
npm start           # uses node (no auto-restart)
```

The API will be available at `http://localhost:4000`

---

### 3. Configure the Client

```bash
cd ../client
npm install
```

Create a `.env` file in the `client/` directory:

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
```

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

---

## Production Deployment

### Option A — Deploy to Render (Recommended for Beginners)

#### Backend (Express Server)

1. Push your code to GitHub.
2. Go to [render.com](https://render.com) → **New Web Service**.
3. Connect your GitHub repo and select the `server/` directory as the root.
4. Configure the service:

   | Setting | Value |
   |---------|-------|
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Node Version** | 18+ |

5. Add all environment variables from your `.env` file in the **Environment** tab.
6. Deploy. Note the URL (e.g. `https://imaginex-api.onrender.com`).

#### Frontend (Vite React App)

1. Go to [render.com](https://render.com) → **New Static Site**.
2. Connect the same repo, root directory: `client/`.
3. Configure:

   | Setting | Value |
   |---------|-------|
   | **Build Command** | `npm run build` |
   | **Publish Directory** | `dist` |

4. Add environment variables:
   ```
   VITE_BACKEND_URL=https://imaginex-api.onrender.com
   VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
   ```
5. Deploy.

---

### Option B — Deploy to Vercel + Railway

#### Backend → Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy from server/
cd server
railway login
railway init
railway up
```

Set environment variables in the Railway dashboard.

#### Frontend → Vercel

```bash
npm i -g vercel

cd client
vercel --prod
```

When prompted, set:
```
VITE_BACKEND_URL=https://your-railway-url.up.railway.app
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
```

---

### Option C — Deploy with Docker

#### `server/Dockerfile`
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

#### `client/Dockerfile`
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_BACKEND_URL
ARG VITE_RAZORPAY_KEY_ID
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### `docker-compose.yml` (root)
```yaml
version: '3.8'
services:
  server:
    build: ./server
    ports:
      - "4000:4000"
    env_file:
      - ./server/.env

  client:
    build:
      context: ./client
      args:
        VITE_BACKEND_URL: http://server:4000
        VITE_RAZORPAY_KEY_ID: rzp_test_xxxxxxxx
    ports:
      - "80:80"
    depends_on:
      - server
```

```bash
docker-compose up --build
```

---

## MongoDB Atlas Setup

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a user with read/write permissions.
3. Under **Network Access**, add `0.0.0.0/0` (allow all IPs) for cloud deployment.
4. Click **Connect** → **Connect your application** → copy the connection string.
5. Replace `<password>` in the string and add it to `MONGODB_URI` in your `.env`.

The database `imaginex` and its collections (`users`, `transactions`) are created automatically by Mongoose on first write.

---

## Razorpay Setup

1. Create an account at [razorpay.com](https://razorpay.com).
2. For **testing**, use the Test Mode keys from the dashboard.
3. Add the Razorpay script to your HTML — it's already included via CDN in `index.html`:
   ```html
   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
   ```
4. For production, switch to Live Mode keys and complete KYC.

---

## Environment Variable Summary

### Server (`server/.env`)

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<random_string_min_32_chars>
CLIPDROP_API=<clipdrop_key>
RAZORPAY_KEY_ID=rzp_test_or_live_xxx
RAZORPAY_KEY_SECRET=<razorpay_secret>
CURRENCY=INR
PORT=4000
```

### Client (`client/.env`)

```env
VITE_BACKEND_URL=https://your-backend.com
VITE_RAZORPAY_KEY_ID=rzp_test_or_live_xxx
```

> ⚠️ **Never commit `.env` files to GitHub.** Both `.gitignore` files already exclude them.

---

## Post-Deployment Checklist

- [ ] Server health check: visit `https://your-backend.com/` → should return `API working fine`
- [ ] Registration works end-to-end
- [ ] Login and JWT token stored in localStorage
- [ ] Credit balance loads in Navbar
- [ ] Image generation produces a result
- [ ] Payment flow (use Razorpay test card: `4111 1111 1111 1111`)
- [ ] Credits update after payment
- [ ] CORS configured to restrict to your frontend domain in production

---

## Production CORS Configuration

Update `server.js` for production to restrict CORS to your frontend domain:

```js
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true,
}));
```

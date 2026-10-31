# BorrowHub — Peer-to-Peer Equipment Sharing Platform with AI Planner

> **"Borrow More. Buy Less. Share Better."**  
> Built with the modern **MERN stack** (MongoDB, Express 4, React 19, Node.js 22) and integrated with **Google Gemini 2.5 Generative AI** and **Cloudinary Persistent Media Storage**.

---

## 🌟 Overview & Architecture

BorrowHub brings peer-to-peer equipment sharing to neighborhoods and campuses. Borrow high-end cinema cameras, power tools, camping setups, and lawn gear from verified neighbors, with smart dynamic locker pickup codes, real-time messaging, and AI project planning.

### Project Structure:
```text
BorrowHub/
├── client/                                    # React 19 + Vite 8 + Tailwind CSS 4 Frontend
│   ├── src/
│   │   ├── components/                        # Navbar, Footer, EquipmentCard, Modals
│   │   ├── context/                           # AuthContext (JWT, session persistence, role management)
│   │   ├── pages/                             # 8 responsive application screens
│   │   ├── services/                          # REST API client with auth token interceptors
│   │   ├── App.jsx                            # React Router SPA routing & error boundaries
│   │   └── main.jsx                           # Application entry point
│   ├── vercel.json                            # Client-level SPA rewrite rules
│   └── package.json
│
├── server/                                    # Node.js + Express + MongoDB Atlas Backend
│   ├── middleware/                            # JWT authentication & rate limiter protection
│   ├── models/                                # User, Equipment, Booking, Message, Review schemas
│   ├── routes/                                # Auth, Equipment, Booking, Messages, AI, Upload
│   ├── tests/                                 # Native Node.js test suite (10/10 automated suites)
│   ├── utils/                                 # URL validation & security helpers
│   ├── seed.js                                # Opt-in test seed script (never runs on startup)
│   ├── server.js                              # Express app, Helmet, CORS, graceful shutdown
│   ├── package.json
│   └── .env.example
│
├── render.yaml                                # Render Backend Blueprint deployment config
├── vercel.json                                # Root Vercel SPA configuration
├── package.json                               # Workspace scripts (install, build, test, lint)
└── .gitignore                                 # Strict secret, node_modules & upload exclusions
```

---

## 🚀 Key Features

1. **Authentication & Authorization**:
   - Secure registration and login using `bcryptjs` password hashing and signed JWT tokens.
   - Dedicated Borrower and Lender profiles with admin role protection.
   - Persistent user sessions via `localStorage` with dynamic navbar controls.
2. **Data-Driven Equipment Marketplace**:
   - Zero hardcoded inventory — all listings, prices, categories, and photos originate in MongoDB.
   - Dual-mode image uploads: Cloudinary CDN persistent storage in production with local disk fallback for offline dev.
   - Real-time search, category filters, price sliders, and map view.
3. **Booking Flow & Dynamic Locker PIN Security**:
   - Conflict-free date booking validation.
   - Smart Locker 6-digit dynamic PIN generation — strictly hidden until lender approval.
   - Real-time status transitions: `Pending` ➔ `Approved` ➔ `In-Use` ➔ `Returned`.
4. **Google Gemini 2.5 AI Equipment Planner**:
   - Grounded conversational assistant that inspects actual MongoDB inventory.
   - Generates project bundles and rental recommendations without inventory hallucination.
   - Graceful fallback with user notice if AI provider is unavailable.
5. **Private Neighbor Messaging**:
   - Direct communication between borrowers and lenders.
   - Strict third-party privacy protection and MongoDB message persistence.
6. **Data Integrity & Security Defense**:
   - Helmet HTTP security headers.
   - Rate limiting on API endpoints to prevent brute force and abuse.
   - CORS origin whitelisting.

---

## 🛠️ Local Development Quickstart

### Prerequisites
- Node.js >= 18.0.0
- MongoDB (Local instance or MongoDB Atlas free tier)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Vishal4256/BorrowHub.git
cd BorrowHub
npm run install:all
```

### 2. Configure Environment Variables
Create `server/.env` (see `server/.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/borrowhub
JWT_SECRET=your_dev_jwt_secret_key_minimum_32_characters
ADMIN_SECRET_KEY=your_admin_secret_key
CLIENT_URL=http://localhost:5173
# Optional: GEMINI_API_KEY, CLOUDINARY credentials
```

Create `client/.env` (see `client/.env.example`):
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start Development Servers
From the repository root:
```bash
# Terminal 1: Start Backend (http://localhost:5000)
npm run dev:server

# Terminal 2: Start Frontend (http://localhost:5173)
npm run dev:client
```

---

## 🧪 Testing & Code Quality

BorrowHub includes automated integration tests using the native Node.js test runner:

```bash
# Run backend test suite (10 test suites covering Auth, CRUD, Bookings, AI, Security)
npm run test:server

# Run frontend OxLint code check
npm run lint:client

# Test production frontend bundle build
npm run build:client
```

---

## 🌐 Production Deployment

### 1. Database — MongoDB Atlas
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Whitelist `0.0.0.0/0` in **Network Access** to allow cloud hosts to connect.
3. Create a database user with `readWrite` permissions.
4. Copy your SRV connection string: `mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority`.

### 2. Backend — Render
1. Connect your repository to [Render](https://render.com/).
2. Create a new **Web Service** with:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
3. Configure Environment Variables:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: *Your Atlas connection string*
   - `MONGO_DB_NAME`: `borrowhub`
   - `JWT_SECRET`: *Random 64-character string*
   - `ADMIN_SECRET_KEY`: *Admin creation secret*
   - `CLIENT_URL`: `https://<your-vercel-domain>.vercel.app`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `GEMINI_API_KEY` (with `GEMINI_MODEL=gemini-2.5-flash`)

### 3. Frontend — Vercel
1. Import your repository into [Vercel](https://vercel.com/).
2. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `.` (uses root `vercel.json` and builds `client/dist`) or `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist` (if using `client`) or `client/dist` (if using root)
3. Add Environment Variable:
   - `VITE_API_URL`: `https://<your-render-backend-url>.onrender.com/api`
4. Deploy!

---

## 📄 License
ISC License. Built for open, sustainable community equipment sharing.

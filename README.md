# BorrowHub — Peer-to-Peer Equipment Sharing Platform with AI Planner

> **"Borrow More. Buy Less. Share Better."**  
> Built with modern **MERN stack** (MongoDB, Express, React, Node.js) and integrated with **BorrowHub AI Assistant & Smart Equipment Planner**.

---

## 🌟 Overview & Architecture

BorrowHub brings community equipment sharing to campuses and neighborhoods. Borrow high-end cinema cameras, heavy-duty power tools, alpine camping setups, and specialty appliances from verified neighbors, fully insured by **BorrowGuard™ $15,000 Underwriting**.

### Project Structure:
```
Borrowhub/
├── client/                                    # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx                     # Global navigation with search, AI pill, verified avatar
│   │   │   ├── Footer.jsx                     # Brand footer, trust signals, newsletter, guidelines
│   │   │   ├── EquipmentCard.jsx              # Reusable card with distance, daily rate, wishlist
│   │   │   └── ListItemModal.jsx              # Modal to list gear with AI Smart Price Suggester
│   │   ├── data/
│   │   │   ├── equipmentData.js               # Equipment inventory, categories & community nodes
│   │   │   ├── mockBookings.js                # Active bookings with locker PINs & checklist
│   │   │   └── aiKnowledge.js                 # AI project scenario presets & technical reasoning
│   │   ├── pages/
│   │   │   ├── HomePage.jsx                   # Hero, bento collage, discovery grid, how it works
│   │   │   ├── ExplorePage.jsx                # Filter sidebar (price, distance, instant book) + Map view
│   │   │   ├── EquipmentDetailsPage.jsx       # Gallery, specs, lender card, sticky date & price widget
│   │   │   ├── BookingFlowPage.jsx            # Interactive 4-stage stepper & AI condition photo review
│   │   │   ├── AIAssistantPage.jsx            # Conversational reasoning + live gear bundle checklist
│   │   │   ├── BorrowerDashboardPage.jsx      # Active rentals, locker PINs, savings metrics
│   │   │   ├── LenderDashboardPage.jsx        # Earnings, pending requests approval, inventory toggles
│   │   │   └── CommunityMessagingPage.jsx     # Live chat + Admin Trust & Verification Console
│   │   ├── App.jsx                            # React Router multi-page architecture
│   │   ├── main.jsx                           # Application entry point
│   │   └── index.css                          # Custom color tokens from DESIGN.md
│   └── package.json
│
├── server/                                    # Node.js + Express + MongoDB + AI Backend
│   ├── models/
│   │   ├── Equipment.js                       # Mongoose model for gear
│   │   └── Booking.js                         # Mongoose model for bookings
│   ├── routes/
│   │   ├── equipmentRoutes.js                 # CRUD for equipment
│   │   ├── bookingRoutes.js                   # Booking flow & requests API
│   │   └── aiRoutes.js                        # AI Project Planner & Chat API
│   ├── server.js                              # Express app with CORS & MongoDB connection
│   ├── package.json
│   └── .env.example
│
└── stitch_borrowhub_equipment_sharing_platform/ # Original UI export files & DESIGN.md
```

---

## 🚀 All 8 Screens Implemented

1. **Homepage & Discovery (`/`)**
   - High-impact hero with bento showcase cards
   - Live category switcher chips (Photography, Power Tools, Camping, Lawn & Garden, etc.)
   - Real-time availability equipment cards with distance indicators
   - AI Planner promo banner and 4-step "How It Works" workflow

2. **Explore Equipment Marketplace (`/explore`)**
   - Left filter sidebar: category, price slider ($15 - $100+), radius slider, instant book toggle
   - Grid View & interactive Map View toggle with price pins
   - Real-time sorting: Price low/high, rating, distance, recommended

3. **Equipment Details & Sticky Booking Widget (`/equipment/:id`)**
   - Multi-photo gallery with active thumbnail strip
   - Verified lender profile with ratings, response time, and trust tier
   - Full technical specs table & included accessories checklist
   - Interactive booking calculator: Pickup/return date picker, smart locker vs doorstep drop, BorrowGuard™ damage protection waiver, and instant checkout

4. **Booking Flow & Status Manager (`/booking/:id`)**
   - 4-stage interactive lifecycle: Request Submitted ➔ Locker Handover ➔ Active In-Use ➔ AI Return Scan
   - Encrypted Smart Locker PIN code display
   - Interactive condition photo proof upload simulator with AI comparison

5. **BorrowHub AI Assistant & Smart Planner (`/ai-planner`)**
   - Conversational reasoning assistant with technical project analysis
   - Quick prompt presets (Indie Dusk Short Film, Cedar Garden Bed, Yosemite Alpine Overland)
   - Dynamic Equipment Bundle Checklist on the right panel with live total rate and 15% bundle discount
   - 1-Click "Borrow Entire Bundle"

6. **Borrower Dashboard (`/borrower-dashboard`)**
   - 4 key metrics: Active rentals, total saved vs retail buying, 5.0 trust score, $15k guarantee
   - Active booking cards with locker PINs and return deadlines
   - Upcoming and past rental history tabs

7. **Lender Studio & Inventory Manager (`/lender-dashboard`)**
   - Monthly earnings tracker ($840/month) and node utilization rate
   - Incoming borrow requests with interactive "Approve & Release PIN" and "Decline" buttons
   - Equipment inventory management with live/paused status toggles
   - "List New Equipment" modal with AI price recommendation

8. **Community Messaging & Admin Trust Hub (`/messages`)**
   - Multi-chat list with verified neighbor badges
   - Real-time chat stream with embedded locker passcodes and active rental cards
   - Admin verification audit console with ID OCR matching and BorrowGuard dispute handling

---

## 🛠️ How to Run Locally

### Frontend:
```bash
cd client
npm install
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

### Backend:
```bash
cd server
npm install
npm run dev # or npm start
```
Server runs on **http://localhost:5000** with endpoints for `/api/equipment`, `/api/bookings`, and `/api/ai/plan`.

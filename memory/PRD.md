# Kapa Learning — Product Requirements Document

## Overview
Kapa Learning is a hyperlocal quick-commerce mobile app (Blinkit-inspired) that delivers educational supplies — NCERT books, hardbound registers, pens & markers, art supplies, exam kits and office essentials — in 10–12 minutes.

## Target Users
Students, parents, teachers and small offices in Delhi NCR who need study/office material urgently.

## MVP Feature Set (v1.0)
- **Home**: Sticky header with animated 10-12 MINS SLA badge (pulsing green dot), location bar, predictive search with rotating placeholder ticker (NCERT, Registers, Pens, UPSC), auto-scrolling banner carousel with elongating pagination pills, 4x2 category grid, bestsellers grid.
- **Split-Screen Categories**: 25% sticky left rail (icons + labels with emerald active indicator) + 75% two-column product grid. Deep-links from Home category cards.
- **Product Card**: Image, discount badge, title, subtitle, sale price + struck-through MRP, and morphing **+ADD → quantity stepper** button with spring animation and haptics.
- **Floating Cart Tray**: Fixed pill that slides in when cart > 0, shows stacked product avatars + count + total + "View Cart" CTA, sits above the tab bar with safe-area insets.
- **Checkout Modal**: Delivery-in-11-mins card, itemized cart with inline steppers, horizontal delivery-instruction chips (Avoid Calling, Don't Ring Bell, Leave at Door, Leave with Security) that toggle green, tip chip row (₹10/20/30/50), bill breakdown with free delivery ≥ ₹199.
- **Payment Sheet**: UPI (primary), Card, COD — mock success + haptic + navigation to tracking.
- **Live Order Tracking**: Simulated route visual with faux street grid, animated rider marker moving along Bézier curve toward destination pin (pulsing red ring), 4-stage vertical step progress (Placed → Packed → Out for Delivery → Arrived) with completed/current dot styles, ETA card + rider info + call button.
- **Print Store tab**: Placeholder services (Xerox, Colour Prints, Spiral Binding, Passport Photos, Scanning, Lamination) + upload document CTA.
- **Profile tab**: Guest user card, exam-streak card, saved-address chips, recent orders list (tap to re-open tracking, **Reorder** button refills cart → checkout), menu rows (Manage Addresses opens sheet, Support, Refer & Earn, T&C).

## v1.1 Features
- **Address Sheet**: Save Home / Office / Hostel / Other addresses (street, landmark, 6-digit pincode). One-tap switch from Home header, checkout "CHANGE" card, or Profile. Selected address persists server-side (`isDefault`) and is used in the order payload. Cannot delete the last address.
- **Bulk School Kits**: 6 curated class-wise combo packs (Class 1-3, 6, 8, 10, 12, UPSC) shown as a horizontal "School Kits by Class" rail on Home. "ADD KIT" adds every item in one tap; tapping the card opens a detail sheet (contents, kit total, MRP savings, "Add all N items to cart" → checkout).
- **Reorder in a Tap**: Every past order in Profile has a Reorder button; it fetches current products/stock for that order, refills the cart and opens checkout.
- **Streak Rewards**: Student schedules an exam (name + date via quick chips or DD/MM/YYYY). Every order containing study supplies (NCERT, registers, pens, exam kits, geometry, art) placed before that date gets `min(3 + streak, 10)%` off the study-supply subtotal and increments the streak. Shown on Home/Profile streak card, checkout banner + bill row, and order history ("Saved ₹X with exam streak").

## Backend API additions (v1.1)
- `GET/POST /api/v1/addresses`, `PUT /api/v1/addresses/{id}/select`, `DELETE /api/v1/addresses/{id}`
- `GET /api/v1/kits`, `GET /api/v1/kits/{id}`
- `GET /api/v1/orders/{id}/reorder-items`
- `GET /api/v1/rewards/streak`, `PUT /api/v1/rewards/exam-date`, `DELETE /api/v1/rewards/exam-date`
- `POST /api/v1/orders/create` now computes/stores `streakDiscount` and increments streak.

## Backend API (FastAPI + MongoDB — auto-seeded on startup)
- `GET /api/v1/darkstore/nearest`
- `GET /api/v1/categories` (8 categories)
- `GET /api/v1/products?categoryId=&q=` (38 seeded SKUs)
- `GET /api/v1/products/featured`
- `POST /api/v1/cart/sync` (inventory validation)
- `POST /api/v1/orders/create` (returns orderId + paymentIntent)
- `GET /api/v1/orders/{id}/live-tracking` (4 stages + rider position by elapsed time)
- `GET /api/v1/orders` (guest order history)

## Design System
- **Palette**: Emerald `#0C8346` on clean white surfaces. Mint accent `#E6F5EC` for SLA badges and chips.
- **Motion**: Reanimated springs (damping 18-25), pulsing dot / ring animations, morphing quantity stepper.
- **Haptics**: Selection on add/instruction toggle/tip; success on order placed.
- **Nav**: 4-tab bottom bar (Home, Categories, Print Store, Profile) with floating cart above.

## Non-Goals (v1)
- Real payment processing
- Real GPS map SDK
- Authentication (guest user only)
- Push notifications

## v1.2 Features
- **Admin Console** (`/admin`, hidden; also reachable by tapping the Profile footer 5×): email + password JWT login (bcrypt, 12h token). Seeded admin **admin@kapalearning.com / Kapa@Admin2026** (changeable via key icon in the console).
  - Products manager: search/filter, edit title/subtitle/category/MRP/sale price/stock/photo (upload → Emergent Object Storage), ▲▼ reorder within category, ★ Featured-on-Home toggle, hide/show, New product → Publish.
  - Batch & Classes manager: title, subject, grade, YouTube/HLS URL (auto-detected), date/time/duration, PDF notes upload, publish toggle.
  - Orders: customer address, items, payment status, Mark Dispatched → Mark Delivered / Cancel. Dispatch/deliver override the simulated tracking stage.
  - Live sync: every admin change bumps `GET /api/v1/catalog/version`; the customer app polls it every 4s and refetches, so changes appear without rebuild.
- **Classes tab** (customer): grade filter, class cards with live/upcoming/recorded status, in-app YouTube/HLS player (WebView), PDF notes open in browser.
- **Live Route Polyline**: tracking map is now an SVG cubic-Bézier route with animated travelled segment, rider marker gliding along the path (rotates with heading), store/destination labels, "Delivered" state.
- **Bug fix**: product price no longer truncates to "…" in narrow grids (price row stacked above ADD).

## Admin API (v1.2) — all under `/api/admin`, Bearer token required except login
- `POST /auth/login`, `GET /auth/me`, `PUT /auth/password`, `GET /stats`
- `GET/POST /products`, `PUT/DELETE /products/{id}`, `POST /products/{id}/move`, `GET /categories`
- `GET/POST /classes`, `PUT/DELETE /classes/{id}`
- `GET /orders`, `PUT /orders/{id}/status`
- `POST /upload` (multipart, jpg/png/webp/pdf ≤10MB) → `/api/files/{path}` (public read)
- Public: `GET /api/v1/classes`, `GET /api/v1/catalog/version`

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
- **Profile tab**: Guest user card, recent orders list (tap to re-open tracking), menu rows (Addresses, Support, Refer & Earn, T&C).

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

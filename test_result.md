#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
user_problem_statement: "Kapa Learning quick-commerce app. New features this iteration: (1) Address Sheet - save Home/Office/Hostel/Other addresses, one-tap switch; (2) Bulk School Kits - class-wise combo packs added to cart in one tap; (3) Reorder in a Tap on past orders; (4) Streak Rewards - % discount on study supplies when ordering before a scheduled exam date."

backend:
  - task: "Addresses CRUD (GET/POST /api/v1/addresses, PUT /{id}/select, DELETE /{id})"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Seeded default Home address for guest; delete blocked when only 1 address."
  - task: "School kits (GET /api/v1/kits, /kits/{id}) with resolved products + kitPrice/savings"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "6 kits seeded."
  - task: "Reorder items (GET /api/v1/orders/{id}/reorder-items)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Returns items with current product + qty clamped to stock."
  - task: "Streak rewards (GET /rewards/streak, PUT/DELETE /rewards/exam-date, discount applied in POST /orders/create)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Discount = min(3+streak,10)% of study-category subtotal; streak increments per qualifying order; exam date must be today/future (server date is 2026-09-13)."

frontend:
  - task: "Address sheet (home header, checkout CHANGE, profile Manage) - select/add/delete"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/AddressSheet.tsx, /app/frontend/src/context/AddressContext.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "testIDs: location-selector, address-add-new-btn, address-label-*, address-street-input, address-pincode-input, address-save-btn, address-row-<Label>, checkout-address-card"
  - task: "School kits section on Home + kit detail sheet + ADD KIT"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/SchoolKits.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "testIDs: kit-card-<id>, kit-add-<id>, kit-sheet-add-btn"
  - task: "Reorder button on profile past orders"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(tabs)/profile.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "testID reorder-btn-<orderId>; fills cart and navigates to /checkout"
  - task: "Streak card + exam date sheet + checkout discount line"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/StreakRewards.tsx, /app/frontend/app/checkout.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "testIDs: streak-card, exam-name-input, exam-quick-7, exam-date-input, exam-save-btn, checkout-streak-banner"

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 2
  run_ui: true

test_plan:
  current_focus:
    - "All 4 new features backend + frontend"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Implemented 4 features. Please test backend endpoints then UI flows on web preview at phone viewport."

# ---- Iteration 4 (Admin Console + Live Polyline + price fix) ----
backend:
  - task: "Admin JWT auth (POST /api/admin/auth/login, GET /auth/me, PUT /auth/password)"
    implemented: true
    working: "NA"
    file: "/app/backend/admin.py"
    priority: "high"
    needs_retesting: true
  - task: "Admin products CRUD + move + featured/isActive; customer /v1/products sorted by sortOrder & hides inactive; /v1/products/featured uses featured flag"
    implemented: true
    working: "NA"
    file: "/app/backend/admin.py, /app/backend/server.py"
    priority: "high"
    needs_retesting: true
  - task: "Admin classes CRUD + customer GET /api/v1/classes"
    implemented: true
    working: "NA"
    file: "/app/backend/admin.py"
    priority: "high"
    needs_retesting: true
  - task: "Admin orders list + PUT /orders/{id}/status (dispatched overrides live-tracking stage)"
    implemented: true
    working: "NA"
    file: "/app/backend/admin.py"
    priority: "high"
    needs_retesting: true
  - task: "Upload (POST /api/admin/upload multipart) to Emergent Object Storage + public GET /api/files/{path}"
    implemented: true
    working: "NA"
    file: "/app/backend/admin.py, /app/backend/storage.py"
    priority: "high"
    needs_retesting: true
  - task: "GET /api/v1/catalog/version bumps on every admin change (live sync)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    priority: "medium"
    needs_retesting: true
frontend:
  - task: "Admin console /admin login + /admin/dashboard (Products, Classes, Orders tabs)"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/admin/*, /app/frontend/src/admin/*"
    priority: "high"
    needs_retesting: true
  - task: "Customer Classes tab"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(tabs)/classes.tsx"
    priority: "medium"
    needs_retesting: true
  - task: "Live catalog sync hook (polls version every 4s)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/hooks/useCatalogSync.ts"
    priority: "high"
    needs_retesting: true
  - task: "Tracking screen SVG polyline + animated rider"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/tracking/[orderId].tsx"
    priority: "medium"
    needs_retesting: true
  - task: "BUG FIX: product card price truncated to '...' in narrow Categories grid"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/ProductCard.tsx"
    priority: "high"
    needs_retesting: true
agent_communication:
  - agent: "main"
    message: "Admin creds: admin@kapalearning.com / Kapa@Admin2026 (also in /app/memory/test_credentials.md)."

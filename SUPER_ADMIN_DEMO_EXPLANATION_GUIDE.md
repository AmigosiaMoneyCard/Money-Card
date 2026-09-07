# Money Card — Super Admin End-to-End Demo & System Explanation Guide
### സമ്പൂർണ്ണ സൂപ്പർ അഡ്മിൻ ഡെമോ ഗൈഡ് (മലയാളം വിശദീകരണത്തോടൊപ്പം & FAQ)

---

## 1. Executive Summary & Multi-Tenant Architecture (ആമുഖം & സിസ്റ്റം ആർക്കിടെക്ചർ)

**Money Card** is an enterprise-grade, multi-tenant cashless smart card platform designed for university campuses, corporate food courts, hospital canteens, and enterprise cafeterias.

```11
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SUPER ADMIN (Platform Owner)                          │
│     • Platform Analytics • Plan & Subscription Catalog • Cafeteria Overrides    │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│  ORGANIZATION ADMIN (Cafeteria) │             │  ORGANIZATION ADMIN (Cafeteria) │
│   • Branch Management           │             │   • Branch Management           │
│   • Staff Role Delegation       │             │   • Staff Role Delegation       │
│   • Smart Card Allocation       │             │   • Smart Card Allocation       │
│   • Inventory & Pricing         │             │   • Inventory & Pricing         │
└────────────────┬────────────────┘             └────────────────┬────────────────┘
                 │                                               │
                 ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│     BRANCH STAFF / POS CASHIER  │             │     BRANCH STAFF / POS CASHIER  │
│   • Tap-to-Pay RFID/QR Checkout │             │   • Tap-to-Pay RFID/QR Checkout │
│   • Instant Card Recharge       │             │   • Instant Card Recharge       │
│   • Customer Balance Inquiries  │             │   • Customer Balance Inquiries  │
└─────────────────────────────────┘             └─────────────────────────────────┘
```

### മലയാളം വിശദീകരണം (Malayalam Explanation):
> **മണി കാർഡ് പ്ലാറ്റ്‌ഫോം എന്താണ്?**
> മണി കാർഡ് എന്നത് കോളേജുകൾ, ആശുപത്രികൾ, ഐടി പാർക്കുകൾ, കോർപ്പറേറ്റ് കമ്പനികൾ എന്നിവയിലെ കഫറ്റീരിയകളെ പൂർണ്ണമായും ക്യാഷ്‌ലെസ്സ് (Cashless) ആക്കുന്ന ഒരു സ്മാർട്ട് കാർഡ് / ക്യുആർ സൊല്യൂഷൻ ആണ്. 
> 
> ഇതിൽ **സൂപ്പർ അഡ്മിൻ (Super Admin)** ആണ് സിസ്റ്റത്തിന്റെ പ്രധാന ഉടമ (Platform Owner). സൂപ്പർ അഡ്മിന് കീഴിൽ ഒന്നിലധികം കഫറ്റീരിയകളെ (Organizations) രജിസ്റ്റർ ചെയ്യാനും, അവർക്ക് സബ്‌സ്‌ക്രിപ്ഷൻ പ്ലാനുകൾ നൽകാനും, അവരുടെ മൊത്തം സെയിൽസും ട്രാൻസാക്ഷനുകളും റിയൽ-ടൈമായി മോണിറ്റർ ചെയ്യാനും സാധിക്കും.

---

## 2. Super Admin Core Modules & End-to-End Walkthrough (ഓരോ ഫീച്ചറും വിശദമായി)

---

### Module 1: Super Admin Dashboard (`/`)
The command center for platform-wide health, real-time metrics, urgent approvals, and cafeteria directory management.

```
+-----------------------------------------------------------------------------------+
|  [✨] Welcome back, Super Admin 👋                                     [🔄 Refresh] |
+-----------------------------------------------------------------------------------+
|  ⚠️ ACTION NEEDED: 3 Requests Awaiting Approval [URGENT]        [Review Requests ->]|
+-----------------------------------------------------------------------------------+
|  QUICK ACTIONS:                                                                   |
|  [➕ Add Cafeteria]   [🔔 Review Requests]   [📦 Manage Plans]   [📊 View Reports] |
+-----------------------------------------------------------------------------------+
|  FILTER TOOLBAR:                                                                  |
|  Cafeteria Scope: [ All Cafeterias ▾ ]   Time Window: [ Last 7 Days ▾ ] [🔄 Refresh]|
+-----------------------------------------------------------------------------------+
|  PLATFORM METRICS:                                                                |
|  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       |
|  │  CAFETERIA   │   │    SALES     │   │ ACTIVE CARDS │   │    ORDERS    │       |
|  │   3 Active   │   │   ₹ 48,500   │   │    1,240     │   │     892      │       |
|  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘       |
+-----------------------------------------------------------------------------------+
|  SUBSCRIPTION PLANS:                                                              |
|  [Basic Plan - 1 Org]    [Standard Plan - 2 Orgs]    [Enterprise Plan - 1 Org]    |
+-----------------------------------------------------------------------------------+
|  CAFETERIAS DIRECTORY:                               [ View Cafeterias ▾ ]        |
|  (Clicking expands table with status, plan, join date, view link & action menu)   |
+-----------------------------------------------------------------------------------+
```

#### Key Features & Business Logic:
1. **Urgent Action Needed Banner**:
   - Automatically detects pending subscription renewals, plan upgrade requests, or plan downgrade requests submitted by Org Admins.
   - Direct button `[ Review Requests → ]` routes to the review panel with one-click approval/rejection.
2. **Synchronized 4 KPI Stat Cards**:
   - **Cafeterias**: Shows active vs registered cafeterias.
   - **Sales**: Shows gross purchase volume aggregated across all cafeterias (or scoped to the selected cafeteria).
   - **Active Cards**: Total smart cards in active circulation.
   - **Orders**: Total completed POS checkout transactions.
   - *Connecting Business Logic*: Selecting any cafeteria in the top filter scopes all 4 KPI boxes to that exact Organization Admin in real time.
3. **Collapsible Cafeterias Directory (View & Collapse Mode)**:
   - Starts in a minimal collapsed state showing summary count and a `[ View Cafeterias ▾ ]` button.
   - Expanding reveals the single `[ All Cafeterias ▾ ]` filter, `[ Manage All → ]` button, and the interactive DataTable with a per-row `Action` dropdown (Filter Dashboard, Manage Org, View Analytics, View Plans).

#### മലയാളം വിശദീകരണം (Malayalam Explanation):
> **ഡാഷ്‌ബോർഡ് ഡെമോ ചെയ്യുമ്പോൾ പറയേണ്ടത്:**
> 1. *"സൂപ്പർ അഡ്മിൻ ലോഗിൻ ചെയ്യുമ്പോൾ തന്നെ ഏറ്റവും മുകളിൽ **Action Needed** കാണാം. ഏതെങ്കിലും കഫറ്റീരിയ പ്ലാൻ റിന്യൂവലോ അപ്‌ഗ്രേഡോ റിക്വസ്റ്റ് ചെയ്തിട്ടുണ്ടെങ്കിൽ അത് ഇവിടെ ഹൈലൈറ്റ് ചെയ്തു കാണിക്കും."*
> 2. *"അതിനു താഴെ 4 പ്രധാന ബോക്സുകൾ ഉണ്ട്: **Cafeteria, Sales, Active Cards, Orders**. പ്ലാറ്റ്‌ഫോമിലെ എല്ലാ കഫറ്റീരിയകളിലെയും മൊത്തം കളക്ഷനും കാർഡുകളുടെ എണ്ണവും ഇവിടെ തത്സമയം കാണാം."*
> 3. *"ഏതെങ്കിലും ഒരു പ്രത്യേക കഫറ്റീരിയയുടെ ഡാറ്റ മാത്രം കാണണമെങ്കിൽ, മുകളിലെ ഡ്രോപ്പ്‌ഡൗണിൽ നിന്ന് ആ കഫറ്റീരിയ സെലക്ട് ചെയ്താൽ മതി. നാല് കാർഡുകളും ആ കഫറ്റീരിയയുടെ കണക്കുകളിലേക്ക് തനിയെ മാറും."*
> 4. *"താഴെയുള്ള കഫറ്റീരിയ ലിസ്റ്റ് ആവശ്യമുള്ളപ്പോൾ മാത്രം **View Cafeterias** ക്ലിക്ക് ചെയ്ത് എക്സ്പാൻഡ് ചെയ്യാം."*

---

### Module 2: Cafeterias / Organization Management (`/organizations`)
Allows onboarding, configuring, inspecting, and governing individual cafeteria tenants.

#### Key Features & Business Logic:
- **Onboard New Cafeteria**: Super Admin inputs Organization Name, Contact Email, Phone, Base Currency, and assigns initial Subscription Plan.
- **Tenant Isolation**: Every cafeteria is provisioned with a unique `organizationId`. Branches, staff, cards, and inventory are strictly scoped to that tenant.
- **Status Controls**: Super Admin can mark any cafeteria as `Active` or `Suspended` (e.g., in case of subscription non-payment or compliance review).

#### മലയാളം വിശദീകരണം (Malayalam Explanation):
> **കഫറ്റീരിയ മാനേജ്‌മെന്റ് ഡെമോ:**
> *"ഒരു പുതിയ സ്ഥാപനത്തിന് മണി കാർഡ് സിസ്റ്റം നൽകുമ്പോൾ, സൂപ്പർ അഡ്മിൻ ഇവിടെ പുതിയ കഫറ്റീരിയ ആഡ് ചെയ്യുന്നു. അവരുടെ അഡ്മിൻ ഇമെയിലും ആദ്യ പ്ലാനും സെറ്റ് ചെയ്യുന്നു. അവർക്ക് അനുവദിച്ച കാർഡുകളുടെ ലിമിറ്റും ബ്രാഞ്ചുകളുടെ എണ്ണവും ഇവിടെ ക്രമീകരിക്കാം."*

---

### Module 3: Plans & Subscriptions Management (`/subscriptions` & `/plans`)
The SaaS monetization engine of Money Card.

#### Key Features & Business Logic:
1. **Plan Catalog Configuration**:
   - Super Admin creates plans (e.g., *Basic*, *Standard*, *Enterprise*, *Custom*).
   - Configures pricing interval (*Monthly*, *Yearly*) and quota limits:
     - `maxBranches` (e.g., 1 Branch vs 5 Branches)
     - `maxStaff` (e.g., 3 Staff vs 25 Staff accounts)
     - `maxCards` (e.g., 100 Cards vs 5,000 Cards)
     - `features` flags (e.g., *PDF Analytics Export*, *CSV Bulk Import*, *Peak Demand Diagnostics*).
2. **Organization Subscription Overrides**:
   - Super Admin can apply custom discounts, custom renewal periods, or override quota limits for high-value enterprise clients without altering global tiers.
3. **Plan Request Reviews (Review & Approve Tab)**:
   - Displays all requests submitted by Org Admins with clear status tags (`PENDING`, `APPROVED`, `REJECTED`).
   - Integrated status filter dropdown (`All Requests`, `Pending`, `Approved`, `Rejected`).
   - One-click **Approve** (instantly updates organization's plan, quotas, and active billing dates) or **Reject** with reason.

#### മലയാളം വിശദീകരണം (Malayalam Explanation):
> **പ്ലാനുകളും സബ്‌സ്‌ക്രിപ്ഷനും ഡെമോ:**
> 1. *"സൂപ്പർ അഡ്മിന് വ്യത്യസ്ത സബ്‌സ്‌ക്രിപ്ഷൻ പ്ലാനുകൾ (Basic, Standard, Enterprise) സെറ്റ് ചെയ്യാം. ഓരോ പ്ലാനിലും എത്ര കാർഡുകൾ കൊടുക്കാം, എത്ര ജീവനക്കാരെ വെക്കാം, എത്ര ബ്രാഞ്ചുകൾ തുടങ്ങാം എന്ന് തീരുമാനിക്കാം."*
> 2. *"ഒരു കഫറ്റീരിയ പ്ലാൻ അപ്‌ഗ്രേഡ് ചെയ്യാൻ റിക്വസ്റ്റ് അയച്ചാൽ, സൂപ്പർ അഡ്മിന് **Review Requests** ടാബിൽ വന്ന് ഒറ്റ ക്ലിക്കിൽ അപ്രൂവ് ചെയ്യാം."*
> 3. *"റിക്വസ്റ്റുകൾ ഫിൽട്ടർ ചെയ്യാൻ പെൻഡിങ്, അപ്രൂവ്ഡ്, റിജക്റ്റഡ് ഡ്രോപ്പ്‌ഡൗൺ ഫിൽട്ടർ ലഭ്യമാണ്."*

---

### Module 4: Platform Analytics & Audit Reports (`/analytics` & `/reports`)
Provides cross-organization financial auditing, POS metrics, and peak traffic diagnostics.

#### Key Features & Business Logic:
1. **Executive Financial Aggregates**:
   - **Total Purchase Volume**: Gross revenue from food/beverage checkout sales.
   - **Total Recharge Volume**: Total customer funds deposited onto cards.
   - **Total Refunds**: Sum of returned/cancelled transactions.
   - **Net Revenue**: Calculated as `Total Purchases - Total Refunds`.
2. **Branch Performance Matrix**:
   - Tabular breakdown of location status (`Open`/`Closed`), transaction volume, average basket size, and active POS sessions.
3. **Peak & Demand Hours Diagnostics (`/peak`)**:
   - Visualizes hourly activity curves, identifying rush-hour congestion windows (e.g., 12:30 PM - 2:00 PM lunch peaks) and top demanding food items.
4. **Dual-Mode Client-Side PDF Generation**:
   - **[ View PDF ]**: Instantly generates a blob URL and opens a high-fidelity preview modal directly inside the browser without downloading files.
   - **[ Download PDF ]**: Uses native client-side `jsPDF` vector rendering with zero backend server computational overhead, saving an official branded statement file.

#### മലയാളം വിശദീകരണം (Malayalam Explanation):
> **അനലിറ്റിക്‌സും റിപ്പോർട്ടുകളും ഡെമോ:**
> 1. *"പ്ലാറ്റ്‌ഫോം അനലിറ്റിക്‌സിൽ മൊത്തം ബിസിനസ്സ് കളക്ഷൻ, കസ്റ്റമർ റീചാർജ് തുക, റീഫണ്ടുകൾ എന്നിവ ലൈവായി കാണാം."*
> 2. *"ഏതൊക്കെ സമയത്താണ് കഫറ്റീരിയയിൽ ഏറ്റവും കൂടുതൽ തിരക്ക് (Peak Demand Hours) അനുഭവപ്പെടുന്നത് എന്ന് കൃത്യമായ ചാർട്ടുകളിലൂടെ മനസിലാക്കാം."*
> 3. *"റിപ്പോർട്ടുകൾക്കായി **[ View PDF ]** ബട്ടൺ അമർത്തിയാൽ ബ്രൗസറിൽ തന്നെ പ്രിവ്യൂ കാണാം. **[ Download PDF ]** അമർത്തിയാൽ പ്രിന്റ് ചെയ്യാവുന്ന ഒഫീഷ്യൽ റിപ്പോർട്ട് ഉടൻ ഡൗൺലോഡ് ആകും."*

---

## 3. Step-by-Step Malayalam Demo Presentation Script (ഡെമോ പ്രസന്റേഷൻ സ്ക്രിപ്റ്റ്)

Follow this chronological flow when presenting to clients, management, or evaluators:

| Step | Screen | English Presentation Script | Malayalam Script (മലയാളത്തിൽ പറയേണ്ടത്) |
| :--- | :--- | :--- | :--- |
| **1** | **Login** | *"We begin by logging in with Super Admin credentials. The platform immediately recognizes the Super Admin role and redirects to the central control dashboard."* | *"നമുക്ക് ആദ്യം സൂപ്പർ അഡ്മിൻ ലോഗിൻ ചെയ്യാം. സിസ്റ്റം ഓതന്റിക്കേഷൻ വഴി സൂപ്പർ അഡ്മിൻ ഡാഷ്‌ബോർഡിലേക്ക് നേരിട്ട് പ്രവേശിക്കുന്നു."* |
| **2** | **Action Banner** | *"At the very top, you notice the Action Needed banner. Whenever any cafeteria requests a plan upgrade or renewal, it alerts the Super Admin immediately."* | *"ഡാഷ്‌ബോർഡിൽ മുകളിലായി Action Needed അലേർട്ട് കാണാം. ഏതെങ്കിലും കഫറ്റീരിയ പ്ലാൻ റിന്യൂവൽ ആവശ്യപ്പെട്ടാൽ ഇവിടെ ഉടൻ നോട്ടിഫിക്കേഷൻ വരും."* |
| **3** | **KPI Cards & Sync** | *"Here are the 4 key business KPI cards: Cafeteria, Sales, Active Cards, and Orders. Watch how selecting a specific cafeteria updates all four cards to that cafeteria's real-time figures."* | *"ഇതാണ് പ്രധാന 4 ബിസിനസ്സ് കാർഡുകൾ: കഫറ്റീരിയ, സെയിൽസ്, ആക്ടീവ് കാർഡുകൾ, ഓർഡറുകൾ. മുകളിൽ ഒരു കഫറ്റീരിയ സെലക്ട് ചെയ്യുമ്പോൾ ഈ നാല് കാർഡുകളും അതാത് കഫറ്റീരിയയുടെ കണക്കുകളിലേക്ക് മാറുന്നത് കാണാം."* |
| **4** | **Collapsible List** | *"At the bottom, our Cafeterias Directory features an on-demand View/Collapse mode. Clicking 'View Cafeterias' cleanly unfolds the cafeteria roster with quick action menus."* | *"താഴെയുള്ള കഫറ്റീരിയ ലിസ്റ്റ് ക്ലീൻ ആയി വെക്കാൻ View/Collapse ബട്ടൺ നൽകിയിരിക്കുന്നു. 'View Cafeterias' ക്ലിക്ക് ചെയ്താൽ മുഴുവൻ വിവരങ്ങളും തുറന്നുവരും."* |
| **5** | **Plan Requests** | *"Let's navigate to Plans & Subscriptions. Under 'Review Requests', the Super Admin can review pending renewal requests and approve them with one click."* | *"പ്ലാൻസ് & സബ്‌സ്‌ക്രിപ്ഷൻസിൽ പോയി 'Review Requests' എടുത്താൽ കഫറ്റീരിയകൾ അയച്ച പ്ലാൻ റിക്വസ്റ്റുകൾ കാണാനും ഒറ്റ ക്ലിക്കിൽ അപ്രൂവ് ചെയ്യാനും സാധിക്കും."* |
| **6** | **Analytics & PDF** | *"Finally, in Platform Analytics, we view cross-branch performance and click 'View PDF' to inspect the branded report right inside the browser before downloading."* | *"അവസാനമായി അനലിറ്റിക്‌സിൽ മൊത്തം കളക്ഷൻ റിപ്പോർട്ട് കാണാനും 'View PDF' ക്ലിക്ക് ചെയ്ത് ബ്രൗസറിൽ തന്നെ റിപ്പോർട്ട് പ്രിവ്യൂ ചെയ്യാനും ഡൗൺലോഡ് ചെയ്യാനും കഴിയും."* |

---

## 4. Expected Exception Questions & Expert Answers (പ്രതീക്ഷിക്കുന്ന ചോദ്യങ്ങളും ഉത്തരങ്ങളും - FAQ)

### Q1: What happens when an Organization exceeds its assigned Card or Staff quota limit?
> **English Answer**:
> The system enforces strict real-time quota guardrails defined in the organization's plan. If an Org Admin tries to issue a 101st card on a 100-card plan, the backend API immediately rejects the request with a `403 PLAN_LIMIT_EXCEEDED` error and prompts the Org Admin to submit a Plan Upgrade request to the Super Admin.
> 
> **Malayalam Answer (മലയാളത്തിൽ):**
> *ഒരു കഫറ്റീരിയയ്ക്ക് അനുവദിച്ച കാർഡുകളുടെയോ സ്റ്റാഫുകളുടെയോ പരിധി (Quota Limit) കഴിഞ്ഞാൽ, സിസ്റ്റം പുതിയ കാർഡ് ഇഷ്യൂ ചെയ്യുന്നത് തടയും. ഉടൻ തന്നെ സൂപ്പർ അഡ്മിന് പ്ലാൻ അപ്‌ഗ്രേഡ് റിക്വസ്റ്റ് അയക്കാനുള്ള മെസ്സേജ് സ്‌ക്രീനിൽ കാണിക്കും. സൂപ്പർ അഡ്മിൻ അപ്രൂവ് ചെയ്താലേ പുതിയ കാർഡ് ആഡ് ചെയ്യാൻ സാധിക്കൂ.*

---

### Q2: How does Super Admin handle Offline POS transactions if internet fails in a cafeteria?
> **English Answer**:
> The POS counter cashier terminals use an encrypted offline transaction buffer. Offline purchases and card deductions are signed with localized session tokens. Once internet connectivity is restored, the POS terminal synchronizes the buffered transactions with the central server. The Super Admin Analytics dashboard then reconciles the sync state automatically.
> 
> **Malayalam Answer (മലയാളത്തിൽ):**
> *കഫറ്റീരിയയിൽ ഇന്റർനെറ്റ് കട്ടായാലും POS മെഷീനിൽ കാർഡ് ടാപ്പ് ചെയ്ത് ഓഫ്‌ലൈനായി ബില്ലിംഗ് നടത്താം. ഇന്റർനെറ്റ് തിരികെ വരുമ്പോൾ ഈ ഓഫ്‌ലൈൻ ട്രാൻസാക്ഷനുകൾ തനിയെ സെർവറിലേക്ക് സിങ്ക് ആയി സൂപ്പർ അഡ്മിൻ ഡാഷ്‌ബോർഡിൽ അപ്‌ഡേറ്റ് ആകും.*

---

### Q3: Can one cafeteria see sales or customer data of another cafeteria? (Multi-Tenant Security)
> **English Answer**:
> No. Money Card uses strict architectural multi-tenant data isolation. Every database query, session token, and Prisma relation is scoped with `organizationId`. An Org Admin or Branch Staff can strictly only query data belonging to their own organization. Only the Super Admin with global privileges has platform-wide visibility.
> 
> **Malayalam Answer (മലയാളത്തിൽ):**
> *ഒരിക്കലുമില്ല. ഓരോ കഫറ്റീരിയയ്ക്കും വെവ്വേറെ ഓർഗനൈസേഷൻ ഐഡി (organizationId) വഴിയാണ് ഡാറ്റ സൂക്ഷിക്കുന്നത്. ഒരു കഫറ്റീരിയയുടെ സെയിൽസോ കസ്റ്റമർ ഡാറ്റയോ മറ്റൊരു കഫറ്റീരിയയ്ക്ക് കാണാൻ കഴിയില്ല. സൂപ്പർ അഡ്മിന് മാത്രമേ എല്ലാ കഫറ്റീരിയകളുടെയും വിവരങ്ങൾ കാണാൻ അനുവാദമുള്ളൂ.*

---

### Q4: How are customer refunds processed and tracked by Super Admin?
> **English Answer**:
> When a cashier initiates a customer refund, the transaction is marked as `REFUND`, and the balance is credited back to the customer's smart card or wallet. The Super Admin dashboard tracks this under `Customer Refunds` and computes `Net Revenue = Gross Purchases - Refunds`, ensuring accurate financial reconciliation.
> 
> **Malayalam Answer (മലയാളത്തിൽ):**
> *ഒരു കസ്റ്റമർക്ക് റീഫണ്ട് നൽകുമ്പോൾ പണം അവരുടെ കാർഡിലേക്ക് തിരികെ ക്രെഡിറ്റ് ആകുന്നു. സൂപ്പർ അഡ്മിൻ ഡാഷ്‌ബോർഡിൽ റീഫണ്ട് തുക പ്രത്യേകം രേഖപ്പെടുത്തുകയും, യഥാർത്ഥ വരുമാനം (Net Revenue = Sales - Refunds) കൃത്യമായി കണക്കുകൂട്ടുകയും ചെയ്യുന്നു.*

---

### Q5: Can the Super Admin offer a custom plan or discount to a VIP cafeteria without changing standard public plans?
> **English Answer**:
> Yes. Under the Plans & Subscriptions module, Super Admin can create Custom Plan Overrides directly attached to a specific `organizationId`. This allows setting custom billing prices, higher card limits, or dedicated feature flags without altering global public plan templates.
> 
> **Malayalam Answer (മലയാളത്തിൽ):**
> *അതെ, തീർച്ചയായും സാധിക്കും. സൂപ്പർ അഡ്മിന് ഏതെങ്കിലും വലിയ കഫറ്റീരിയയ്ക്ക് മാത്രമായി പ്രത്യേക ഡിസ്‌കൗണ്ടോ കൂടുതൽ കാർഡ് പരിധിയോ ഉള്ള 'Custom Plan Override' സെറ്റ് ചെയ്തു കൊടുക്കാം. ഇത് മറ്റ് സാധാരണ പ്ലാനുകളെ ബാധിക്കില്ല.*

---

### Q6: What prevents card cloning or balance tampering by rogue staff?
> **English Answer**:
> Smart card balances are not stored as plain editable text. Every card operation is cryptographically signed and stored on the secure backend ledger. When a card is tapped, the POS terminal verifies the card UID and session signature against the cloud ledger in real time, preventing double-spending and balance tampering.
> 
> **Malayalam Answer (മലയാളത്തിൽ):**
> *കാർഡിൽ നേരിട്ട് പണം എഴുതി വെക്കുകയല്ല ചെയ്യുന്നത്. പകരം സെക്യുർ ക്ലൗഡ് ലെഡ്ജറിലാണ് ബാലൻസ് സൂക്ഷിക്കുന്നത്. കാർഡ് ടാപ്പ് ചെയ്യുമ്പോൾ വ്യാജ കാർഡാണോ എന്ന് സെർവർ പരിശോധിക്കുന്നത് വഴി തട്ടിപ്പുകളും വ്യാജ കാർഡുകളും പൂർണ്ണമായി തടയുന്നു.*

---

### Q7: How does client-side PDF export save server bandwidth?
> **English Answer**:
> The PDF export engine runs entirely on the client's browser using `jsPDF`. The browser gathers the already-loaded analytics data in state, formats tables and headers vectorially, and renders the document directly in memory as a Blob or file download. This requires 0% server CPU or PDF-rendering backend microservices.
> 
> **Malayalam Answer (മലയാളത്തിൽ):**
> *PDF ജനറേഷൻ മുഴുവനായി ബ്രൗസറിലാണ് (jsPDF വഴി) നടക്കുന്നത്. ഇതിനായി സെർവറിലേക്ക് അധിക റിക്വസ്റ്റുകൾ അയക്കേണ്ടതില്ല. അതിനാൽ സിസ്റ്റം വളരെ വേഗത്തിലും സെർവർ ലോഡ് ഇല്ലാതെയും പ്രവർത്തിക്കുന്നു.*

---

## 5. Technical Stack Summary

- **Frontend Core**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **PDF Engine**: Client-side `jsPDF` Vector Rendering with Dual Blob Preview & Download
- **Backend Architecture**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
- **Security & Multi-Tenancy**: Role-Based Access Control (RBAC), JWT Authentication, Organization Scoping, Offline Buffer Reconciler

---
*Money Card Enterprise Cashless Architecture — Confidential Document for Super Admin Operations & Demo Reference.*

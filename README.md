# LabourSeva Project

A multi-tenant e-service delivery platform connecting citizens, retail Kendra operators, distributors, employees and administrators. This repository contains the full-stack web application for the LabourSeva initiative.

## 🚀 Overview

**LabourSeva** is a comprehensive portal that streamlines the application process for various government-related services. It connects citizens directly with service providers through a network of retail Kendra operators, ensuring transparency, efficiency, and accessibility.

### Key Features

- **Multi-Portal Architecture**: Separate, secure portals for Citizens, Retailers, Distributors, Employees, Admins, and Guests.
- **Dynamic Service Forms**: Application forms are rendered at runtime from database schemas, allowing for flexible and updatable service offerings without code changes.
- **Secure Payments**: Integrated Razorpay payment gateway with full transaction lifecycle management.
- **SMS & Email Integration**: Real-time notifications for OTP verification, application status updates, and alerts.
- **Hierarchical Wallet System**: Distributors fund retailers, who in turn pay for citizen applications from their wallets, with commissions flowing up the chain.
- **Employee Verification**: Internal operations hub for KYC, application verification, query management, and IAM operations.
- **Cloudflare Protection**: Integrated WAF, DDoS protection, and bot control.

## 🛠️ Technology Stack

- **Frontend & API**: Next.js (TypeScript)
- **Database**: MySQL with Prisma ORM
- **Styling**: Tailwind CSS with Custom Design System
- **Authentication**: OTP-based login, TOTP 2FA for staff
- **Payments**: Razorpay (PayU optional)
- **Notifications**: SMS via My Dreams Technology gateway, Email (SES/Brevo)
- **Edge Security**: Cloudflare (Proxy, WAF, Turnstile)
- **Hosting**: Hostinger (Node.js Business/Cloud plan)

## 📂 Repository Structure

```
labourseva_web/
├── app/                    # Next.js App Router (public/citizen)
│   ├── (auth)/             # Login, registration, OTP flows
│   ├── api/                # Server API routes
│   └── ...                 # Other portal applications
├── components/             # Reusable UI components
├── css/                    # Global styles and design tokens
├── prisma/                 # Prisma schema and migrations
├── scripts/                # Utility scripts
└── .env.example            # Environment variables
```

## 🏁 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MySQL Database
- Prisma CLI (v5.0+)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd labourseva_web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment Configuration:
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` with your database credentials and API keys:
     ```env
     DATABASE_URL="mysql://user:password@localhost:3306/labourseva"
     # Add other required keys (RAZORPAY_KEY, SMS_API_URL, etc.)
     ```

4. Database Setup:
   - Apply Prisma schema:
     ```bash
     npx prisma migrate dev --name init
     ```

### Development

Start the development server:

```bash
npm run dev
```

The application will start on `http://localhost:3000`.

## 🔐 Security

### Session Management
- **Host-only cookies**: `__Host-ls_*` prefix with `Secure`, `HttpOnly`, `SameSite=Strict`.
- **Random tokens**: 256-bit session values, hashes stored in DB.
- **TTL**: Varies by role (7 days citizen, 30 min admin, etc.).
- **Port-specific**: Middleware ensures valid session for the correct hostname.

### Authentication
- **Citizens**: Mobile OTP verification.
- **Staff**: Password + OTP or TOTP 2FA.
- **Access Control**: Cloudflare Access for admin and employee portals.
- **Rate Limiting**: Built-in to prevent brute-force attacks.

### Encryption
- **PII Encryption**: Sensitive data is encrypted at rest.
- **Signed PDFs**: Completed applications are digitally signed.

## 🌐 Portals

### 1. Public Portal (`/`)
Landing page with service catalog, news, events, and signup.

### 2. user Portal (`/user`)
- Dashboard
- Service catalog & application forms
- Document vault
- Payment history & receipts
- Active sessions manager

### 2. customer Portal (`/customer`)
- Dashboard
- Service catalog & application forms
- Document vault
- Payment history & receipts
- Active sessions manager

### 3. Retailer Portal (`/retailer`)
- Wallet management
- Assisted application wizard
- Receipt printing
- Referral program tracking

### 4. Distributor Portal (`/distributor`)
- KYC and onboarding management
- Wallet top-up
- Commission reports
- Retailer management

### 5. Employee Portal (`/employee`)
- Verification queue
- Query desk (feedback, grievances)
- IAM operations
- Dashboard

### 6. Admin Portal (`/admin`)
- Full dashboard
- User management (approval queues)
- Service catalog management
- Payment audit & financial reports
- Content management
- Master data management

## 🎨 Design System

Based on the [Design Specification](design.md).

### Typography
- **Primary**: Noto Sans (English)
- **Tamil**: Noto Sans Tamil
- **Monospace**: Noto Sans Mono (IDs, OTPs)

### Color Palette
**Light Theme (Default)**
- Backgrounds: `#FFFFFF`, `#F5F5F5`
- Surfaces: `#FFFFFF`
- Borders: `#E7E5E4`, `#8C857D`
- Text: `#0C0A09`, `#4E4E4E`

**Dark Theme (Opt-in)**
- Backgrounds: `#0C0A09`
- Surfaces: `#1C1917`
- Borders: `#36322D`
- Text: `#FDFBFB`, `#E7E7E5`

### Spacing System
Based on **1rem = 10px**:
- `space-01`: 4px
- `space-02`: 8px
- `space-03`: 12px
- `space-04`: 16px (default)
- `space-05`: 20px
- `space-06`: 24px
- `space-07`: 32px
- `space-08`: 40px
- `space-09`: 48px
- `space-10`: 64px
- `space-11`: 80px
- `space-12`: 120px

## 📝 Workflow

1. **Application**: Citizen/Retailer fills form → PII encrypted → Request saved.
2. **Payment**: Razorpay transaction or wallet deduction.
3. **Verification**: Employee reviews → Approves or rejects with remarks.
4. **Completion**: Digital signature applied to PDF → SMS sent to applicant.

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📄 License

[License Name]
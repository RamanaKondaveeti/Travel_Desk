# PickNBook - Frontend

A React-based travel booking platform for flights and buses, with separate user and admin portals.

## 🗂️ Project Structure

```
frontend/
├── public/
├── src/
│   ├── Admin_Portal/          # Admin dashboard & management
│   │   ├── AUTHENTICATIONS/   # Admin login & PIN verification
│   │   ├── B2C BUS MANAGEMENT/
│   │   ├── B2C FLIGHT MANAGEMENT/
│   │   ├── BLOG MANAGEMENT/
│   │   ├── CUSTOMER MANAGEMENT/
│   │   ├── DASHBOARD ADMIN/
│   │   ├── OFFER MANAGEMENT/
│   │   ├── SIDEBAR ADMIN/
│   │   └── TOPBAR ADMIN/
│   ├── assets/images/         # All static images and media
│   ├── components/
│   │   ├── filters/           # DepositFilter, TravelerFilter
│   │   ├── forms/             # AddBankPage, AddQR, AddTravelerForm, DepositForm
│   │   ├── layout/            # DashbaordLayout, DashboardSidebar, SiteFooter, Topbar
│   │   └── tables/            # BankTable, DataTable, QrTable, TravelerTable etc.
│   ├── contexts/              # UserContext
│   ├── data/                  # Static data (popularBuses)
│   ├── pages/
│   │   ├── account/           # MyAccount, EditProfile, BankList, TravelerList etc.
│   │   ├── auth/              # Login, Register, VerifyOtp, ChangePassword
│   │   ├── booking/           # Flight & Bus booking flows
│   │   └── public/            # HomePage, FetchTicket, WebCheckin, PrintTicket
│   ├── services/              # API service files
│   ├── STYLES/                # All CSS files (non-admin)
│   └── utils/                 # Helper utilities
├── package.json
└── .env.example
```

## ⚙️ Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) v18 or higher
- npm v9 or higher

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/harishrdy/Travel_site.git
cd Travel_site/frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

```env
REACT_APP_API_BASE_URL=http://localhost:5000/api
```

### 4. Start the development server

```bash
npm start
```

The app will open at **http://localhost:3000**

## 🏗️ Build for Production

```bash
npm run build
```

Output will be in the `build/` folder.

## 🔑 Portals

| Portal | URL | Credentials |
|--------|-----|-------------|
| User Portal | http://localhost:3000 | Register/Login |
| Admin Portal | http://localhost:3000/admin | Admin login + OTP PIN |

## 📦 Key Dependencies

- **React** - UI framework
- **React Router** - Client-side routing
- **Axios** - HTTP requests

## 🔗 Backend

Make sure the backend is running before starting the frontend. See [backend README](../backend/README.md) for setup instructions.
# USSeaCargo ERP v3 - Complete System

## Files in this ZIP

| File | Purpose |
|------|---------|
| `index.html` | Frontend entry point |
| `assets/` | Frontend JS + CSS bundles |
| `server.js` | Backend API (Node.js + Express + SQLite) |
| `package.json` | Dependencies |
| `.env` | Configuration |

## Upload to Hostinger (2 Steps)

### Step 1: Upload Frontend Files
Using Hostinger File Manager:
1. Go to your website folder (e.g. `public_html/` or `nodejs/`)
2. Upload `index.html` and `assets/` folder to the SAME folder as `server.js`
3. Make sure `server.js` and `index.html` are in the SAME folder

### Step 2: Restart Node.js Server
1. Go to Hostinger → Advanced → Node.js
2. Click "Stop" then "Start"
3. Or SSH: `node server.js`

## Admin Login
- Username: `admin`
- Password: `admin123`
- Admin never expires, cannot be blocked

## New Signups
- Get "user" role (NOT admin)
- Phone number is REQUIRED
- Can be BLOCKED by admin if not paid
- Subscription: Trial / 6 Months / 1 Year
- Auto-expires after package ends

## Features
- Dashboard with KPIs and charts
- Sales & CRM (Customers, Invoices, Quotations)
- Purchasing & Inventory (Suppliers, Products)
- HR Management (Employees, Leave, Recruitment)
- Projects (Tasks, Timesheets)
- Logistics (MBL, HBL, DO, NOC, PL, CI, CO, BE, SI, MFT)
- Reports (Financial, Sales, Inventory)
- Admin Panel (Monitor all companies, block users, assign subscriptions)
- Settings (Company, Users, Password, Currency AED/USD)
- Forgot Password (reset code system)
- PDF Export (Invoices)
- Excel Export (Tables)
- File Upload (Shipping documents)

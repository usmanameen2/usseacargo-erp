# USSeaCargo v3 - Hostinger Deployment Guide

## Step 1: Upload Files
1. Go to Hostinger File Manager
2. Navigate to /public_html/
3. Delete ALL existing files
4. Upload all files from this ZIP

## Step 2: Install Dependencies (in Hostinger Terminal)
cd ~/public_html
npm install --production

## Step 3: Seed Database (creates admin + demo data)
node database/seed.js

You should see: "USSeaCargo Database Seeded"

## Step 4: Update .env (optional)
nano .env
# Change JWT_SECRET to a random string

## Step 5: Start Server
npm start

Or use PM2 for production:
npm install -g pm2
pm2 start server.js --name usseacargo
pm2 save
pm2 startup

## Default Login
Username: admin
Password: admin123

## Change Password IMMEDIATELY After Login
1. Login
2. Go to Settings
3. Click "Change Password"
4. Enter old: admin123, new: your-secure-password

## Create New Users
1. Go to Settings > User Management
2. Click "Add User"
3. Fill username, password, full name, email, role
4. Click Save

## Currency
Default: AED (UAE Dirham)
To switch: Settings > Currency > Select USD or AED

## PDF Export
Available on Invoices page - click "Download PDF" on any invoice

## Excel Export
Available on all tables - click "Export Excel" button

## File Upload
Logistics > Shipping Docs > Add Document > Upload File

## Support
For issues, check Runtime Logs in Hostinger panel.

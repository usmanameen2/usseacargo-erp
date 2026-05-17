# USSeaCargo ERP - Logistics SaaS Platform

## Deploy to Hostinger

### Step 1: Upload to GitHub
1. Create a new repository on GitHub
2. Upload ALL files from this folder to the repository root
3. Push to main branch

### Step 2: Connect Hostinger to GitHub
1. In Hostinger, go to your website → Auto Deploy
2. Connect your GitHub repository
3. Set deploy branch: `main`
4. Click Deploy

### Step 3: Start the Backend Server on Hostinger VPS
SSH into your Hostinger VPS and run:

```bash
cd ~/public_html  # or wherever Hostinger puts your files
npm install
node server.js &
```

Or use PM2 for production:
```bash
npm install -g pm2
npm install
pm2 start server.js --name erp-server
pm2 save
pm2 startup
```

### Admin Login
- Username: `admin`
- Password: `admin123`
- Auto-created on first login attempt

### Features
- Full CRUD on all modules (Add/Edit/Delete)
- Shipping Documents: MBL, HBL, D.O., NOC, P/L, C.I., C/O, B/E, SI, MFT
- File upload for shipping documents
- AED/USD currency toggle
- PDF invoice download
- Excel export
- Password change
- User management (invite/edit users)
- Google noindex enabled

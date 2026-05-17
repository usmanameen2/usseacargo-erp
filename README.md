# USSeaCargo ERP v3

## Deploy to Hostinger

### Step 1: Upload to GitHub
Upload ALL files from this folder to your GitHub repository root.

### Step 2: Connect Hostinger Auto Deploy
1. Hostinger → your website → Auto Deploy
2. Connect GitHub repo: `usseacargo-erp`
3. Branch: `main` → Deploy

### Step 3: Start Backend Server
SSH into Hostinger VPS:
```bash
cd ~/domains/usseacargo.com/nodejs
npm install
node server.js
```

Or with PM2 (keeps running):
```bash
npm install -g pm2
npm install
pm2 start server.js --name erp
pm2 save
pm2 startup
```

### Admin Login
- Username: `admin`
- Password: `admin123`

### Features
- Full CRUD (Add/Edit/Delete) on all modules
- MBL, HBL, D.O., NOC, P/L, C.I., C/O, B/E, SI, MFT document management
- File upload for shipping documents
- AED/USD currency toggle
- PDF invoice download & Excel export
- Password change & user management

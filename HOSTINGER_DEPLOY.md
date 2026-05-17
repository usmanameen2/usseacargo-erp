# USSeaCargo - Hostinger Deployment Guide

Deploy your Logistics ERP on **usseacargo.com** with username/password login.

---

## IMPORTANT: Google NoIndex Protection (Already Enabled)

Your app is **hidden from Google and all search engines** by default:

| Protection Layer | Status |
|-----------------|--------|
| `<meta name="robots" content="noindex, nofollow">` | In HTML |
| `X-Robots-Tag: noindex, nofollow` header | On all API responses |
| `noarchive, nosnippet` | Extra protection |

Google, Bing, and ALL crawlers **cannot** find or index your app.

---

## Requirements

| Requirement | Details |
|-------------|---------|
| **Hosting** | Hostinger VPS (Cloud Startup) |
| **Domain** | usseacargo.com (already purchased) |
| **OS** | Ubuntu 22.04 |
| **Node.js** | v18+ |

---

## Step 1: Buy Hostinger VPS

1. Go to [hostinger.com](https://hostinger.com)
2. Buy **VPS Hosting** (Cloud Startup plan)
3. Select **Ubuntu 22.04**
4. Set root password
5. Note your VPS IP address

---

## Step 2: Point usseacargo.com to Your VPS

1. In Hostinger panel, go to **Domains** > usseacargo.com
2. Go to **DNS / Nameservers**
3. Add **A Record**:
   - Name: `@`
   - Points to: Your VPS IP
   - TTL: 3600
4. Add **A Record** for www:
   - Name: `www`
   - Points to: Your VPS IP
   - TTL: 3600
5. Wait 5-10 minutes

---

## Step 3: Connect to VPS via SSH

```bash
ssh root@YOUR_VPS_IP
```

---

## Step 4: Install Node.js

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # Should show v20.x.x
npm -v    # Should show 10.x.x
```

---

## Step 5: Upload Files to VPS

### Using SCP (from your computer):

```bash
cd /path/to/your/downloads
scp -r erp-backend root@YOUR_VPS_IP:/var/www/
```

### Using FileZilla:
1. Open FileZilla
2. Host: YOUR_VPS_IP, Username: root, Password: Your password, Port: 22
3. Create folder `/var/www/erp-backend` on server
4. Upload all erp-backend files

---

## Step 6: Install & Setup

```bash
cd /var/www/erp-backend
npm install
node database/seed.js
```

You should see: `[DB] Database ready (27 tables found).`

---

## Step 7: Change JWT Secret (IMPORTANT!)

```bash
cd /var/www/erp-backend
nano .env
```

Replace with:
```env
PORT=5000
JWT_SECRET=your-long-random-secret-string-here-min-32-chars
NODE_ENV=production
```

Press `Ctrl+O` then `Enter` to save, `Ctrl+X` to exit.

---

## Step 8: Install PM2 (Keep App Running 24/7)

```bash
npm install -g pm2
cd /var/www/erp-backend
pm2 start server.js --name "usseacargo"
pm2 save
pm2 startup systemd
```

Run the command PM2 shows you. Check: `pm2 status`

---

## Step 9: Install & Configure Nginx

```bash
apt install nginx -y
systemctl start nginx
systemctl enable nginx
```

Create config:
```bash
nano /etc/nginx/sites-available/usseacargo
```

Paste this (replace YOUR_VPS_IP with actual IP):
```nginx
server {
    listen 80;
    server_name usseacargo.com www.usseacargo.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

Enable:
```bash
ln -s /etc/nginx/sites-available/usseacargo /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

---

## Step 10: SSL Certificate (HTTPS)

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d usseacargo.com -d www.usseacargo.com
```

- Enter your email
- Agree to terms
- **Choose redirect HTTP to HTTPS (option 2)**
- Test auto-renew: `certbot renew --dry-run`

---

## Step 11: Open Firewall

```bash
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw enable
ufw status
```

---

## Step 12: Test Your ERP!

Open browser:
```
https://usseacargo.com
```

You should see the **USSeaCargo Login page**!

### Default Login:
| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

**Change admin password immediately after first login!**

---

## Your ERP is Now Live on usseacargo.com!

- Fully hidden from Google (noindex protection active)
- Username/password login system
- 9 complete ERP modules
- Ready for your customers

---

## Useful Commands

```bash
# Check app status
pm2 status

# View logs
pm2 logs usseacargo

# Restart app
pm2 restart usseacargo

# Restart Nginx
systemctl restart nginx

# Check Nginx status
systemctl status nginx

# Backup database
cp /var/www/erp-backend/database/erp.db /var/backups/usseacargo-$(date +%Y%m%d).db
```

---

## Pricing You Can Charge

| Plan | Price | Users |
|------|-------|-------|
| Basic | $29/month | 3 users |
| Professional | $99/month | 10 users |
| Enterprise | $299/month | Unlimited |

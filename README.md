# USSeaCargo ERP - Freight Forwarding Management System

## Deployment Guide

### Hostinger VPS Deployment

1. **Upload files** to your server via FTP/SFTP or Git:
   - All files in this folder (except `node_modules/`)

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   npm start
   ```
   Or using PM2 for production:
   ```bash
   npm install -g pm2
   pm2 start server.js --name erp-flow
   pm2 save
   pm2 startup
   ```

4. **Access the app** at your server's IP or domain on port 3000.

### Structure

```
fresh/
├── server.js      # Express backend API + static file serving
├── package.json   # Dependencies and scripts
├── .gitignore     # Ignored files (node_modules, DB, env)
├── README.md      # This file
└── dist/          # Built frontend (React SPA)
    ├── index.html
    └── assets/
        ├── *.js   # Bundled JavaScript
        └── *.css  # Bundled CSS
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |

### API Endpoints

The Express server provides REST API endpoints for the ERP system.
See `server.js` for full API documentation.

### Notes

- SQLite database is created automatically on first run.
- All data persists in local `.db` files.
- Ensure Node.js >= 18 is installed on the server.

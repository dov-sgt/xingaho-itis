# Deployment Guide: Production Server

## Server Info
- **Path**: `/var/www/html/xinghao-itis`
- **OS**: Ubuntu
- **Node.js**: v18+ recommended
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx (recommended)

---

## Step 1: Clone Repository

```bash
cd /var/www/html
git clone https://github.com/dov-sgt/xingaho-itis.git
cd xingaho-itis
```

## Step 2: Install Dependencies

```bash
# Install Node.js 18+ (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install project dependencies
npm install --production
```

## Step 3: Environment Configuration

```bash
# Create .env file
cat > .env << 'EOF'
DATABASE_URL="file:./dev.db"
NODE_ENV=production
EOF
```

## Step 4: Database Setup

```bash
# Push schema to database
npx prisma db push

# Seed initial data
node prisma/seed.js
```

## Step 5: Build Application

```bash
npm run build
```

## Step 6: Start with PM2

```bash
# Start the application
pm2 start npm --name "xinghao-itis" -- start

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Step 7: Nginx Reverse Proxy (Recommended)

```bash
# Install Nginx
sudo apt-get install -y nginx

# Create Nginx config
sudo tee /etc/nginx/sites-available/xinghao-itis << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # Change to your domain or IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/xinghao-itis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 8: Firewall (Optional)

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## Useful PM2 Commands

```bash
# View logs
pm2 logs xinghao-itis

# Monitor
pm2 monit

# Restart
pm2 restart xinghao-itis

# Stop
pm2 stop xinghao-itis

# Delete
pm2 delete xinghao-itis
```

## Useful Commands

```bash
# View application logs
pm2 logs xinghao-itis --lines 100

# Check status
pm2 status

# Update application
cd /var/www/html/xinghao-itis
git pull origin main
npm install --production
npm run build
pm2 restart xinghao-itis
```

---

## File Structure

```
/var/www/html/xinghao-itis/
├── .env                 # Environment variables
├── .next/               # Build output
├── prisma/
│   ├── schema.prisma    # Database schema
│   ├── dev.db           # SQLite database
│   └── seed.js          # Seed script
├── src/                 # Source code
├── package.json
└── next.config.mjs
```

---

## Troubleshooting

### Port 3000 already in use
```bash
# Find process using port 3000
sudo lsof -i :3000
# Kill it
sudo kill -9 <PID>
```

### Database locked
```bash
# Delete and recreate
rm prisma/dev.db
npx prisma db push
node prisma/seed.js
```

### Build fails
```bash
# Clean and rebuild
rm -rf .next
npm run build
```

### PM2 won't start
```bash
# Check logs
pm2 logs xinghao-itis --err

# Try starting manually
cd /var/www/html/xinghao-itis
npm start
```

---

## Security Notes

1. **Change default passwords** in seed.js before production
2. **Use HTTPS** with Let's Encrypt (Certbot)
3. **Firewall**: Only expose necessary ports
4. **Backups**: Regular backup of `prisma/dev.db`
5. **Updates**: Keep Node.js and dependencies updated

---

## Backup Script

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/var/backups/xinghao-itis"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp /var/www/html/xinghao-itis/prisma/dev.db $BACKUP_DIR/dev_$DATE.db

# Keep only last 7 days
find $BACKUP_DIR -name "dev_*.db" -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /var/www/html/xinghao-itis/backup.sh
```

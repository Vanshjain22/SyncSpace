# SyncSpace Production & AWS Deployment Guide

This guide outlines the production hosting strategy for SyncSpace, including a recommended cloud-native SaaS setup (Vercel + Railway + Neon + Upstash + S3) and a step-by-step practical guide to deploying on a single AWS EC2 instance using Docker, Nginx, and Let's Encrypt SSL.

---

## 1. Production Architecture (Recommended Solo-Developer / Startup Stack)

For ease of maintenance, zero cold-starts, and premium performance, the recommended production architecture is:

- **Frontend Hosting**: [Vercel](https://vercel.com) (natively handles Next.js routing, caching, and global edge CDN).
- **Backend API Hosting**: [Railway](https://railway.app) or [Render](https://render.com) (deploys automatically via our optimized `apps/api/Dockerfile`).
- **Database**: [Neon PostgreSQL](https://neon.tech) (serverless Postgres with branching support).
- **Caching Layer**: [Upstash Redis](https://upstash.com) (serverless Redis with high performance).
- **File Storage**: AWS S3 (configured via our integrated `StorageProvider` client).
- **CI/CD Actions**: GitHub Actions (automates linting, typechecks, and validation checks).

---

## 2. Option: Self-Hosted AWS EC2 Single-Instance Deployment

If you want to deploy both frontend and backend on a single AWS EC2 instance, follow this step-by-step practical guide.

### System Architecture

```
                   Internet (HTTP/HTTPS)
                             │
                             ▼
                 [ AWS EC2 Instance (Ubuntu) ]
                ┌─────────────────────────────┐
                │        Nginx Reverse Proxy  │
                │        (Let's Encrypt SSL)  │
                └──────────────┬──────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       [ Web Container ]               [ API Container ]
       (Port 3000)                     (Port 4000)
               │                               │
               └───────────────┬───────────────┘
                               ▼
            [ Postgres ] ◄───► [ Redis ]
```

### Step 1: Launch an AWS EC2 Instance

1. Go to the AWS Console -> EC2 -> Launch Instance.
2. Select **Ubuntu Server 22.04 LTS** (or 24.04).
3. Select an instance type (e.g., `t3.small` or `t3.medium` is recommended for running Node + Next.js + DB).
4. Configure Security Group rules:
   - **Inbound HTTP (Port 80)**: Allow from anywhere (`0.0.0.0/0`).
   - **Inbound HTTPS (Port 443)**: Allow from anywhere (`0.0.0.0/0`).
   - **Inbound SSH (Port 22)**: Allow only from your current IP.

### Step 2: Install Docker & Docker Compose

SSH into your instance:

```bash
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip
```

Update packages and install Docker:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker ubuntu
# Log out and log back in to apply docker group permissions
exit
```

### Step 3: Configure Environment Variables

Create a root folder `/app/syncspace` and set up your production environment files:
`apps/api/.env`:

```env
PORT=4000
NODE_ENV=production
DATABASE_URL=postgresql://syncspace:YOUR_SECURE_PASSWORD@postgres:5432/syncspace_prod
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@redis:6379
JWT_ACCESS_SECRET=your_minimum_32_characters_secret_here
JWT_REFRESH_SECRET=your_minimum_32_characters_secret_here
FRONTEND_URL=https://syncspace.yourdomain.com
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_s3_bucket_name
AWS_REGION=us-east-1
```

`apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://api.syncspace.yourdomain.com/api
NEXT_PUBLIC_APP_NAME=SyncSpace
NEXT_PUBLIC_APP_VERSION=0.1.0
```

### Step 4: Run Services via Docker Compose

Use the optimized root `docker-compose.yml` to run the stack:

```bash
docker-compose -f docker-compose.yml up -d
```

Verify containers are running and healthy:

```bash
docker ps
```

### Step 5: Install Nginx & Configure SSL via Certbot

Install Nginx and Certbot:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Configure Nginx reverse proxies for your domains (e.g. `syncspace.yourdomain.com` for web, `api.syncspace.yourdomain.com` for api). Create `/etc/nginx/sites-available/syncspace`:

```nginx
server {
    server_name syncspace.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    server_name api.syncspace.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site configuration and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/syncspace /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Obtain Let's Encrypt SSL certificates automatically:

```bash
sudo certbot --nginx -d syncspace.yourdomain.com -d api.syncspace.yourdomain.com
```

Follow the interactive prompts to enable automatic redirection. Certbot will secure Nginx reverse proxies with SSL.

---

## 3. Database Backups & Maintenance

For EC2 installations, schedule nightly backups of the Postgres volume:

```bash
# Export schema and data
docker exec -t syncspace_postgres pg_dumpall -c -U syncspace > backup_$(date +%F).sql
```

Alternatively, utilizing **Neon PostgreSQL** completely offloads backup maintenance, replication, and vertical scale-ups automatically!

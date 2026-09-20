# 🚀 Smart-PMS Production Deployment Guide

A comprehensive, production-grade guide for deploying **Smart-PMS (Performance Management System)** to the cloud with **Zero Cost / Free Tier architecture**, high availability, and automated persistence.

---

## 🏗️ System Architecture

```mermaid
graph TD
    User([🌐 End Users / Officers]) -->|HTTPS Requests| Uptime[🤖 UptimeRobot (24/7 Keep-Alive)]
    User -->|HTTPS| Render[⚡ Render Web Service (Docker / Nginx + PHP 8.3 FPM)]
    Render -->|SSL Encrypted Port 4000| TiDB[(🗄️ TiDB Serverless Cloud MySQL)]
    Render -->|S3 API| R2[(☁️ Cloudflare R2 Object Storage)]
    R2 -->|Public CDN URL| User
```

| Component | Provider | Tier / Specs | Role |
| :--- | :--- | :--- | :--- |
| **App Server** | [Render](https://render.com) | Free Web Service (Docker) | Runs Nginx, PHP 8.3 FPM, Laravel 12 & compiled Inertia/Vite assets |
| **Database** | [TiDB Cloud](https://tidbcloud.com) | Serverless (5 GB Free) | MySQL-compatible, fully managed, multi-AZ cloud database with SSL |
| **Object Storage** | [Cloudflare R2](https://cloudflare.com) | 10 GB Free / 0 Egress | Stores employee avatars, profile photos, accomplishment attachments |
| **Keep-Alive** | [UptimeRobot](https://uptimerobot.com) | Free (5-min interval) | Prevents Render from idling/sleeping; ensures instant response |

---

## 📁 1. Containerization & Server Configuration

The repository includes a multi-stage Docker setup optimized for production Laravel applications.

### Key Configuration Files:
- **`Dockerfile`**: Multi-stage build (Compiles frontend assets with Node 20, builds lean PHP 8.3 FPM image with Nginx).
- **`docker/entrypoint.sh`**: Automatic startup script that caches config/routes, manages storage links, and boots Supervisor.
- **`docker/supervisord.conf`**: Manages both Nginx and PHP-FPM processes concurrently.
- **`docker/nginx.conf`**: High-performance Nginx config with gzip compression and static asset caching.
- **`docker/php.ini`**: Production PHP configuration (OPcache enabled, 128M upload limit, 256M memory limit).

---

## 🔐 2. Production Environment Variables (.env)

Add the following environment variables to your **Render Web Service ➔ Environment** tab:

### ⚙️ Core Application
```ini
APP_NAME="Smart PMS"
APP_ENV=production
APP_KEY=base64:YOUR_APP_KEY_HERE
APP_DEBUG=false
APP_URL=https://smart-pms.onrender.com
LOG_CHANNEL=stderr
LOG_LEVEL=error
```

### 🗄️ TiDB Cloud Serverless Database
```ini
DB_CONNECTION=mysql
DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_DATABASE=smart_pms
DB_USERNAME=YOUR_TIDB_USERNAME.root
DB_PASSWORD=YOUR_TIDB_PASSWORD
MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt
```

### ☁️ Cloudflare R2 Cloud Storage (S3 Compatible)
```ini
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=YOUR_R2_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_R2_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION=auto
AWS_BUCKET=smart-pms
AWS_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
AWS_USE_PATH_STYLE_ENDPOINT=false
AWS_URL=https://pub-YOUR_R2_DEV_SUBDOMAIN.r2.dev
```

### 🏎️ Cache & Session Drivers
```ini
SESSION_DRIVER=database
SESSION_LIFETIME=120
CACHE_STORE=database
QUEUE_CONNECTION=sync
```

---

## 🚀 3. Step-by-Step Deployment Instructions

### Step 1: TiDB Cloud Database Setup
1. Create a free cluster at [TiDB Cloud](https://tidbcloud.com).
2. Create a database named `smart_pms`.
3. In `config/database.php`, ensure the MySQL PDO options include:
   ```php
   PDO::MYSQL_ATTR_SSL_CA => env('MYSQL_ATTR_SSL_CA', '/etc/ssl/certs/ca-certificates.crt'),
   ```
4. Run initial migrations and seeders from your local environment or via Render terminal:
   ```bash
   php artisan migrate:fresh --seed --force
   ```

---

### Step 2: Cloudflare R2 Bucket Setup
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com) ➔ **R2 Object Storage**.
2. Click **Create Bucket** ➔ Name it **`smart-pms`**.
3. Under **Bucket Settings**:
   - Enable **Public Development URL** (allows avatars and public attachments to load).
4. Go to **Manage R2 API Tokens** ➔ **Create API Token**:
   - Permission: `Admin Read & Write` or `Object Read & Write`
   - Apply to bucket: `smart-pms`
   - Copy the `Access Key ID`, `Secret Access Key`, and `Endpoint URL`.
5. Sync existing local storage files to R2 using the AWS S3 PHP SDK or CLI.

---

### Step 3: Deploy on Render
1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** ➔ **Web Service**.
3. Connect your GitHub repository: `your-username/smart-pms`.
4. Configure service:
   - **Name:** `smart-pms`
   - **Language / Environment:** `Docker`
   - **Region:** `Singapore` (or nearest to your TiDB region)
   - **Instance Type:** `Free`
5. Go to the **Environment** tab and add all environment variables listed in Section 2.
6. Click **Deploy Web Service**.

---

### Step 4: 24/7 Keep-Alive (Zero Cold-Start Delay)
Render's free tier spins down web services after 15 minutes of inactivity. To prevent delays:
1. Register at [UptimeRobot](https://uptimerobot.com).
2. Click **+ Add New Monitor**:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Smart PMS`
   - **URL:** `https://smart-pms.onrender.com`
   - **Monitoring Interval:** `Every 5 minutes`
3. Click **Create Monitor**.

---

## 🛠️ 4. Maintenance & Useful Commands

### Force Re-caching Config & Routes
If you update `.env` variables or routes:
```bash
php artisan optimize:clear
php artisan optimize
```

### Running Database Migrations
To run new migrations in production safely:
```bash
php artisan migrate --force
```

### Storage Symlink Note
In this cloud setup, `FILESYSTEM_DISK=s3` handles all persistent uploads. Uploaded files are served with global low latency from Cloudflare edge networks without depending on local disk persistence.

---

## 📄 License & Ownership
Copyright © 2026 Maki Liones (`makinity`). Built with Laravel, Inertia.js, Vue, Tailwind CSS, TiDB, and Cloudflare R2.

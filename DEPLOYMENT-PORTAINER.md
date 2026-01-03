# HouseholdERP - Portainer Deployment Guide

This guide will walk you through deploying HouseholdERP using Portainer, a web-based Docker management interface. This is the easiest way to deploy if you prefer a graphical interface over command-line tools.

## What is Portainer?

Portainer is a web-based management tool for Docker that provides:
- Visual interface for managing containers, images, and volumes
- Easy stack deployment with built-in editor
- Real-time logs and statistics
- Simple environment variable management
- Container health monitoring

## Prerequisites

### 1. Docker Installed

Ensure Docker is installed on your server:

```bash
docker --version
```

If not installed, install Docker:

```bash
# For Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# For other systems, see: https://docs.docker.com/engine/install/
```

### 2. Install Portainer

If you don't have Portainer installed yet:

```bash
# Create a volume for Portainer data
docker volume create portainer_data

# Run Portainer Community Edition
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

Access Portainer at: `https://your-server-ip:9443`

On first access, you'll be prompted to create an admin account.

## Deployment Steps

### Step 1: Access Portainer

1. Open your browser and navigate to: `https://your-server-ip:9443`
2. Login with your Portainer admin credentials
3. Select your Docker environment (usually "local")

### Step 2: Create a New Stack

1. In the left sidebar, click **"Stacks"**
2. Click the **"+ Add stack"** button
3. Enter a name for your stack: `hearth` (or `householderp`)

### Step 3: Add the Docker Compose Configuration

In the **Web editor** section, paste the following docker-compose configuration:

```yaml
version: '3.9'

services:
  # PostgreSQL Database
  hearth-db:
    image: postgres:16-alpine
    container_name: hearth-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-hearth_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-hearth_db}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - hearth-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-hearth_user} -d ${POSTGRES_DB:-hearth_db}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - hearth-network

  # MinIO Object Storage (S3-compatible)
  hearth-minio:
    image: minio/minio:latest
    container_name: hearth-minio
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_BROWSER_REDIRECT_URL: ${MINIO_BROWSER_REDIRECT_URL:-http://localhost:9001}
    ports:
      - "${MINIO_API_PORT:-9000}:9000"      # MinIO API
      - "${MINIO_CONSOLE_PORT:-9001}:9001"  # MinIO Console (Web UI)
    volumes:
      - hearth-minio-data:/data
    networks:
      - hearth-network
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  # Next.js Application (Production)
  hearth-app:
    image: ${DOCKERHUB_USERNAME:-caleblanchard}/hearth:${IMAGE_TAG:-latest}
    container_name: hearth-app
    restart: unless-stopped
    environment:
      # Database
      - DATABASE_URL=postgresql://${POSTGRES_USER:-hearth_user}:${POSTGRES_PASSWORD}@hearth-db:5432/${POSTGRES_DB:-hearth_db}?schema=public
      # Auth
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      # MinIO / S3 Configuration
      - S3_ENDPOINT=${S3_ENDPOINT:-http://hearth-minio:9000}
      - S3_ACCESS_KEY_ID=${MINIO_ROOT_USER:-minioadmin}
      - S3_SECRET_ACCESS_KEY=${MINIO_ROOT_PASSWORD}
      - S3_BUCKET_NAME=${S3_BUCKET_NAME:-hearth-uploads}
      - S3_REGION=${S3_REGION:-us-east-1}
      - S3_FORCE_PATH_STYLE=${S3_FORCE_PATH_STYLE:-true}
      # Push Notifications (optional)
      - NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      # App
      - NODE_ENV=production
    ports:
      - "${APP_PORT:-3000}:3000"
    volumes:
      - hearth-uploads:/app/uploads  # Fallback for local storage if needed
    depends_on:
      hearth-db:
        condition: service_healthy
      hearth-minio:
        condition: service_healthy
    networks:
      - hearth-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  hearth-postgres-data:
    name: hearth-postgres-data
  hearth-minio-data:
    name: hearth-minio-data
  hearth-uploads:
    name: hearth-uploads

networks:
  hearth-network:
    name: hearth-network
    driver: bridge
```

### Step 4: Configure Environment Variables

Scroll down to the **Environment variables** section and click **"+ Add an environment variable"** for each of the following:

#### Required Variables

| Name | Value | Description |
|------|-------|-------------|
| `POSTGRES_PASSWORD` | `your_strong_postgres_password` | PostgreSQL database password |
| `NEXTAUTH_SECRET` | Generate with: `openssl rand -base64 32` | NextAuth.js secret key (32+ characters) |
| `NEXTAUTH_URL` | `http://your-server-ip:3000` | Your application URL |
| `MINIO_ROOT_PASSWORD` | `your_minio_password` | MinIO admin password (8+ characters) |

#### Optional Variables (with sensible defaults)

| Name | Default | Description |
|------|---------|-------------|
| `DOCKERHUB_USERNAME` | `caleblanchard` | DockerHub username |
| `IMAGE_TAG` | `latest` | Docker image version |
| `APP_PORT` | `3000` | Application port |
| `POSTGRES_USER` | `hearth_user` | Database username |
| `POSTGRES_DB` | `hearth_db` | Database name |
| `MINIO_ROOT_USER` | `minioadmin` | MinIO admin username |
| `MINIO_API_PORT` | `9000` | MinIO API port |
| `MINIO_CONSOLE_PORT` | `9001` | MinIO Console port |
| `S3_BUCKET_NAME` | `hearth-uploads` | S3 bucket name |
| `S3_REGION` | `us-east-1` | S3 region |

**Note:** For push notifications (optional), add:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Generate with `node scripts/generate-vapid-keys.js`
- `VAPID_PRIVATE_KEY` - Generate with the same script

#### Using the Portainer Interface

For each variable:
1. Click **"+ Add an environment variable"**
2. Enter the **name** (e.g., `POSTGRES_PASSWORD`)
3. Enter the **value**
4. Click outside the field to save

**Alternative: Load from .env file**

If you have a `.env` file prepared, you can:
1. Click **"Load variables from .env file"**
2. Upload your `.env` file
3. Portainer will parse and load all variables

### Step 5: Deploy the Stack

1. Scroll to the bottom of the page
2. Click the **"Deploy the stack"** button
3. Wait for the deployment to complete (you'll see a success message)

Portainer will:
- Pull the Docker images
- Create the volumes
- Create the network
- Start all containers in the correct order

### Step 6: Monitor the Deployment

1. Click on the stack name (`hearth`) in the Stacks list
2. You'll see all containers and their status:
   - `hearth-db` - PostgreSQL database
   - `hearth-minio` - MinIO object storage
   - `hearth-app` - HouseholdERP application

Each should show a green "running" status.

### Step 7: View Container Logs

To check if everything started correctly:

1. In the stack view, click on a container name (e.g., `hearth-app`)
2. Click the **"Logs"** button
3. You should see startup logs without errors
4. For real-time logs, enable **"Auto-refresh logs"**

**What to look for:**
- **hearth-db**: `database system is ready to accept connections`
- **hearth-minio**: `MinIO Object Storage Server` and status on port 9000/9001
- **hearth-app**: `Ready in X ms` (Next.js server started)

### Step 8: Create Your First Admin User

Once all containers are running:

1. In the container list, click **"hearth-app"**
2. Click **"Console"** button
3. Select **"/bin/sh"** from the dropdown
4. Click **"Connect"**
5. In the terminal, run:
   ```bash
   npx tsx scripts/create-admin.ts
   ```
6. Follow the prompts to create your admin account

**Alternative: Use Portainer's Exec Console**
1. Click the container → **"Exec Console"**
2. Choose command: `/bin/sh`
3. Run the script above

### Step 9: Access Your Application

Open your browser and navigate to:

- **HouseholdERP App**: `http://your-server-ip:3000`
- **MinIO Console**: `http://your-server-ip:9001`
- **Portainer**: `https://your-server-ip:9443`

Login to HouseholdERP with the admin credentials you just created!

## Managing Your Deployment in Portainer

### Viewing Container Status

1. Go to **Stacks** → Click your stack name
2. You'll see:
   - Container status (running, stopped, unhealthy)
   - CPU and memory usage
   - Network information

### Viewing Logs

1. Click on a container
2. Click **"Logs"**
3. Use the search box to filter logs
4. Enable auto-refresh for real-time monitoring

### Restarting Containers

1. Click on a container
2. Click **"Restart"**
3. Confirm the action

**Or restart the entire stack:**
1. Go to **Stacks** → Select your stack
2. Click **"Stop"** then **"Start"**

### Updating Environment Variables

1. Go to **Stacks** → Click your stack name
2. Click **"Editor"** tab
3. Modify the environment variables section
4. Click **"Update the stack"**
5. Select **"Re-pull images and redeploy"**
6. Click **"Update"**

### Updating to a New Version

#### Option 1: Using Portainer UI

1. Go to **Stacks** → Click your stack
2. Click **"Editor"** tab
3. Change the `IMAGE_TAG` environment variable (e.g., from `latest` to `1.2.0`)
4. Click **"Update the stack"**
5. Enable **"Re-pull image and redeploy"**
6. Click **"Update"**

#### Option 2: Pull Latest

If using the `latest` tag:

1. Go to **Images**
2. Find `caleblanchard/hearth:latest`
3. Click **"Pull"** to get the newest version
4. Go back to your stack and restart it

### Viewing Volume Contents

1. Go to **Volumes** in the left sidebar
2. Click on a volume (e.g., `hearth-postgres-data`)
3. Click **"Browse"** to see files
4. You can download or delete files if needed

### Container Shell Access

1. Click on a container
2. Click **"Console"**
3. Select `/bin/sh` or `/bin/bash`
4. Click **"Connect"**
5. You now have shell access inside the container

Useful for:
- Running migrations
- Checking file permissions
- Debugging issues

### Accessing MinIO Console

MinIO provides its own web interface:

1. Navigate to `http://your-server-ip:9001`
2. Login with:
   - **Username**: Value of `MINIO_ROOT_USER` (default: `minioadmin`)
   - **Password**: Value of `MINIO_ROOT_PASSWORD`
3. From here you can:
   - View uploaded files
   - Create/delete buckets
   - Manage access policies
   - Monitor storage usage

## Backup and Restore

### Creating a Database Backup

1. Go to the **hearth-db** container
2. Click **"Console"** → Connect with `/bin/sh`
3. Run:
   ```bash
   pg_dump -U hearth_user hearth_db > /tmp/backup.sql
   ```
4. Go to **Volumes** → `hearth-postgres-data` → **Browse**
5. Navigate to `pgdata` and download the backup file

**Better approach: Use Portainer's exec:**

1. Click **hearth-db** container
2. Click **"Exec Console"**
3. Run: `pg_dump -U hearth_user hearth_db | gzip > /tmp/backup_$(date +%Y%m%d).sql.gz`

### Downloading Backups

1. Go to the container
2. Click **"Inspect"** → Copy the container ID
3. On your local machine:
   ```bash
   docker cp <container-id>:/tmp/backup.sql.gz ./backup.sql.gz
   ```

### Restoring from Backup

1. Stop the **hearth-app** container (to prevent connections)
2. Access the **hearth-db** console
3. Run:
   ```bash
   gunzip < /tmp/backup.sql.gz | psql -U hearth_user hearth_db
   ```
4. Start the **hearth-app** container

## Monitoring and Troubleshooting

### Container Health Checks

Portainer shows health status with colored indicators:
- 🟢 **Green (healthy)**: Container is running and healthy
- 🟡 **Yellow (starting)**: Container is starting up
- 🔴 **Red (unhealthy)**: Container failed health check

If a container is unhealthy:
1. Click on the container
2. Check the **Logs** for error messages
3. Verify environment variables are correct
4. Check the **Health** section for health check details

### Common Issues

#### Database Won't Start

**Symptoms:** hearth-db container shows unhealthy or won't start

**Solutions:**
1. Check logs: Look for permission or configuration errors
2. Verify `POSTGRES_PASSWORD` is set
3. Check if port 5432 is already in use:
   - Go to **Containers** → Filter for containers using port 5432
4. If volume is corrupted, you may need to delete and recreate:
   ```bash
   docker volume rm hearth-postgres-data
   ```
   ⚠️ **Warning:** This will delete all database data!

#### App Can't Connect to Database

**Symptoms:** hearth-app logs show database connection errors

**Solutions:**
1. Verify the `DATABASE_URL` environment variable is correct
2. Check that `hearth-db` is healthy before `hearth-app` starts
3. Ensure both containers are on the same network (`hearth-network`)
4. Restart the stack

#### MinIO Not Accessible

**Symptoms:** Can't access MinIO console at port 9001

**Solutions:**
1. Check if `hearth-minio` container is running
2. View logs for errors
3. Verify ports 9000 and 9001 are not in use by other containers
4. Check `MINIO_ROOT_PASSWORD` is at least 8 characters
5. If using a firewall, ensure ports 9000 and 9001 are open

#### File Uploads Not Working

**Symptoms:** Files fail to upload, S3 errors in logs

**Solutions:**
1. Check `hearth-app` logs for S3-related errors
2. Verify S3 environment variables:
   - `S3_ENDPOINT` should be `http://hearth-minio:9000`
   - `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` match MinIO credentials
3. Test MinIO connectivity from app container:
   - Console into `hearth-app`
   - Run: `curl -I http://hearth-minio:9000/minio/health/live`
4. Create the bucket manually in MinIO Console if it doesn't exist

### Performance Monitoring

Portainer provides basic resource monitoring:

1. Go to **Containers**
2. Look at the CPU and Memory columns
3. For detailed stats, click a container → **Stats** tab

**What to watch:**
- **Database**: Should use moderate CPU during queries, memory depends on data size
- **App**: CPU spikes during requests, memory should be stable
- **MinIO**: Memory usage grows with number of objects

## Security Considerations

### Change Default Credentials

After deployment, change default passwords:

1. **Portainer admin**: Go to **Settings** → **Users** → Change password
2. **MinIO**: Access MinIO Console → **Identity** → **Users** → Change password
3. **Application admin**: Login to app and change password in settings

### Network Isolation

By default, all services are on a private network (`hearth-network`). Only the following ports are exposed:
- Port 3000 (App)
- Port 9000 (MinIO API)
- Port 9001 (MinIO Console)

To further secure:
1. Remove MinIO port mappings from docker-compose if you don't need external access
2. Use a reverse proxy (Nginx, Caddy) for SSL/TLS
3. Set up firewall rules to restrict access

### Updating Secrets

To update sensitive variables (passwords, secrets):

1. Go to **Stacks** → Your stack → **Editor**
2. Update the environment variable values
3. Click **"Update the stack"** → Enable **"Re-deploy"**
4. Services will restart with new values

### Backup Encryption

When creating backups, consider encrypting them:

```bash
# Encrypt backup
gpg --symmetric --cipher-algo AES256 backup.sql.gz

# Decrypt backup
gpg --decrypt backup.sql.gz.gpg > backup.sql.gz
```

## Advanced Configuration

### Using External Database

If you want to use an external PostgreSQL database instead of the containerized one:

1. Edit the stack
2. Remove the `hearth-db` service
3. Update `DATABASE_URL` to point to your external database:
   ```
   DATABASE_URL=postgresql://user:password@external-host:5432/dbname?schema=public
   ```
4. Remove the database dependency from `hearth-app`

### Using AWS S3 Instead of MinIO

To use AWS S3 for file storage:

1. Edit the stack
2. Remove the `hearth-minio` service
3. Update environment variables:
   ```
   S3_ENDPOINT=https://s3.amazonaws.com
   S3_ACCESS_KEY_ID=your_aws_access_key
   S3_SECRET_ACCESS_KEY=your_aws_secret_key
   S3_BUCKET_NAME=your-bucket-name
   S3_REGION=us-east-1
   S3_FORCE_PATH_STYLE=false
   ```
4. Remove MinIO dependency from `hearth-app`

### Adding Redis Cache

To add Redis caching (for future use):

Add this service to your stack:

```yaml
  hearth-cache:
    image: redis:7-alpine
    container_name: hearth-cache
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - hearth-redis-data:/data
    networks:
      - hearth-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
```

And add the volume:

```yaml
volumes:
  hearth-redis-data:
    name: hearth-redis-data
```

### Reverse Proxy with SSL (Nginx Proxy Manager)

If you're using Nginx Proxy Manager in Portainer:

1. Deploy Nginx Proxy Manager from Portainer App Templates
2. Add a new proxy host:
   - **Domain Names**: `hearth.yourdomain.com`
   - **Forward Hostname/IP**: `hearth-app`
   - **Forward Port**: `3000`
   - **Enable SSL**: Yes, with Let's Encrypt
3. Update `NEXTAUTH_URL` to `https://hearth.yourdomain.com`
4. Restart the stack

## Tips and Best Practices

### Stack Naming

Use clear, descriptive stack names:
- ✅ Good: `hearth-production`, `householderp-main`
- ❌ Bad: `stack1`, `test`, `temp`

### Environment Variable Management

1. **Document your variables**: Keep a separate note of what each variable is for
2. **Use strong passwords**: Generate with password managers
3. **Don't use defaults in production**: Change `minioadmin`, etc.
4. **Keep `.env` backup**: Save your environment variables securely offline

### Regular Maintenance

Schedule regular maintenance:
- **Weekly**: Check logs for errors
- **Monthly**: Update to latest version, create backups
- **Quarterly**: Review disk usage, clean old images

### Resource Limits

Add resource limits to prevent containers from consuming all resources:

```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 2G
    reservations:
      cpus: '0.5'
      memory: 512M
```

Add this under each service in the stack editor.

### Notifications

Set up Portainer notifications:
1. Go to **Settings** → **Notifications**
2. Add a webhook or email notification
3. Get alerts when containers stop or become unhealthy

## Support and Resources

- **Portainer Documentation**: https://docs.portainer.io/
- **HouseholdERP Issues**: https://github.com/caleblanchard/Hearth/issues
- **Docker Documentation**: https://docs.docker.com/
- **MinIO Documentation**: https://min.io/docs/

## Comparison: CLI vs Portainer

| Task | CLI | Portainer |
|------|-----|-----------|
| Initial Setup | More complex | Easier with UI |
| Viewing Logs | `docker-compose logs` | Click → Logs button |
| Updating Variables | Edit `.env` file | Edit in web interface |
| Restarting Services | `docker-compose restart` | Click → Restart button |
| Monitoring Resources | Requires additional tools | Built-in graphs |
| Backup Automation | Easy with cron | Requires manual process |
| Multiple Environments | Better with git | Harder to manage |

**Recommendation:** Use Portainer for single-server deployments and day-to-day management. Use CLI for automation, scripting, and multi-environment setups.

---

**Happy deploying! 🚀**

For issues or questions, please open an issue on GitHub or consult the main [DEPLOYMENT.md](DEPLOYMENT.md) for additional context.

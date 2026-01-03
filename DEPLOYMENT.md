# HouseholdERP - Production Deployment Guide

This guide will walk you through deploying HouseholdERP to a Docker server for production use.

## Prerequisites

- Docker and Docker Compose installed on your server
- A server with at least 2GB RAM and 10GB disk space
- Basic knowledge of command line and Docker
- (Optional) A domain name if you want to use HTTPS

## Quick Start

### 1. Create Deployment Directory

```bash
# Create a directory for your deployment
mkdir -p /opt/householderp
cd /opt/householderp

# Download the docker-compose.prod.yml file
curl -O https://raw.githubusercontent.com/caleblanchard/Hearth/master/docker-compose.prod.yml
```

### 2. Configure Environment Variables

Copy the production environment template:

```bash
cp .env.production .env
```

Edit the `.env` file and configure the following **required** settings:

```bash
# DockerHub configuration
DOCKERHUB_USERNAME=caleblanchard  # Or your own DockerHub username if you've forked
IMAGE_TAG=latest                   # Or specify a version like 1.0.0

# Generate a strong password for PostgreSQL
POSTGRES_PASSWORD=your_strong_database_password_here

# Generate a secure NextAuth secret (run: openssl rand -base64 32)
NEXTAUTH_SECRET=your_generated_secret_here

# Set your production URL
NEXTAUTH_URL=http://your-server-ip:3000
# Or if using a domain:
# NEXTAUTH_URL=https://hearth.yourdomain.com

# MinIO Configuration (for file storage)
MINIO_ROOT_PASSWORD=your_secure_minio_password_min_8_chars
# The default MinIO settings work for most deployments:
# MINIO_ROOT_USER=minioadmin
# S3_BUCKET_NAME=hearth-uploads
```

**Important Security Notes:**
- Use strong, unique passwords for both PostgreSQL and MinIO
- Keep your `.env` file secure and never commit it to version control
- Generate `NEXTAUTH_SECRET` using: `openssl rand -base64 32`
- MinIO password must be at least 8 characters

### 3. Pull and Start the Application

```bash
# Pull the latest Docker image from DockerHub
docker-compose -f docker-compose.prod.yml pull

# Start the containers
docker-compose -f docker-compose.prod.yml up -d

# View logs to ensure everything started correctly
docker-compose -f docker-compose.prod.yml logs -f
```

The application will:
1. Start the PostgreSQL database
2. Pull the pre-built Docker image from DockerHub
3. Run database migrations automatically
4. Start the web server on port 3000

### 4. Create Your First Admin User

Once the containers are running, create your admin account:

```bash
docker-compose -f docker-compose.prod.yml exec hearth-app npx tsx scripts/create-admin.ts
```

Follow the prompts to enter:
- Family name
- Timezone
- Admin name
- Admin email
- Admin password (minimum 8 characters)

### 5. Access Your Application

Open your browser and navigate to:
- `http://your-server-ip:3000` (or your configured NEXTAUTH_URL)

Login with the email and password you just created!

## Configuration Options

### Port Configuration

By default, the application runs on port 3000. To change this, edit your `.env` file:

```bash
APP_PORT=8080  # Change to your desired port
```

Then restart the containers:

```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### File Storage with MinIO

The production docker-compose includes MinIO, an S3-compatible object storage service, for storing uploaded files (documents, photos, etc.).

#### MinIO is Included by Default

MinIO is automatically started with the application and provides:
- S3-compatible API for file storage
- Web-based management console
- Persistent storage with Docker volumes
- No external dependencies or cloud accounts needed

#### MinIO Configuration

Add these variables to your `.env` file:

```bash
# MinIO Root Credentials (Admin access to MinIO Console)
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your_secure_minio_password_min_8_chars

# MinIO Ports
MINIO_API_PORT=9000       # API endpoint
MINIO_CONSOLE_PORT=9001   # Web UI console

# S3 Configuration (for app to connect to MinIO)
S3_ENDPOINT=http://hearth-minio:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=your_secure_minio_password_min_8_chars
S3_BUCKET_NAME=hearth-uploads
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
```

**Important:** The `MINIO_ROOT_PASSWORD` and `S3_SECRET_ACCESS_KEY` should be the same value. Use a strong password with at least 8 characters.

#### Accessing MinIO Console

After starting the application, access the MinIO web console at:
- `http://your-server-ip:9001`

Login with:
- Username: Value of `MINIO_ROOT_USER` (default: `minioadmin`)
- Password: Value of `MINIO_ROOT_PASSWORD`

From the console, you can:
- View and manage uploaded files
- Create and manage buckets
- Monitor storage usage
- Configure access policies

#### Creating the Bucket

The application will automatically create the bucket specified in `S3_BUCKET_NAME` on first upload. Alternatively, you can create it manually via the MinIO Console:

1. Access the MinIO Console (http://your-server-ip:9001)
2. Login with your credentials
3. Click "Create Bucket"
4. Enter the bucket name (e.g., `hearth-uploads`)
5. Click "Create Bucket"

#### Using External S3 (AWS, DigitalOcean, etc.)

If you prefer to use AWS S3 or another S3-compatible service instead of MinIO, simply update the environment variables:

```bash
# For AWS S3
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY_ID=your_aws_access_key
S3_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET_NAME=your-s3-bucket-name
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=false

# For DigitalOcean Spaces
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_ACCESS_KEY_ID=your_spaces_access_key
S3_SECRET_ACCESS_KEY=your_spaces_secret_key
S3_BUCKET_NAME=your-space-name
S3_REGION=nyc3
S3_FORCE_PATH_STYLE=false
```

Then remove or comment out the `hearth-minio` service from `docker-compose.prod.yml`.

## Setting Up HTTPS with Reverse Proxy

### Using Nginx

1. Install Nginx on your server
2. Create a configuration file `/etc/nginx/sites-available/hearth`:

```nginx
server {
    listen 80;
    server_name hearth.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Enable the site and install SSL with Certbot:

```bash
sudo ln -s /etc/nginx/sites-available/hearth /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install Certbot and get SSL certificate
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d hearth.yourdomain.com
```

4. Update your `.env` file:

```bash
NEXTAUTH_URL=https://hearth.yourdomain.com
```

5. Restart the application:

```bash
docker-compose -f docker-compose.prod.yml restart
```

### Using Caddy (Easier Alternative)

Create a `Caddyfile`:

```
hearth.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Run Caddy:

```bash
caddy run
```

Caddy will automatically obtain and renew SSL certificates!

## Management Commands

### View Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs

# View application logs only
docker-compose -f docker-compose.prod.yml logs hearth-app

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f
```

### Restart the Application

```bash
docker-compose -f docker-compose.prod.yml restart
```

### Stop the Application

```bash
docker-compose -f docker-compose.prod.yml down
```

### Backup the Database

```bash
# Create a backup
docker-compose -f docker-compose.prod.yml exec hearth-db pg_dump -U hearth_user hearth_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use this script (create as backup.sh)
#!/bin/bash
BACKUP_DIR="/opt/householderp/backups"
mkdir -p $BACKUP_DIR
docker-compose -f docker-compose.prod.yml exec -T hearth-db pg_dump -U hearth_user hearth_db | gzip > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql.gz
echo "Backup created in $BACKUP_DIR"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

### Restore from Backup

```bash
# Stop the application
docker-compose -f docker-compose.prod.yml down

# Start only the database
docker-compose -f docker-compose.prod.yml up -d hearth-db

# Wait for database to be ready
sleep 10

# Restore the backup
docker-compose -f docker-compose.prod.yml exec -T hearth-db psql -U hearth_user hearth_db < your_backup.sql

# Start the application
docker-compose -f docker-compose.prod.yml up -d
```

### Update the Application

```bash
cd /opt/householderp

# Pull the latest Docker image
docker-compose -f docker-compose.prod.yml pull

# Restart with the new image
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

**Note:** To update to a specific version, edit your `.env` file and change `IMAGE_TAG` to the desired version (e.g., `IMAGE_TAG=1.2.0`), then run the commands above.

## Monitoring and Maintenance

### Health Checks

The application includes health check endpoints:

- Application: `http://localhost:3000/api/health`
- Database: Built into docker-compose

### System Requirements

**Minimum:**
- 2GB RAM
- 10GB disk space
- 1 CPU core

**Recommended:**
- 4GB RAM
- 20GB disk space
- 2 CPU cores

### Disk Space Management

Monitor your volumes:

```bash
docker system df -v
```

Clean up old images and containers:

```bash
docker system prune -a
```

## Troubleshooting

### Application Won't Start

1. Check the logs:
   ```bash
   docker-compose -f docker-compose.prod.yml logs
   ```

2. Verify environment variables:
   ```bash
   docker-compose -f docker-compose.prod.yml config
   ```

3. Ensure ports are not in use:
   ```bash
   sudo lsof -i :3000
   sudo lsof -i :5432
   ```

### Database Connection Issues

1. Check if database is running:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

2. Test database connection:
   ```bash
   docker-compose -f docker-compose.prod.yml exec hearth-db psql -U hearth_user hearth_db -c "SELECT version();"
   ```

### Can't Login

1. Verify admin user was created:
   ```bash
   docker-compose -f docker-compose.prod.yml exec hearth-db psql -U hearth_user hearth_db -c "SELECT email, name, role FROM family_members WHERE role = 'PARENT';"
   ```

2. Reset admin password if needed:
   ```bash
   docker-compose -f docker-compose.prod.yml exec hearth-app npx tsx scripts/create-admin.ts
   ```

### Running Out of Disk Space

1. Check Docker disk usage:
   ```bash
   docker system df
   ```

2. Clean up unused images and containers:
   ```bash
   docker system prune -a
   ```

3. Check database size:
   ```bash
   docker-compose -f docker-compose.prod.yml exec hearth-db psql -U hearth_user hearth_db -c "SELECT pg_size_pretty(pg_database_size('hearth_db'));"
   ```

4. Check MinIO storage usage via the web console at `http://your-server-ip:9001`

### MinIO Issues

1. Can't access MinIO Console:
   ```bash
   # Check if MinIO is running
   docker-compose -f docker-compose.prod.yml ps hearth-minio

   # Check MinIO logs
   docker-compose -f docker-compose.prod.yml logs hearth-minio

   # Verify port 9001 is available
   sudo lsof -i :9001
   ```

2. Files not uploading to MinIO:
   ```bash
   # Check S3 environment variables are set correctly
   docker-compose -f docker-compose.prod.yml exec hearth-app env | grep S3

   # Test MinIO connectivity from app container
   docker-compose -f docker-compose.prod.yml exec hearth-app curl -I http://hearth-minio:9000/minio/health/live
   ```

3. MinIO password not working:
   - Ensure `MINIO_ROOT_PASSWORD` is at least 8 characters
   - Verify `MINIO_ROOT_PASSWORD` and `S3_SECRET_ACCESS_KEY` match
   - After changing the password, restart the containers:
     ```bash
     docker-compose -f docker-compose.prod.yml restart hearth-minio
     ```

## For Maintainers: Automated Builds with GitHub Actions

If you've forked this repository and want to publish your own Docker images, you'll need to set up GitHub Actions:

### 1. Create DockerHub Account and Repository

1. Create an account at [hub.docker.com](https://hub.docker.com)
2. Create a new repository named `hearth`
3. Generate an access token:
   - Go to Account Settings → Security → New Access Token
   - Give it a descriptive name (e.g., "GitHub Actions")
   - Save the token securely

### 2. Configure GitHub Secrets

In your GitHub repository, add these secrets (Settings → Secrets and variables → Actions):

- `DOCKERHUB_USERNAME`: Your DockerHub username
- `DOCKERHUB_TOKEN`: The access token you generated

### 3. Create a Release

The GitHub Action automatically builds and publishes when you create a version tag:

```bash
# Create and push a version tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

This will:
1. Build the Docker image for multiple platforms (amd64, arm64)
2. Push to DockerHub with tags: `latest` and `1.0.0`
3. Create a GitHub release with notes
4. Update the DockerHub repository description

### 4. Monitor the Build

- Check the Actions tab in GitHub to see the build progress
- Once complete, your image will be available at `docker pull your-username/hearth:latest`

## Security Best Practices

1. **Keep software updated**: Regularly pull updates and rebuild containers
2. **Use strong passwords**: For database and admin accounts
3. **Enable firewall**: Only expose necessary ports
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
4. **Regular backups**: Set up automated daily backups
5. **Monitor logs**: Check for suspicious activity
6. **Use HTTPS**: Always use SSL/TLS in production
7. **Restrict database access**: Don't expose port 5432 to the internet

## Support and Documentation

- For application issues, check the logs
- For feature requests or bugs, create an issue in the repository
- For deployment help, refer to this guide

## License

See LICENSE file in the repository.

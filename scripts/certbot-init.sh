#!/bin/sh
# Certbot initialization script
# This script runs inside the Certbot container

DOMAIN="hearth.blanchardsd.com"
EMAIL="caleb@blanchardsd.com"
WEBROOT="/var/www/certbot"
CERTS_DIR="/etc/letsencrypt/live/$DOMAIN"
NGINX_CERTS_DIR="/etc/nginx/certs"

echo "Waiting for Nginx to be ready..."
sleep 15

# Check if certificate already exists
if [ -f "$CERTS_DIR/fullchain.pem" ]; then
    echo "Certificate already exists for $DOMAIN"
    echo "Copying existing certificate to nginx certs directory..."
    cp "$CERTS_DIR/fullchain.pem" "$NGINX_CERTS_DIR/$DOMAIN.crt" || true
    cp "$CERTS_DIR/privkey.pem" "$NGINX_CERTS_DIR/$DOMAIN.key" || true
    echo "Certificate copied. Please reload Nginx manually:"
    echo "  docker exec nginx-reverse-proxy nginx -s reload"
else
    echo "Requesting SSL certificate for $DOMAIN..."
    certbot certonly \
        --webroot \
        --webroot-path="$WEBROOT" \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        -d "$DOMAIN"
    
    if [ $? -eq 0 ] && [ -f "$CERTS_DIR/fullchain.pem" ]; then
        echo "Certificate obtained successfully!"
        echo "Copying certificate to nginx certs directory..."
        cp "$CERTS_DIR/fullchain.pem" "$NGINX_CERTS_DIR/$DOMAIN.crt"
        cp "$CERTS_DIR/privkey.pem" "$NGINX_CERTS_DIR/$DOMAIN.key"
        echo "Certificate copied. Please reload Nginx manually:"
        echo "  docker exec nginx-reverse-proxy nginx -s reload"
    else
        echo "ERROR: Failed to obtain certificate"
        echo "Please check:"
        echo "  1. DNS is pointing to the correct IP"
        echo "  2. Port 80 is accessible from the internet"
        echo "  3. Nginx is running and serving /.well-known/acme-challenge/"
        exit 1
    fi
fi

# Set up auto-renewal cron job
echo "Setting up auto-renewal cron job..."
cat > /tmp/certbot-renew.sh << 'EOF'
#!/bin/sh
certbot renew --quiet
if [ $? -eq 0 ]; then
    cp /etc/letsencrypt/live/hearth.blanchardsd.com/fullchain.pem /etc/nginx/certs/hearth.blanchardsd.com.crt
    cp /etc/letsencrypt/live/hearth.blanchardsd.com/privkey.pem /etc/nginx/certs/hearth.blanchardsd.com.key
    # Note: Nginx reload must be done from host or via docker exec
    echo "Certificates renewed. Reload Nginx: docker exec nginx-reverse-proxy nginx -s reload"
fi
EOF

chmod +x /tmp/certbot-renew.sh
echo "0 3 * * * /tmp/certbot-renew.sh" | crontab -

echo "Certbot initialization complete!"
echo "Container will keep running for certificate auto-renewal."

# Keep container running
crond -f -d 8

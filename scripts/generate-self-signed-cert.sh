#!/bin/bash
# Generate a self-signed certificate for initial Nginx setup
# This will be replaced by Let's Encrypt certificate once Certbot runs

DOMAIN="hearth.blanchardsd.com"
CERT_DIR="./nginx/certs"

mkdir -p "$CERT_DIR"

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/$DOMAIN.key" \
  -out "$CERT_DIR/$DOMAIN.crt" \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"

echo "Self-signed certificate generated at:"
echo "  $CERT_DIR/$DOMAIN.crt"
echo "  $CERT_DIR/$DOMAIN.key"
echo ""
echo "This certificate will be replaced by Let's Encrypt once Certbot runs."

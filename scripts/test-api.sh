#!/bin/bash

# ============================================================
# NEXUS BACKEND - API Testing Script
# ============================================================
# Testa o fluxo completo: Health → Register → Login → Products
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
EMAIL="test_$(date +%s)@nexus.local"
PASSWORD="TestPassword123"
FULL_NAME="Test User"
TENANT_NAME="Test Store"

# Storage for tokens
JWT_TOKEN=""
USER_ID=""
TENANT_ID=""

echo "=========================================="
echo "🧪 NEXUS BACKEND API TEST"
echo "=========================================="
echo "API URL: $API_URL"
echo "Email: $EMAIL"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

print_step() {
    echo -e "${YELLOW}▶️${NC} $1"
}

# ============================================================
# TEST 1: Health Check
# ============================================================
echo ""
print_step "TEST 1: Health Check"
echo "----------------------------------------"

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/health" || echo "000")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_status "Health check passed"
    print_info "Response: $BODY"
else
    print_error "Health check failed (HTTP $HTTP_CODE)"
    print_info "Response: $BODY"
    exit 1
fi

# ============================================================
# TEST 2: Register User
# ============================================================
echo ""
print_step "TEST 2: Register User"
echo "----------------------------------------"

REGISTER_PAYLOAD=$(cat <<EOF
{
  "email": "$EMAIL",
  "password": "$PASSWORD",
  "full_name": "$FULL_NAME",
  "tenant_name": "$TENANT_NAME",
  "niche": "varejo"
}
EOF
)

REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$REGISTER_PAYLOAD" \
  "$API_URL/api/auth/register" || echo "000")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
BODY=$(echo "$REGISTER_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ]; then
    print_status "User registered successfully"
    JWT_TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    USER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    TENANT_ID=$(echo "$BODY" | grep -o '"tenant_id":"[^"]*"' | cut -d'"' -f4)
    print_info "User ID: $USER_ID"
    print_info "Tenant ID: $TENANT_ID"
    print_info "Token received: ${JWT_TOKEN:0:20}..."
else
    print_error "Registration failed (HTTP $HTTP_CODE)"
    print_info "Response: $BODY"
    exit 1
fi

# ============================================================
# TEST 3: Login
# ============================================================
echo ""
print_step "TEST 3: Login"
echo "----------------------------------------"

LOGIN_PAYLOAD=$(cat <<EOF
{
  "email": "$EMAIL",
  "password": "$PASSWORD"
}
EOF
)

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$LOGIN_PAYLOAD" \
  "$API_URL/api/auth/login" || echo "000")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
BODY=$(echo "$LOGIN_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_status "Login successful"
    JWT_TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    print_info "New token received: ${JWT_TOKEN:0:20}..."
else
    print_error "Login failed (HTTP $HTTP_CODE)"
    print_info "Response: $BODY"
    exit 1
fi

# ============================================================
# TEST 4: Get Current User (Authenticated)
# ============================================================
echo ""
print_step "TEST 4: Get Current User (Authenticated)"
echo "----------------------------------------"

ME_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_URL/api/auth/me" || echo "000")

HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
BODY=$(echo "$ME_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_status "Authenticated request successful"
    print_info "User data received"
else
    print_error "Authenticated request failed (HTTP $HTTP_CODE)"
    print_info "Response: $BODY"
    exit 1
fi

# ============================================================
# TEST 5: List Products (Empty)
# ============================================================
echo ""
print_step "TEST 5: List Products (Authenticated)"
echo "----------------------------------------"

PRODUCTS_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_URL/api/products?page=1&limit=10" || echo "000")

HTTP_CODE=$(echo "$PRODUCTS_RESPONSE" | tail -n1)
BODY=$(echo "$PRODUCTS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_status "Products list retrieved"
    COUNT=$(echo "$BODY" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    print_info "Total products: ${COUNT:-0}"
else
    print_error "Products request failed (HTTP $HTTP_CODE)"
    print_info "Response: $BODY"
    exit 1
fi

# ============================================================
# TEST 6: Create Product
# ============================================================
echo ""
print_step "TEST 6: Create Product (Authenticated)"
echo "----------------------------------------"

PRODUCT_PAYLOAD=$(cat <<EOF
{
  "name": "Test Product",
  "sku": "TEST-$(date +%s)",
  "description": "A test product created via API",
  "sale_price": 99.99,
  "cost_price": 50.00,
  "stock_quantity": 100,
  "min_stock": 10,
  "unit": "UN"
}
EOF
)

CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "$PRODUCT_PAYLOAD" \
  "$API_URL/api/products" || echo "000")

HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
BODY=$(echo "$CREATE_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ]; then
    print_status "Product created successfully"
    PRODUCT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_info "Product ID: $PRODUCT_ID"
else
    print_error "Product creation failed (HTTP $HTTP_CODE)"
    print_info "Response: $BODY"
    exit 1
fi

# ============================================================
# TEST 7: Get Product Details
# ============================================================
echo ""
print_step "TEST 7: Get Product Details"
echo "----------------------------------------"

PRODUCT_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_URL/api/products/$PRODUCT_ID" || echo "000")

HTTP_CODE=$(echo "$PRODUCT_RESPONSE" | tail -n1)
BODY=$(echo "$PRODUCT_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_status "Product details retrieved"
    PRODUCT_NAME=$(echo "$BODY" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_info "Product: $PRODUCT_NAME"
else
    print_error "Get product failed (HTTP $HTTP_CODE)"
    print_info "Response: $BODY"
    exit 1
fi

# ============================================================
# TEST 8: Update Product
# ============================================================
echo ""
print_step "TEST 8: Update Product"
echo "----------------------------------------"

UPDATE_PAYLOAD=$(cat <<EOF
{
  "name": "Updated Test Product",
  "sale_price": 149.99,
  "stock_quantity": 150
}
EOF
)

UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "$UPDATE_PAYLOAD" \
  "$API_URL/api/products/$PRODUCT_ID" || echo "000")

HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
BODY=$(echo "$UPDATE_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_status "Product updated successfully"
else
    print_error "Product update failed (HTTP $HTTP_CODE)"
    print_info "Response: $BODY"
    exit 1
fi

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo "=========================================="
echo "✅ ALL TESTS PASSED!"
echo "=========================================="
echo ""
print_info "Test User: $EMAIL"
print_info "Tenant ID: $TENANT_ID"
print_info "Product ID: $PRODUCT_ID"
print_info "JWT Token: ${JWT_TOKEN:0:50}..."
echo ""
echo "Next steps:"
echo "  - Frontend integration: Use the JWT token in Authorization header"
echo "  - MinIO upload test: Run ./scripts/test-minio.sh"
echo ""

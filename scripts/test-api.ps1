# ============================================================
# NEXUS BACKEND - API Testing Script (PowerShell)
# ============================================================
# Testa o fluxo completo: Health → Register → Login → Products
# ============================================================

$API_URL = $env:API_URL
if (-not $API_URL) { $API_URL = "http://localhost:3000" }

$EMAIL = "test_$(Get-Random)@nexus.local"
$PASSWORD = "TestPassword123"
$FULL_NAME = "Test User"
$TENANT_NAME = "Test Store"

$JWT_TOKEN = ""
$USER_ID = ""
$TENANT_ID = ""
$PRODUCT_ID = ""

function Write-Status($msg) {
    Write-Host "✅ $msg" -ForegroundColor Green
}

function Write-Error($msg) {
    Write-Host "❌ $msg" -ForegroundColor Red
}

function Write-Info($msg) {
    Write-Host "ℹ️  $msg" -ForegroundColor Cyan
}

function Write-Step($msg) {
    Write-Host "▶️  $msg" -ForegroundColor Yellow
}

Write-Host "==========================================" -ForegroundColor Blue
Write-Host "🧪 NEXUS BACKEND API TEST" -ForegroundColor Blue
Write-Host "==========================================" -ForegroundColor Blue
Write-Info "API URL: $API_URL"
Write-Info "Email: $EMAIL"
Write-Host ""

# ============================================================
# TEST 1: Health Check
# ============================================================
Write-Host ""
Write-Step "TEST 1: Health Check"
Write-Host "----------------------------------------"

try {
    $response = Invoke-RestMethod -Uri "$API_URL/health" -Method GET -ErrorAction Stop
    Write-Status "Health check passed"
    Write-Info "Status: $($response.status)"
}
catch {
    Write-Error "Health check failed: $_"
    exit 1
}

# ============================================================
# TEST 2: Register User
# ============================================================
Write-Host ""
Write-Step "TEST 2: Register User"
Write-Host "----------------------------------------"

$registerBody = @{
    email = $EMAIL
    password = $PASSWORD
    full_name = $FULL_NAME
    tenant_name = $TENANT_NAME
    niche = "varejo"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $registerBody `
        -ErrorAction Stop
    
    Write-Status "User registered successfully"
    $JWT_TOKEN = $response.token
    $USER_ID = $response.user.id
    $TENANT_ID = $response.user.tenant_id
    
    Write-Info "User ID: $USER_ID"
    Write-Info "Tenant ID: $TENANT_ID"
    Write-Info "Token: $($JWT_TOKEN.Substring(0, 20))..."
}
catch {
    Write-Error "Registration failed: $_"
    Write-Info "Response: $($_.Exception.Response)"
    exit 1
}

# ============================================================
# TEST 3: Login
# ============================================================
Write-Host ""
Write-Step "TEST 3: Login"
Write-Host "----------------------------------------"

$loginBody = @{
    email = $EMAIL
    password = $PASSWORD
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop
    
    Write-Status "Login successful"
    $JWT_TOKEN = $response.token
    Write-Info "New token: $($JWT_TOKEN.Substring(0, 20))..."
}
catch {
    Write-Error "Login failed: $_"
    exit 1
}

# ============================================================
# TEST 4: Get Current User
# ============================================================
Write-Host ""
Write-Step "TEST 4: Get Current User (Authenticated)"
Write-Host "----------------------------------------"

$headers = @{
    "Authorization" = "Bearer $JWT_TOKEN"
}

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/auth/me" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Status "Authenticated request successful"
    Write-Info "User: $($response.user.full_name)"
}
catch {
    Write-Error "Authenticated request failed: $_"
    exit 1
}

# ============================================================
# TEST 5: List Products
# ============================================================
Write-Host ""
Write-Step "TEST 5: List Products (Authenticated)"
Write-Host "----------------------------------------"

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/products?page=1&limit=10" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Status "Products list retrieved"
    Write-Info "Total products: $($response.pagination.total)"
}
catch {
    Write-Error "Products request failed: $_"
    exit 1
}

# ============================================================
# TEST 6: Create Product
# ============================================================
Write-Host ""
Write-Step "TEST 6: Create Product (Authenticated)"
Write-Host "----------------------------------------"

$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$productBody = @{
    name = "Test Product"
    sku = "TEST-$timestamp"
    description = "A test product created via API"
    sale_price = 99.99
    cost_price = 50.00
    stock_quantity = 100
    min_stock = 10
    unit = "UN"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/products" `
        -Method POST `
        -ContentType "application/json" `
        -Headers $headers `
        -Body $productBody `
        -ErrorAction Stop
    
    Write-Status "Product created successfully"
    $PRODUCT_ID = $response.product.id
    Write-Info "Product ID: $PRODUCT_ID"
}
catch {
    Write-Error "Product creation failed: $_"
    exit 1
}

# ============================================================
# TEST 7: Get Product Details
# ============================================================
Write-Host ""
Write-Step "TEST 7: Get Product Details"
Write-Host "----------------------------------------"

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/products/$PRODUCT_ID" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Status "Product details retrieved"
    Write-Info "Product: $($response.product.name)"
}
catch {
    Write-Error "Get product failed: $_"
    exit 1
}

# ============================================================
# TEST 8: Update Product
# ============================================================
Write-Host ""
Write-Step "TEST 8: Update Product"
Write-Host "----------------------------------------"

$updateBody = @{
    name = "Updated Test Product"
    sale_price = 149.99
    stock_quantity = 150
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/products/$PRODUCT_ID" `
        -Method PUT `
        -ContentType "application/json" `
        -Headers $headers `
        -Body $updateBody `
        -ErrorAction Stop
    
    Write-Status "Product updated successfully"
}
catch {
    Write-Error "Product update failed: $_"
    exit 1
}

# ============================================================
# SUMMARY
# ============================================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Info "Test User: $EMAIL"
Write-Info "Tenant ID: $TENANT_ID"
Write-Info "Product ID: $PRODUCT_ID"
Write-Info "JWT Token: $($JWT_TOKEN.Substring(0, 50))..."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  - Frontend integration: Use the JWT token in Authorization header"
Write-Host "  - MinIO upload test: Run ./scripts/test-minio.ps1"
Write-Host ""

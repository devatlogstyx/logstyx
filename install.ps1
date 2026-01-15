# PowerShell script for encrypted environment setup

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Function to generate random hex string
function Generate-Secret {
    param([int]$Length)
    $bytes = New-Object byte[] ([Math]::Ceiling($Length / 2))
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $hex = [BitConverter]::ToString($bytes).Replace("-", "").ToLower()
    return $hex.Substring(0, $Length)
}

# Function to encrypt a value using AES-256-CTR
function Encrypt-Value {
    param(
        [string]$Value,
        [string]$MasterKey
    )
    
    try {
        # Convert master key string to bytes (UTF-8, 32 characters = 32 bytes)
        $keyBytes = [System.Text.Encoding]::UTF8.GetBytes($MasterKey)
        if ($keyBytes.Length -ne 32) {
            throw "Master key must be exactly 32 bytes"
        }
        
        # Generate random 16-byte IV
        $iv = New-Object byte[] 16
        [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($iv)
        $ivHex = [BitConverter]::ToString($iv).Replace("-", "").ToLower()
        
        # Create AES cipher in CTR mode
        # Note: .NET doesn't have native CTR mode, so we need to use a workaround
        # We'll use the BouncyCastle-like approach or fall back to a custom implementation
        
        # For PowerShell, we'll use a manual CTR implementation
        $aes = [System.Security.Cryptography.Aes]::Create()
        $aes.Mode = [System.Security.Cryptography.CipherMode]::ECB
        $aes.Padding = [System.Security.Cryptography.PaddingMode]::None
        $aes.Key = $keyBytes
        
        $encryptor = $aes.CreateEncryptor()
        $valueBytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
        
        # CTR mode: encrypt counter blocks and XOR with plaintext
        $encryptedBytes = New-Object byte[] $valueBytes.Length
        $counter = $iv.Clone()
        $offset = 0
        
        while ($offset -lt $valueBytes.Length) {
            $encryptedCounter = $encryptor.TransformFinalBlock($counter, 0, 16)
            
            $blockSize = [Math]::Min(16, $valueBytes.Length - $offset)
            for ($i = 0; $i -lt $blockSize; $i++) {
                $encryptedBytes[$offset + $i] = $valueBytes[$offset + $i] -bxor $encryptedCounter[$i]
            }
            
            # Increment counter
            for ($i = 15; $i -ge 0; $i--) {
                $counter[$i]++
                if ($counter[$i] -ne 0) { break }
            }
            
            $offset += $blockSize
        }
        
        $encryptedHex = [BitConverter]::ToString($encryptedBytes).Replace("-", "").ToLower()
        
        return "${ivHex}:${encryptedHex}"
    }
    finally {
        if ($aes) { $aes.Dispose() }
    }
}

Write-ColorOutput Green "=== Encrypted Environment Setup ==="
Write-Output ""

# Ask about deployment type
Write-ColorOutput Green "Step 1: Deployment Type"
Write-Output "Do you want to:"
Write-Output "  1) Use bundled services (Redis, MongoDB, RabbitMQ) - Recommended"
Write-Output "  2) Connect to external services"
Write-Output ""
$DEPLOYMENT_TYPE = Read-Host "Choice [1]"
if ([string]::IsNullOrWhiteSpace($DEPLOYMENT_TYPE)) {
    $DEPLOYMENT_TYPE = "1"
}

$USE_EXTERNAL = $false
if ($DEPLOYMENT_TYPE -eq "2") {
    $USE_EXTERNAL = $true
}

# Collect external service URLs if needed
if ($USE_EXTERNAL) {
    Write-Output ""
    Write-ColorOutput Green "Step 2: External Services Configuration"
    
    $AMQP_HOST = Read-Host "RabbitMQ URL (e.g., amqp://user:pass@host:5672)"
    while ([string]::IsNullOrWhiteSpace($AMQP_HOST)) {
        Write-ColorOutput Red "RabbitMQ URL cannot be empty"
        $AMQP_HOST = Read-Host "RabbitMQ URL"
    }
    
    $REDIS_URL = Read-Host "Redis URL (e.g., redis://host:6379)"
    while ([string]::IsNullOrWhiteSpace($REDIS_URL)) {
        Write-ColorOutput Red "Redis URL cannot be empty"
        $REDIS_URL = Read-Host "Redis URL"
    }
    
    $MONGODB_HOST = Read-Host "MongoDB URL (e.g., mongodb://host:27017)"
    while ([string]::IsNullOrWhiteSpace($MONGODB_HOST)) {
        Write-ColorOutput Red "MongoDB URL cannot be empty"
        $MONGODB_HOST = Read-Host "MongoDB URL"
    }
}

# Collect user account information
Write-Output ""
$stepNum = if ($USE_EXTERNAL) { "3" } else { "2" }
Write-ColorOutput Green "Step ${stepNum}: User Account Setup"

$USER_NAME = Read-Host "Enter admin username"
while ([string]::IsNullOrWhiteSpace($USER_NAME)) {
    Write-ColorOutput Red "Username cannot be empty"
    $USER_NAME = Read-Host "Enter admin username"
}

$USER_EMAIL = Read-Host "Enter admin email"
while ([string]::IsNullOrWhiteSpace($USER_EMAIL)) {
    Write-ColorOutput Red "Email cannot be empty"
    $USER_EMAIL = Read-Host "Enter admin email"
}

$USER_PASSWORD_SECURE = Read-Host "Enter admin password" -AsSecureString
$USER_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($USER_PASSWORD_SECURE)
)
while ([string]::IsNullOrWhiteSpace($USER_PASSWORD)) {
    Write-ColorOutput Red "Password cannot be empty"
    $USER_PASSWORD_SECURE = Read-Host "Enter admin password" -AsSecureString
    $USER_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($USER_PASSWORD_SECURE)
    )
}

$SELF_PROJECT_TITLE = Read-Host "Enter project title (default: My Logstyx Project)"
if ([string]::IsNullOrWhiteSpace($SELF_PROJECT_TITLE)) {
    $SELF_PROJECT_TITLE = "My Logstyx Project"
}

# Generate secrets
Write-Output ""
$stepNum = if ($USE_EXTERNAL) { "4" } else { "3" }
Write-ColorOutput Green "Step ${stepNum}: Generating Security Secrets"

$CRYPTO_SECRET = Generate-Secret -Length 32
$REFRESH_TOKEN_SECRET = Generate-Secret -Length 32
$USER_AUTHENTICATION_JWT_SECRET = Generate-Secret -Length 32

# Generate MASTER_KEY as 32-character string (32 bytes for AES-256)
$MASTER_KEY = Generate-Secret -Length 32

Write-ColorOutput Green "✓ Secrets generated"

# Encrypt all values
Write-Output ""
$stepNum = if ($USE_EXTERNAL) { "5" } else { "4" }
Write-ColorOutput Green "Step ${stepNum}: Encrypting Values"

$ENC_USER_NAME = Encrypt-Value -Value $USER_NAME -MasterKey $MASTER_KEY
$ENC_USER_EMAIL = Encrypt-Value -Value $USER_EMAIL -MasterKey $MASTER_KEY
$ENC_USER_PASSWORD = Encrypt-Value -Value $USER_PASSWORD -MasterKey $MASTER_KEY
$ENC_SELF_PROJECT_TITLE = Encrypt-Value -Value $SELF_PROJECT_TITLE -MasterKey $MASTER_KEY
$ENC_CRYPTO_SECRET = Encrypt-Value -Value $CRYPTO_SECRET -MasterKey $MASTER_KEY
$ENC_REFRESH_TOKEN_SECRET = Encrypt-Value -Value $REFRESH_TOKEN_SECRET -MasterKey $MASTER_KEY
$ENC_USER_AUTHENTICATION_JWT_SECRET = Encrypt-Value -Value $USER_AUTHENTICATION_JWT_SECRET -MasterKey $MASTER_KEY

# Create .env.encrypted file
$OUTPUT_FILE = ".env.encrypted"
$envContent = @"
ENC_USER_NAME=$ENC_USER_NAME
ENC_USER_EMAIL=$ENC_USER_EMAIL
ENC_USER_PASSWORD=$ENC_USER_PASSWORD
ENC_SELF_PROJECT_TITLE=$ENC_SELF_PROJECT_TITLE
ENC_CRYPTO_SECRET=$ENC_CRYPTO_SECRET
ENC_REFRESH_TOKEN_SECRET=$ENC_REFRESH_TOKEN_SECRET
ENC_USER_AUTHENTICATION_JWT_SECRET=$ENC_USER_AUTHENTICATION_JWT_SECRET
MASTER_KEY=$MASTER_KEY
"@

# Add external service URLs if provided
if ($USE_EXTERNAL) {
    $ENC_AMQP_HOST = Encrypt-Value -Value $AMQP_HOST -MasterKeyHex $MASTER_KEY
    $ENC_REDIS_URL = Encrypt-Value -Value $REDIS_URL -MasterKeyHex $MASTER_KEY
    $ENC_MONGODB_HOST = Encrypt-Value -Value $MONGODB_HOST -MasterKeyHex $MASTER_KEY
    
    $envContent += @"

ENC_AMQP_HOST=$ENC_AMQP_HOST
ENC_REDIS_URL=$ENC_REDIS_URL
ENC_MONGODB_HOST=$ENC_MONGODB_HOST
"@
}

$envContent | Out-File -FilePath $OUTPUT_FILE -Encoding UTF8 -NoNewline

Write-Output ""
Write-ColorOutput Green "✓ Encrypted .env written to $OUTPUT_FILE"
Write-ColorOutput Yellow "⚠ Keep your MASTER_KEY safe! You'll need it to decrypt the values."

# Display summary
Write-Output ""
Write-ColorOutput Green "=== Summary ==="
if ($USE_EXTERNAL) {
    Write-Output "Deployment: External Services"
    Write-Output "RabbitMQ: $AMQP_HOST"
    Write-Output "Redis: $REDIS_URL"
    Write-Output "MongoDB: $MONGODB_HOST"
} else {
    Write-Output "Deployment: Bundled Services"
}
Write-Output "Admin Username: $USER_NAME"
Write-Output "Admin Email: $USER_EMAIL"
Write-Output "Project Title: $SELF_PROJECT_TITLE"
Write-Output "Output file: $OUTPUT_FILE"
Write-Output "Total encrypted variables: 7"
Write-ColorOutput Yellow "Remember to keep the MASTER_KEY secure and never commit it to version control!"
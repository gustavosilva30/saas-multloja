#!/bin/bash

# ============================================================
# Script de Configuração VPS - NexusERP
# Configura SSL + CORS para Vercel
# ============================================================

set -e

echo "=========================================="
echo "Configuração VPS - NexusERP"
echo "=========================================="

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funções
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Verificar se é root
if [ "$EUID" -ne 0 ]; then 
    print_error "Execute como root: sudo bash setup-vps.sh"
    exit 1
fi

# ============================================================
# 1. INSTALAR DEPENDÊNCIAS
# ============================================================

echo ""
echo "1. Instalando dependências..."
apt update
apt install -y curl wget nginx certbot python3-certbot-nginx ufw docker.io docker-compose

print_status "Dependências instaladas"

# ============================================================
# 2. CONFIGURAR FIREWALL
# ============================================================

echo ""
echo "2. Configurando firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 8000/tcp # Supabase (interno)
ufw --force enable

print_status "Firewall configurado"

# ============================================================
# 3. OBTER INFORMAÇÕES DO USUÁRIO
# ============================================================

echo ""
echo "3. Configuração do domínio"
echo "========================"
echo ""
echo "Você tem 2 opções:"
echo "  1) Usar Cloudflare Tunnel (recomendado - gratuito e fácil)"
echo "  2) Configurar domínio próprio com Let's Encrypt"
echo ""
read -p "Escolha (1 ou 2): " choice

if [ "$choice" == "1" ]; then
    # ============================================================
    # OPÇÃO 1: CLOUDFLARE TUNNEL
    # ============================================================
    
    echo ""
    echo "Configurando Cloudflare Tunnel..."
    echo "================================="
    
    # Instalar cloudflared
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    dpkg -i cloudflared-linux-amd64.deb
    rm cloudflared-linux-amd64.deb
    
    print_status "Cloudflared instalado"
    
    echo ""
    echo "Agora você precisa:"
    echo "1. Executar: cloudflared tunnel login"
    echo "2. Abrir o link no navegador e autorizar"
    echo "3. Criar o túnel: cloudflared tunnel create nexus-erp"
    echo "4. Configurar DNS: cloudflared tunnel route dns nexus-erp api.seudominio.com"
    echo ""
    echo "Guia completo em: docs/VPS_CORS_SETUP.md"
    
    read -p "Pressione ENTER quando quiser continuar..."
    
else
    # ============================================================
    # OPÇÃO 2: LET'S ENCRYPT
    # ============================================================
    
    echo ""
    read -p "Digite seu domínio (ex: api.seudominio.com): " domain
    
    # Configurar Nginx
    cat > /etc/nginx/sites-available/supabase <<EOF
server {
    listen 80;
    server_name $domain;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,X-Client-Info' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }
}
EOF
    
    ln -sf /etc/nginx/sites-available/supabase /etc/nginx/sites-enabled/
    nginx -t && systemctl restart nginx
    
    print_status "Nginx configurado"
    
    # Obter certificado SSL
    echo ""
    echo "Obtendo certificado SSL..."
    certbot --nginx -d $domain --non-interactive --agree-tos --email admin@$domain
    
    print_status "SSL configurado"
    
    # Auto-renewal
    systemctl enable certbot.timer
    
    echo ""
    echo "Seu Supabase está acessível em: https://$domain"
fi

# ============================================================
# 4. CONFIGURAR SUPABASE (se necessário)
# ============================================================

echo ""
echo "4. Verificando Supabase..."

if [ -f "/opt/supabase/docker-compose.yml" ]; then
    print_status "Supabase encontrado em /opt/supabase"
    
    cd /opt/supabase
    
    # Verificar se está rodando
    if docker ps | grep -q supabase; then
        print_status "Supabase já está rodando"
    else
        print_warning "Iniciando Supabase..."
        docker-compose up -d
        print_status "Supabase iniciado"
    fi
else
    print_warning "Supabase não encontrado em /opt/supabase"
    echo "Se precisar instalar o Supabase:"
    echo "git clone https://github.com/supabase/supabase /opt/supabase"
    echo "cd /opt/supabase/docker"
    echo "docker-compose up -d"
fi

# ============================================================
# 5. RESUMO
# ============================================================

echo ""
echo "=========================================="
echo "CONFIGURAÇÃO CONCLUÍDA!"
echo "=========================================="
echo ""

if [ "$choice" == "1" ]; then
    echo "Próximos passos:"
    echo "1. cloudflared tunnel login"
    echo "2. cloudflared tunnel create nexus-erp"
    echo "3. cloudflared tunnel route dns nexus-erp api.SEUDOMINIO.com"
    echo "4. Configure o arquivo ~/.cloudflared/config.yml"
    echo "5. cloudflared tunnel run nexus-erp"
    echo ""
    echo "Veja o guia completo: docs/VPS_CORS_SETUP.md"
else
    echo "Seu Supabase está acessível em: https://$domain"
    echo ""
    echo "Teste com:"
    echo "curl https://$domain/health"
fi

echo ""
echo "Configure na Vercel:"
echo "VITE_SUPABASE_URL=https://$(if [ "$choice" == "2" ]; then echo $domain; else echo 'api.seudominio.com'; fi)"
echo ""

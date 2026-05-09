# Configuração CORS - VPS + Vercel

Guia para configurar CORS no seu Supabase self-hosted na VPS para aceitar requisições da Vercel.

---

## 🎯 Problema

Seu Supabase na VPS provavelmente roda em HTTP, mas a Vercel roda em HTTPS. Browsers bloqueiam requisições "mixed content" (HTTPS → HTTP).

## ✅ Solução 1: Cloudflare Tunnel (Recomendada - Gratuita)

### 1. Instalar cloudflared na VPS

```bash
# Ubuntu/Debian
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Ou via snap
sudo snap install cloudflared
```

### 2. Autenticar

```bash
cloudflared tunnel login
# Vai gerar um link, abra no navegador e autorize
```

### 3. Criar túnel

```bash
cloudflared tunnel create nexus-erp
# Anote o ID do túnel (ex: 8e8f8e8f-8e8f-8e8f-8e8f-8e8f8e8f8e8f)
```

### 4. Configurar DNS

```bash
# Substituir pelo seu domínio
cloudflared tunnel route dns nexus-erp api.seudominio.com
```

### 5. Arquivo de configuração

Crie `~/.cloudflared/config.yml`:

```yaml
tunnel: SEU_TUNNEL_ID
credentials-file: /home/seu-user/.cloudflared/SEU_TUNNEL_ID.json

ingress:
  # Supabase API
  - hostname: api.seudominio.com
    service: http://localhost:8000
  
  # Supabase Auth
  - hostname: auth.seudominio.com
    service: http://localhost:9999
  
  # Supabase Storage
  - hostname: storage.seudominio.com
    service: http://localhost:5000
  
  # Default
  - service: http_status:404
```

### 6. Rodar o túnel

```bash
cloudflared tunnel run nexus-erp

# Ou como serviço
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### 7. Atualizar variáveis na Vercel

```
VITE_SUPABASE_URL=https://api.seudominio.com
VITE_SUPABASE_ANON_KEY=sua-chave
```

---

## 🔧 Solução 2: Nginx Reverse Proxy com SSL (Let's Encrypt)

### 1. Instalar Nginx e Certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Configurar Nginx

Crie `/etc/nginx/sites-available/supabase`:

```nginx
server {
    listen 80;
    server_name api.seudominio.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'https://seu-app.vercel.app' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-Client-Info' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

### 3. Ativar site

```bash
sudo ln -s /etc/nginx/sites-available/supabase /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Obter certificado SSL

```bash
sudo certbot --nginx -d api.seudominio.com
# Escolha: redirect HTTP to HTTPS
```

---

## 🔧 Solução 3: Configurar CORS no Supabase (Docker)

Se estiver usando Docker Compose, adicione no `docker-compose.yml`:

```yaml
services:
  kong:
    environment:
      - KONG_PLUGINS=request-transformer,cors
      - KONG_CORS_ORIGINS=https://seu-app.vercel.app
      - KONG_CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
      - KONG_CORS_HEADERS=Authorization,Content-Type,X-Client-Info
      - KONG_CORS_CREDENTIALS=true
```

Ou no `config.toml` do Supabase CLI:

```toml
[api]
extra_headers = [
  "Access-Control-Allow-Origin: https://seu-app.vercel.app",
  "Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers: Authorization,Content-Type,X-Client-Info",
  "Access-Control-Allow-Credentials: true"
]
```

---

## 🧪 Testar CORS

### Teste 1: Via curl

```bash
curl -I -X OPTIONS \
  -H "Origin: https://seu-app.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://api.seudominio.com/auth/v1/token
```

Deve retornar:
```
Access-Control-Allow-Origin: https://seu-app.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

### Teste 2: Via browser

Abra o Console do navegador na sua Vercel app e execute:

```javascript
fetch('https://api.seudominio.com/auth/v1/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'sua-anon-key'
  },
  body: JSON.stringify({
    email: 'test@test.com',
    password: 'test123'
  })
}).then(r => console.log(r.status))
```

---

## 🔐 Variáveis de Ambiente na Vercel

Configure no Dashboard da Vercel (Settings → Environment Variables):

```
VITE_SUPABASE_URL=https://api.seudominio.com
VITE_SUPABASE_ANON_KEY=sua-anon-key-do-supabase
GEMINI_API_KEY=sua-chave-gemini
```

Ou via CLI:

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

---

## 🚀 Checklist Final

- [ ] VPS acessível via HTTPS (Cloudflare ou Let's Encrypt)
- [ ] CORS configurado para aceitar `https://seu-app.vercel.app`
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Teste de login funcionando no browser
- [ ] Domínio personalizado configurado (opcional)

---

## 🆘 Troubleshooting

### Erro: "Mixed Content"
**Solução**: Seu Supabase está em HTTP. Use Cloudflare Tunnel ou Nginx + SSL.

### Erro: "CORS policy"
**Solução**: Verifique se os headers CORS estão sendo enviados pelo servidor.

### Erro: "Failed to fetch"
**Solução**: Verifique se o firewall da VPS permite portas 80/443.

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

---

**Recomendação**: Use **Cloudflare Tunnel** - é gratuito, fácil e dá SSL automaticamente!

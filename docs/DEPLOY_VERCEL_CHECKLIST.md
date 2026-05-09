# Checklist de Deploy na Vercel

Siga estes passos para deployar seu NexusERP na Vercel conectado ao Supabase na VPS.

---

## ✅ PASSO 1: Configurar Secrets no GitHub

Vá em: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

| Secret Name | Valor | Onde Encontrar |
|-------------|-------|----------------|
| `VERCEL_TOKEN` | Token da Vercel | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | ID da organização | `vercel teams list` ou no settings |
| `VERCEL_PROJECT_ID` | ID do projeto | Criar projeto primeiro na Vercel |
| `VITE_SUPABASE_URL` | URL do Supabase | `https://api.seudominio.com` |
| `VITE_SUPABASE_ANON_KEY` | Anon Key | Painel do Supabase local |
| `GEMINI_API_KEY` | API Key | Google AI Studio |

### Como pegar Vercel IDs:

```bash
# Instalar CLI
npm i -g vercel

# Login
vercel login

# Linkar projeto existente
vercel link

# Ver IDs
vercel project ls

# Ou olhe no arquivo gerado:
cat .vercel/project.json
```

---

## ✅ PASSO 2: Configurar Projeto na Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Add New..."** → **"Project"**
3. Importe do GitHub: `seu-usuario/nexus-erp`
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Em **Environment Variables**, adicione:
   ```
   VITE_SUPABASE_URL = https://api.seudominio.com
   VITE_SUPABASE_ANON_KEY = sua-anon-key
   GEMINI_API_KEY = sua-chave-gemini
   ```

6. Clique **Deploy**

---

## ✅ PASSO 3: Configurar CORS no Supabase (VPS)

Escolha UMA das opções:

### Opção A: Cloudflare Tunnel (Recomendado)

```bash
# Na VPS
cloudflared tunnel create nexus-erp
cloudflared tunnel route dns nexus-erp api.seudominio.com

# Configurar tunnel (veja VPS_CORS_SETUP.md)
cloudflared tunnel run nexus-erp
```

### Opção B: Nginx + Let's Encrypt

```bash
# Na VPS
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d api.seudominio.com
```

### Opção C: Kong CORS (se usar Docker)

No `docker-compose.yml` do Supabase, adicione ao Kong:
```yaml
environment:
  - KONG_PLUGINS=cors
  - KONG_CORS_ORIGINS=https://seu-app.vercel.app
```

---

## ✅ PASSO 4: Testar Conexão

### Teste 1: API acessível?

```bash
curl https://api.seudominio.com/health
# Deve retornar: {"status":"ok"}
```

### Teste 2: CORS funcionando?

```bash
curl -H "Origin: https://seu-app.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://api.seudominio.com/auth/v1/token

# Deve retornar headers CORS
```

### Teste 3: Login via browser

1. Abra sua URL da Vercel
2. Console do navegador → Network
3. Tente fazer login
4. Verifique se a requisição chegou na VPS:
   ```bash
   # Na VPS
   docker logs supabase-kong-1 --tail 50
   ```

---

## ✅ PASSO 5: Configurar Domínio Personalizado (Opcional)

Na Vercel:
1. Project Settings → Domains
2. Add Domain: `app.seudominio.com`
3. Siga as instruções de DNS

---

## 🚨 Troubleshooting

### "Failed to load resource: net::ERR_FAILED"
**Causa**: CORS não configurado ou HTTPS/HTTP misturado
**Solução**: Configure SSL na VPS (Cloudflare ou Let's Encrypt)

### "Invalid API key"
**Causa**: `VITE_SUPABASE_ANON_KEY` incorreta
**Solução**: Verifique no painel do Supabase local (JWT Secret)

### "Unable to connect"
**Causa**: Firewall bloqueando ou Supabase não rodando
**Solução**:
```bash
# Na VPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
docker ps  # verificar containers
```

### "Build failed"
**Causa**: Dependências faltando ou erro de sintaxe
**Solução**:
```bash
# Localmente
npm ci
npm run build
# Verifique erros
```

---

## 📁 Arquivos Criados

Verifique se estão no repositório:

```
✅ vercel.json          - Configuração do Vercel
✅ vite.config.ts       - Build com base: '/'
✅ .github/workflows/   - Deploy automático
✅ docs/VPS_CORS_SETUP.md   - Guia de CORS
✅ docs/DEPLOY_VERCEL_CHECKLIST.md  - Este arquivo
```

---

## 🚀 Deploy Manual (sem GitHub Actions)

Se preferir não usar GitHub Actions:

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy para preview
vercel

# Deploy para produção
vercel --prod
```

---

## ✅ Checklist Final

Antes de considerar "pronto":

- [ ] Secrets configurados no GitHub
- [ ] Projeto criado na Vercel
- [ ] Variáveis de ambiente na Vercel
- [ ] CORS configurado na VPS
- [ ] HTTPS funcionando na VPS
- [ ] Teste de login funcionando
- [ ] Build passando sem erros
- [ ] Deploy automático funcionando (push na main)

---

**Próximo passo**: Commit e push destes arquivos para o GitHub!

```bash
git add vercel.json vite.config.ts .github/workflows/ docs/
git commit -m "Configuração deploy Vercel + VPS"
git push origin main
```

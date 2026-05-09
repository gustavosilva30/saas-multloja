# 🚀 DEPLOY AGORA - Instruções Rápidas

## ✅ PASSO 1: Commit no GitHub (Faça AGORA)

```bash
# No seu terminal local
git add vercel.json vite.config.ts .github/workflows/ scripts/ docs/ .env.example
git commit -m "Config: Deploy Vercel + VPS - CORS, SSL, CI/CD"
git push origin main
```

---

## ✅ PASSO 2: Na VPS (SSH na VPS)

```bash
# 1. Copiar script (no seu computador local)
scp scripts/setup-vps.sh root@SEU_IP_VPS:/root/

# 2. Conectar na VPS
ssh root@SEU_IP_VPS

# 3. Executar
bash /root/setup-vps.sh

# 4. Escolha:
#    [1] Cloudflare Tunnel (recomendado - grátis)
#    [2] Let's Encrypt (se tem domínio próprio)
```

### Se escolheu Cloudflare (1):
```bash
cloudflared tunnel login
# Abra o link no navegador

cloudflared tunnel create nexus-erp

cloudflared tunnel route dns nexus-erp api.SEUDOMINIO.com

# Editar config
cat > ~/.cloudflared/config.yml <<'EOF'
tunnel: SEU_TUNNEL_ID
credentials-file: /root/.cloudflared/SEU_TUNNEL_ID.json
ingress:
  - hostname: api.SEUDOMINIO.com
    service: http://localhost:8000
  - service: http_status:404
EOF

# Rodar
cloudflared tunnel run nexus-erp
```

---

## ✅ PASSO 3: No GitHub (Settings)

Vá em: `github.com/seu-usuario/nexus-erp` → **Settings** → **Secrets** → **Actions** → **New repository secret**

Adicione:

| Nome | Valor | Como pegar |
|------|-------|------------|
| `VERCEL_TOKEN` | Token | [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create |
| `VERCEL_ORG_ID` | ID org | `vercel teams list` (copie o ID) |
| `VERCEL_PROJECT_ID` | ID projeto | Criar projeto na Vercel primeiro, depois `vercel project list` |
| `VITE_SUPABASE_URL` | URL | `https://api.SEUDOMINIO.com` (sua VPS) |
| `VITE_SUPABASE_ANON_KEY` | Anon Key | Painel Supabase na VPS → Settings → API |
| `GEMINI_API_KEY` | API Key | [makersuite.google.com](https://makersuite.google.com) → Get API Key |

---

## ✅ PASSO 4: Na Vercel (Dashboard)

1. Acesse: [vercel.com/new](https://vercel.com/new)
2. Importe seu repositório GitHub
3. Framework: **Vite**
4. Adicione as mesmas Environment Variables do passo 3
5. Clique **Deploy**

---

## ✅ PASSO 5: Testar

```bash
# Testar API da VPS
curl https://api.SEUDOMINIO.com/health

# Deve retornar: {"status":"ok"}
```

Abra seu app na Vercel e teste o **login**.

---

## 🆘 Erros Comuns

### "CORS error"
→ Não configurou HTTPS na VPS. Use Cloudflare Tunnel (passo 2, opção 1)

### "Cannot find module"
→ `npm install` não rodou. Verifique se `vercel.json` está no commit

### "Failed to build"
→ Rode localmente: `npm run build` para ver o erro

### "Invalid API key"
→ `VITE_SUPABASE_ANON_KEY` incorreta. Pegue no painel do Supabase na VPS

---

## 📚 Documentação Completa

- **Configuração CORS/VPS**: `docs/VPS_CORS_SETUP.md`
- **Checklist completo**: `docs/DEPLOY_VERCEL_CHECKLIST.md`
- **Resumo**: `docs/DEPLOY_SUMMARY.md`

---

## ⏱️ Tempo Estimado

| Passo | Tempo |
|-------|-------|
| Commit GitHub | 1 min |
| Configurar VPS | 10-15 min |
| Secrets GitHub | 5 min |
| Deploy Vercel | 3 min |
| Testes | 5 min |
| **Total** | **~25 min** |

---

## 🎯 Depois que Funcionar

1. **Domínio personalizado**: Vercel → Project Settings → Domains
2. **Analytics**: Vercel → Analytics (grátis)
3. **Monitoramento**: UptimeRobot (grátis) para pingar sua VPS

---

**Pronto! Comece pelo PASSO 1 agora! 🚀**

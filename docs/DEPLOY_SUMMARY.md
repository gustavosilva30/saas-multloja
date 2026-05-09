# Resumo do Deploy - NexusERP

Arquitetura: **Vercel (Frontend) + VPS (Supabase)**

---

## 📁 Arquivos Criados

### 1. ✅ Configuração Vercel
| Arquivo | Propósito |
|---------|-----------|
| `vercel.json` | Configuração de build, SPA routing, headers de segurança |
| `vite.config.ts` | Atualizado com `base: '/'` e `build.outDir: 'dist'` |

### 2. ✅ GitHub Actions (Deploy Automático)
| Arquivo | Propósito |
|---------|-----------|
| `.github/workflows/deploy-vercel.yml` | Deploy em PR e push para main |
| `.github/workflows/deploy-vercel-prod.yml` | Deploy produção via Vercel CLI |

### 3. ✅ Documentação
| Arquivo | Propósito |
|---------|-----------|
| `docs/VPS_CORS_SETUP.md` | Guia completo de CORS (Cloudflare, Nginx, Kong) |
| `docs/DEPLOY_VERCEL_CHECKLIST.md` | Checklist passo-a-passo |
| `docs/DEPLOY_SUMMARY.md` | Este arquivo - resumo |

### 4. ✅ Scripts
| Arquivo | Propósito |
|---------|-----------|
| `scripts/setup-vps.sh` | Script automatizado para configurar VPS |
| `.env.example` | Atualizado com configurações do VPS |

---

## 🚀 Passos para Deploy

### NA VPS (Ubuntu/Debian):

```bash
# 1. Copiar script para VPS
scp scripts/setup-vps.sh root@SEU_IP_VPS:/root/

# 2. Conectar na VPS
ssh root@SEU_IP_VPS

# 3. Executar script
chmod +x setup-vps.sh
bash setup-vps.sh

# 4. Seguir instruções (Cloudflare ou Let's Encrypt)
```

### NO GITHUB:

1. Vá em **Settings** → **Secrets and variables** → **Actions**
2. Adicione os secrets:
   - `VERCEL_TOKEN` - [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - `VERCEL_ORG_ID` - `vercel teams list`
   - `VERCEL_PROJECT_ID` - `vercel project list`
   - `VITE_SUPABASE_URL` - `https://api.seudominio.com`
   - `VITE_SUPABASE_ANON_KEY` - do seu Supabase local
   - `GEMINI_API_KEY` - do Google AI Studio

### NA VERCEL:

1. Importe seu repositório GitHub
2. Configure as mesmas variáveis de ambiente
3. Deploy!

---

## 🔧 Comandos Úteis

### Desenvolvimento Local
```bash
npm run dev        # Iniciar dev server
npm run build      # Build para produção
npm run preview    # Preview do build
```

### Deploy
```bash
# Deploy automático (via GitHub Actions)
git push origin main

# Deploy manual (via CLI)
npm i -g vercel
vercel login
vercel --prod
```

### VPS
```bash
# Ver logs do Supabase
docker logs supabase-kong-1 --tail 100

# Restart Supabase
cd /opt/supabase && docker-compose restart

# Ver status
docker ps

# Testar API
curl https://api.seudominio.com/health
```

---

## 🌐 URLs Esperadas

| Ambiente | URL |
|----------|-----|
| Frontend (Vercel) | `https://nexus-erp.vercel.app` ou `https://app.seudominio.com` |
| Supabase API | `https://api.seudominio.com` |
| Supabase Auth | `https://api.seudominio.com/auth/v1` |
| Supabase Storage | `https://api.seudominio.com/storage/v1` |

---

## 🐛 Troubleshooting Rápido

### Erro CORS
```bash
# Verificar headers
curl -I -H "Origin: https://seu-app.vercel.app" https://api.seudominio.com/auth/v1/token

# Deve mostrar:
# Access-Control-Allow-Origin: https://seu-app.vercel.app
```

### Erro HTTPS
```bash
# Verificar certificado
openssl s_client -connect api.seudominio.com:443 -servername api.seudominio.com
```

### Erro Build
```bash
# Local
rm -rf node_modules dist
npm ci
npm run build
```

---

## 📊 Monitoramento

### Vercel
- Dashboard: [vercel.com/dashboard](https://vercel.com/dashboard)
- Analytics incluído
- Logs em tempo real

### VPS
```bash
# Monitorar recursos
htop
docker stats

# Logs
docker-compose logs -f

# Disco
df -h
```

---

## 🔐 Segurança Checklist

- [ ] HTTPS forçado na Vercel
- [ ] HTTPS na VPS (SSL configurado)
- [ ] CORS restrito (não use `*` em produção)
- [ ] Secrets no GitHub (nunca commitar .env)
- [ ] RLS ativado no Supabase
- [ ] Firewall UFW ativo
- [ ] Senhas fortes no Supabase

---

## 💰 Custo Estimado

| Serviço | Custo Mensal |
|---------|--------------|
| Vercel (Hobby) | Grátis |
| VPS (2vCPU/4GB) | $5-10 |
| Domínio | $10/ano |
| **Total** | **~$5-10/mês** |

---

## 📞 Próximos Passos

1. **Commit e push**:
   ```bash
   git add .
   git commit -m "Configuração deploy Vercel + VPS"
   git push origin main
   ```

2. **Configurar VPS** (executar script na VPS)

3. **Configurar Secrets** no GitHub

4. **Criar projeto** na Vercel

5. **Testar** login e funcionalidades

---

**Sucesso! 🎉**

Seu NexusERP está pronto para rodar em produção!

# 🗄️ Scripts SQL do NexusERP

Esta pasta contém todos os scripts SQL necessários para configurar o banco de dados PostgreSQL/Supabase do NexusERP.

---

## 📋 Ordem de Execução

Execute os scripts **NA ORDEM** numerada abaixo no SQL Editor do Supabase:

| Ordem | Arquivo | Descrição | Tempo Est. |
|-------|---------|-----------|------------|
| 1️⃣ | `01_schema_tables.sql` | Cria todas as tabelas e índices | ~10s |
| 2️⃣ | `02_auth_hooks.sql` | Configura hooks de autenticação JWT | ~5s |
| 3️⃣ | `03_rls_policies.sql` | Ativa RLS e cria políticas de segurança | ~15s |
| 4️⃣ | `04_triggers.sql` | Cria triggers automáticos | ~5s |
| 5️⃣ | `05_audit_system.sql` | Sistema de auditoria (logs imutáveis) | ~10s |
| 6️⃣ | `06_seed_data.sql` | Dados de exemplo (opcional) | ~5s |

---

## 🚀 Como Executar

### Método 1: SQL Editor do Supabase (Recomendado)

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.io)
2. Vá em **SQL Editor** → **New query**
3. Cole o conteúdo do arquivo `01_schema_tables.sql`
4. Clique em **Run** ▶️
5. Repita para cada arquivo na ordem

### Método 2: Arquivo Único (Rodar Tudo de Uma Vez)

Se preferir, use o arquivo `99_all_in_one.sql` (se existir) ou concatene os arquivos:

```bash
# Linux/Mac
cat 01_schema_tables.sql 02_auth_hooks.sql 03_rls_policies.sql 04_triggers.sql 05_audit_system.sql > 99_all_in_one.sql

# Depois cole o conteúdo de 99_all_in_one.sql no SQL Editor
```

### Método 3: CLI do Supabase

```bash
# Instalar CLI do Supabase
npm install -g supabase

# Login
supabase login

# Linkar projeto
supabase link --project-ref SEU_PROJECT_REF

# Executar migration
supabase db push
```

---

## ⚙️ Configuração Adicional Necessária

Após executar os scripts SQL, configure no Dashboard:

### 1. Auth Hook (Importante!)

1. Vá em **Authentication** → **Hooks**
2. Ative **"Custom Access Token Hook"**
3. Selecione a função: `public.custom_access_token_hook`
4. Salve

> ⚠️ **Nota:** Esta funcionalidade requer plano Pro/Team/Enterprise no Supabase. Para projetos gratuitos, use a alternativa client-side documentada em `02_auth_hooks.sql`.

### 2. URL de Redirecionamento

Configure as URLs de redirecionamento em **Authentication** → **URL Configuration**:

```
http://localhost:5173/**
https://seu-dominio.com/**
```

### 3. Provedores de Auth (Opcional)

Em **Authentication** → **Providers**, ative:
- ✅ Email
- Google (opcional)
- Outros conforme necessidade

---

## 🧪 Testar a Instalação

Após executar todos os scripts, teste com:

```sql
-- 1. Verificar se tabelas foram criadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 2. Verificar se RLS está ativo
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- 3. Verificar políticas criadas
SELECT tablename, policyname, permissive FROM pg_policies WHERE schemaname = 'public';

-- 4. Testar funções
SELECT public.get_current_tenant_id();
SELECT public.get_current_user_role();
```

---

## 📊 Estrutura do Banco

```
┌─────────────────────────────────────────────────────────────┐
│                      public.tenants                         │
│                   (Empresas/Lojas)                          │
├─────────────────────────────────────────────────────────────┤
│  id, name, document, phone, email, niche, is_active         │
└──────────────────┬──────────────────────────────────────────┘
                   │
       ┌───────────┼───────────┬───────────────┐
       │           │           │               │
       ▼           ▼           ▼               ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│ user_    │ │ products │ │ customers│ │financial_    │
│profiles  │ │          │ │          │ │transactions  │
├──────────┤ ├──────────┤ ├──────────┤ ├──────────────┤
│id        │ │id        │ │id        │ │id            │
│tenant_id │ │tenant_id │ │tenant_id │ │tenant_id     │
│role      │ │sku, name │ │name      │ │type, amount  │
│email     │ │price     │ │document  │ │status        │
└──────────┘ └──────────┘ └──────────┘ └──────────────┘
       │           │           │               │
       │           │           │               │
       └───────────┴───────────┴───────────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │   public.sales      │
               │   (Vendas)          │
               ├─────────────────────┤
               │ id, tenant_id       │
               │ customer_id         │
               │ user_id (vendedor)  │
               │ total, status       │
               └─────────────────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │ public.sale_items   │
               │ (Itens da Venda)    │
               └─────────────────────┘
```

---

## 📝 Arquivos e Propósito

### `01_schema_tables.sql`
- Cria todas as tabelas do sistema
- Define índices para performance
- Constraints e relacionamentos

### `02_auth_hooks.sql`
- Hook JWT para injetar `tenant_id` e `user_role`
- Funções auxiliares para obter dados do contexto

### `03_rls_policies.sql`
- Ativa Row Level Security em todas as tabelas
- Políticas de isolamento por tenant
- Controle de acesso baseado em roles

### `04_triggers.sql`
- Atualização automática de `updated_at`
- Atualização de saldo bancário
- Controle de estoque

### `05_audit_system.sql`
- Tabela de logs imutáveis
- Triggers de auditoria automática
- Funções para consultar histórico

### `06_seed_data.sql`
- Dados de exemplo para desenvolvimento
- Tenant, produtos, clientes de teste

---

## 🔧 Troubleshooting

### Erro: "permission denied for schema public"

**Solução:** Execute como usuário admin ou service role.

### Erro: "function does not exist" ao testar hooks

**Solução:** Verifique se executou `02_auth_hooks.sql` e se configurou o hook no Dashboard.

### Erro: "row violates row-level security policy"

**Solução:** Normal - acontece quando não há JWT válido. Teste com usuário autenticado.

### Erro: "cannot insert into view"

**Solução:** Verifique se está tentando inserir na tabela correta, não em uma view.

---

## 🔄 Atualizações Futuras

Para adicionar novas tabelas ou alterar o schema:

1. Crie um novo arquivo: `07_migration_nome.sql`
2. Use `ALTER TABLE` para modificações
3. Documente as mudanças neste README
4. Teste em ambiente de staging primeiro

---

## 📚 Recursos Adicionais

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [JWT Claims](https://supabase.com/docs/guides/auth/jwt)

---

## ✅ Checklist Pós-Instalação

- [ ] Executar `01_schema_tables.sql`
- [ ] Executar `02_auth_hooks.sql`
- [ ] Configurar Auth Hook no Dashboard
- [ ] Executar `03_rls_policies.sql`
- [ ] Executar `04_triggers.sql`
- [ ] Executar `05_audit_system.sql`
- [ ] (Opcional) Executar `06_seed_data.sql`
- [ ] Testar conexão com aplicação
- [ ] Verificar se RLS está funcionando
- [ ] Configurar políticas de backup

---

**Última atualização:** 2024
**Versão do Schema:** 1.0

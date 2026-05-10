# Scripts SQL — PostgreSQL

Esta pasta contém todos os scripts SQL para configurar o banco de dados PostgreSQL do sistema.

## Ordem de execução

Execute os scripts **NA ORDEM** via `psql` ou qualquer cliente PostgreSQL (DBeaver, pgAdmin, etc.):

| Arquivo | Descrição |
|---|---|
| `01_schema_tables.sql` | Tabelas principais (tenants, users, products, sales…) |
| `04_triggers.sql` | Triggers de updated_at e controle de estoque |
| `05_audit_system.sql` | Sistema de auditoria (audit_logs) |
| `06_seed_data.sql` | Dados iniciais (categorias, unidades) |
| `07_superadmin.sql` | Usuário superadmin |
| `08_asaas.sql` | Integração gateway de pagamento |
| `09_module_catalog.sql` | Catálogo de módulos do sistema |

> `99_all_in_one.sql` — tudo concatenado para execução única.

## Como executar

```bash
# Tudo de uma vez
psql -h localhost -U postgres -d nome_do_banco -f database/99_all_in_one.sql

# Ou arquivo por arquivo
psql -h localhost -U postgres -d nome_do_banco -f database/01_schema_tables.sql
psql -h localhost -U postgres -d nome_do_banco -f database/04_triggers.sql
# ...
```

## Migration obrigatória — Imagens de Produtos

Para habilitar múltiplas imagens por produto, execute no banco de produção:

```bash
psql -h localhost -U postgres -d nome_do_banco -f backend/database/init/02_product_images.sql
```

Ou cole o conteúdo de `backend/database/init/02_product_images.sql` no seu cliente SQL.

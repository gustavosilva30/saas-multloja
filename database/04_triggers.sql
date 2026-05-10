-- ============================================================================
-- NEXUSERP - 04: TRIGGERS E FUNÇÕES AUXILIARES
-- ============================================================================
-- Execute este arquivo QUARTO no PostgreSQL
-- Cria triggers para updated_at automático
-- ============================================================================

-- ============================================================================
-- 1. TRIGGER: Atualizar updated_at automaticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em todas as tabelas que têm updated_at
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. TRIGGER: Atualizar saldo da conta bancária após movimentação
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_bank_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.bank_account_id IS NOT NULL THEN
        UPDATE public.bank_accounts
        SET current_balance = current_balance + CASE 
            WHEN NEW.type = 'in' THEN NEW.amount 
            ELSE -NEW.amount 
        END
        WHERE id = NEW.bank_account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cash_movement_update_balance
  AFTER INSERT ON public.cash_movements
  FOR EACH ROW EXECUTE FUNCTION public.update_bank_account_balance();

-- ============================================================================
-- 3. TRIGGER: Atualizar estoque após venda
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_product_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- Diminuir estoque quando item de venda é criado
    UPDATE public.products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sale_item_update_stock
  AFTER INSERT ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.update_product_stock_on_sale();

-- ============================================================================
-- 4. TRIGGER: Registrar último login do usuário
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles
    SET last_login_at = NOW()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger na tabela auth.sessions (se tiver acesso)
-- Ou chamar manualmente após login bem-sucedido

-- ============================================================================
-- 5. TRIGGER: Limpar jobs antigos automaticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_jobs()
RETURNS TRIGGER AS $$
BEGIN
    -- Deletar jobs completados com mais de 7 dias
    DELETE FROM public.background_jobs
    WHERE status IN ('completed', 'failed')
      AND created_at < NOW() - INTERVAL '7 days';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Executar periodicamente (via cron ou pg_cron)
-- CREATE TRIGGER cleanup_jobs_trigger
--   AFTER INSERT ON public.background_jobs
--   FOR EACH STATEMENT EXECUTE FUNCTION public.cleanup_old_jobs();

-- ============================================================================
-- FIM DO ARQUIVO 04_triggers.sql
-- ============================================================================

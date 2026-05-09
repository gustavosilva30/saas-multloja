-- ============================================================================
-- NEXUSERP - 02: AUTH HOOKS (JWT Claims)
-- ============================================================================
-- Execute este arquivo SEGUNDO no Supabase SQL Editor
-- Configura os hooks de autenticação para injetar tenant_id e user_role no JWT
-- ============================================================================

-- ============================================================================
-- HOOK: Custom Access Token - Injetar tenant_id e user_role no JWT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claims jsonb;
    user_role public.user_profiles.role%TYPE;
    user_tenant_id public.user_profiles.tenant_id%TYPE;
BEGIN
    -- Busca a role e o tenant do usuário
    SELECT role, tenant_id INTO user_role, user_tenant_id
    FROM public.user_profiles
    WHERE id = (event->>'user_id')::uuid;

    claims := event->'claims';

    -- Se o perfil existir, injeta as claims no app_metadata do JWT
    IF user_role IS NOT NULL THEN
        claims := jsonb_set(claims, '{app_metadata, tenant_id}', to_jsonb(user_tenant_id));
        claims := jsonb_set(claims, '{app_metadata, user_role}', to_jsonb(user_role));
    ELSE
        -- Usuário sem perfil - define como viewer sem tenant
        claims := jsonb_set(claims, '{app_metadata, tenant_id}', 'null'::jsonb);
        claims := jsonb_set(claims, '{app_metadata, user_role}', '"viewer"'::jsonb);
    END IF;

    -- Atualiza o evento de retorno
    event := jsonb_set(event, '{claims}', claims);
    
    RETURN event;
END;
$$;

-- ============================================================================
-- CONFIGURAÇÃO NO SUPABASE DASHBOARD:
-- ============================================================================
-- 
-- 1. Acesse: https://app.supabase.io/project/_/auth/hooks
-- 2. Ative o hook "Custom Access Token Hook"
-- 3. Selecione a função: public.custom_access_token_hook
-- 4. Salve as configurações
--
-- IMPORTANTE: O hook só funciona em projetos Supabase pagos (Pro/Team/Enterprise)
-- Para projetos gratuitos, use o método alternativo abaixo:
--
-- ============================================================================

-- ============================================================================
-- ALTERNATIVA PARA PROJETOS GRATUITOS (Client-side metadata refresh)
-- ============================================================================
-- Função para atualizar metadata do usuário (chamar após login)

CREATE OR REPLACE FUNCTION public.refresh_user_metadata()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_id uuid;
    user_record public.user_profiles%ROWTYPE;
    metadata jsonb;
BEGIN
    user_id := auth.uid();
    
    SELECT * INTO user_record
    FROM public.user_profiles
    WHERE id = user_id;
    
    IF user_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'error', 'User profile not found'
        );
    END IF;
    
    -- Retorna os dados que devem ser armazenados no client-side
    metadata := jsonb_build_object(
        'tenant_id', user_record.tenant_id,
        'user_role', user_record.role,
        'tenant_name', (SELECT name FROM public.tenants WHERE id = user_record.tenant_id)
    );
    
    RETURN metadata;
END;
$$;

-- Função utilitária para obter tenant_id do JWT
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função utilitária para obter role do JWT
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'user_role')::text;
EXCEPTION
  WHEN OTHERS THEN RETURN 'viewer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIM DO ARQUIVO 02_auth_hooks.sql
-- ============================================================================

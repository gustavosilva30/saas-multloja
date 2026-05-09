# Boilerplate RBAC (Role-Based Access Control) - Next.js + Supabase

Este documento detalha a implementação de um sistema de permissões baseado em funções (RBAC) com isolamento por `tenant_id`, utilizando **Supabase Auth** e **Next.js**.

---

## 1. Injeção de `tenant_id` e `user_role` no JWT do Supabase

Para garantir segurança e performance, é recomendado injetar o `tenant_id` e a role (`admin`, `user`) diretamente no JWT do usuário. O Supabase permite isso utilizando seu recurso de **Auth Hooks** (Custom Access Token Hook).

### Configuração no Supabase (SQL)

Primeiro, garanta que você tem tabelas para o Tenant e os Perfis de Usuário:

```sql
-- Criação das tabelas base
CREATE TABLE public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'user', 'manager')) NOT NULL DEFAULT 'user'
);
```

Em seguida, crie um **Custom Access Token Hook** no PostgreSQL para injetar os dados no JWT durante o login:

```sql
-- Função de Hook para injetar claims personalizados no JWT
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
        claims := jsonb_set(claims, '{app_metadata, tenant_id}', 'null'::jsonb);
        claims := jsonb_set(claims, '{app_metadata, user_role}', '"user"'::jsonb);
    END IF;

    -- Atualiza o evento de retorno
    event := jsonb_set(event, '{claims}', claims);
    
    RETURN event;
END;
$$;

-- No painel do Supabase, você precisará habilitar o "Custom Access Token (JWT) Hook"
-- e apontar para esta função: `public.custom_access_token_hook`
```

---

## 2. Middleware no Next.js (Proteção de Rotas)

Utilizando a nova estrutura do Next.js (App Router) e a biblioteca `@supabase/ssr`, podemos validar o JWT na borda (Edge) sem precisar bater no banco de dados.

**Arquivo:** `middleware.ts` (na raiz do projeto ou na pasta `src/`)

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Obtém o usuário validando a sessão
  const { data: { user } } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login');
  
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Extrai as claims que foram injetadas pelo nosso Hook SQL
  const appMetadata = user?.app_metadata || {};
  const userRole = appMetadata.user_role; // 'admin' ou 'user'

  // Proteção da Rota /admin e /financeiro
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/financeiro');

  if (isAdminRoute && userRole !== 'admin') {
    // Redireciona usuários sem permissão para o dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Intercepta todas as requisições, exceto:
     * - Arquivos estáticos e de build (_next/static, _next/image, favicon.ico)
     * - Rotas de API públicas caso existam
     */
    '/((?!_next/static|_next/image|favicon.ico|api/public/.*).*)',
  ],
};
```

---

## 3. Políticas de Segurança em Nível de Linha (RLS)

Com o `tenant_id` disponível no JWT (através da claim `app_metadata.tenant_id`), podemos escrever políticas do Postgres incrivelmente rápidas. Nenhuma requisição SQL precisará fazer JOIN com outras tabelas de permissões para saber qual é a empresa atual.

### Exemplo: Tabela "Vendas" (`sales`)

```sql
-- Habilita o RLS na tabela
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- POLICY: Leitura (SELECT)
-- O usuário só pode ver as vendas que possuírem o mesmo tenant_id que o seu token JWT
CREATE POLICY "Usuários veem apenas vendas de suas empresas" 
ON public.sales FOR SELECT 
USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);

-- POLICY: Inserção (INSERT)
-- O usuário só pode inserir uma venda se ele fornecer o tenant_id correto dele mesmo
CREATE POLICY "Usuários podem inserir vendas em sua empresa" 
ON public.sales FOR INSERT 
WITH CHECK (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);

-- POLICY: Atualização (UPDATE)
-- Somente administradores (admin) podem alterar dados de vendas de seu próprio tenant
CREATE POLICY "Apenas admin atualiza vendas" 
ON public.sales FOR UPDATE 
USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'admin'
);

-- POLICY: Exclusão (DELETE)
-- Assim como o UPDATE, restrinja permissões destrutivas apenas a admins
CREATE POLICY "Apenas admin deleta vendas" 
ON public.sales FOR DELETE 
USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'admin'
);
```

### Vantagens desta Arquitetura

1. **Performance Absoluta:** O RLS verifica o JSON do JWT nativamente em C, e o middleware roda na borda (Edge).
2. **Segurança Multitenant Implacável:** Mesmo se houver uma falha onde um desenvolvedor esqueça de enviar a cláusula `WHERE tenant_id = X` em uma API no Next.js (Supabase Client Authenticated), o Postgres bloqueará nativamente o vazamento via RLS.
3. **Escalável:** Não há consultas (JOINs) encadeadas na verificação de permissões do usuário em cada tela do frontend.

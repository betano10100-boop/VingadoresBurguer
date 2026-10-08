-- Vingadores Burguer · Supabase/PostgreSQL · rode no SQL Editor
create table categorias(id bigint generated always as identity primary key,nome text not null unique,ordem int not null default 0,intro text);
create table produtos(id bigint generated always as identity primary key,categoria_id bigint references categorias on delete set null,nome text not null,descricao text,preco numeric(10,2) not null check(preco>=0),imagem text,disponivel boolean not null default true,criado_em timestamptz not null default now());
create table clientes(id bigint generated always as identity primary key,nome text not null,email text,telefone text not null unique,criado_em timestamptz not null default now());
create table enderecos(id bigint generated always as identity primary key,cliente_id bigint not null references clientes on delete cascade,endereco text not null,numero text,bairro text,complemento text,cidade text default 'Rio de Janeiro',cep text);
create table cupons(id bigint generated always as identity primary key,codigo text unique not null,tipo text check(tipo in('PERCENTUAL','VALOR')),valor numeric(10,2) not null,ativo boolean default true,validade date);
create table pedidos(id bigint generated always as identity primary key,cliente_id bigint references clientes,endereco_id bigint references enderecos,cupom_id bigint references cupons,subtotal numeric(10,2) not null,taxa_entrega numeric(10,2) not null default 0,desconto numeric(10,2) not null default 0,total numeric(10,2) not null,
  forma_pagamento text not null check(forma_pagamento in('PIX','CARTAO_CREDITO','CARTAO_DEBITO','DINHEIRO')),
  status_pagamento text not null default 'PENDENTE' check(status_pagamento in('PENDENTE','PAGO','CANCELADO')),
  status_pedido text not null default 'NOVO' check(status_pedido in('NOVO','CONFIRMADO','EM_PREPARO','SAIU_PARA_ENTREGA','ENTREGUE','CANCELADO')),
  observacao text,criado_em timestamptz not null default now());
create table itens_pedido(id bigint generated always as identity primary key,pedido_id bigint not null references pedidos on delete cascade,produto_id bigint references produtos on delete set null,nome_produto text not null,quantidade int not null check(quantidade>0),preco_unitario numeric(10,2) not null,subtotal numeric(10,2) not null);
create table usuarios_admin(id uuid primary key references auth.users on delete cascade,usuario text not null,criado_em timestamptz default now());
create table configuracoes(id int primary key default 1 check(id=1),taxa_entrega numeric(10,2) not null default 0);
create table bairros_entrega(id bigint generated always as identity primary key,nome text not null unique,taxa numeric(10,2) not null default 0 check(taxa>=0),ativo boolean not null default true);
insert into configuracoes(id) values(1);
create index on pedidos(criado_em);create index on pedidos(cliente_id);create index on itens_pedido(pedido_id);

-- ===== SEGURANÇA (RLS) =====
create function is_admin() returns boolean language sql stable security definer set search_path=public as
$$select exists(select 1 from usuarios_admin where id=auth.uid())$$;

do $$ declare t text; begin
 foreach t in array array['categorias','produtos','clientes','enderecos','cupons','pedidos','itens_pedido','usuarios_admin','configuracoes','bairros_entrega'] loop
  execute format('alter table %I enable row level security',t);
 end loop;
 -- o administrador autenticado pode tudo (exceto gerenciar usuarios_admin pela API)
 foreach t in array array['categorias','produtos','clientes','enderecos','cupons','pedidos','itens_pedido','configuracoes','bairros_entrega'] loop
  execute format('create policy "admin total" on %I for all to authenticated using(is_admin()) with check(is_admin())',t);
 end loop;
end $$;
-- o público só LÊ o cardápio (produtos disponíveis), categorias e a taxa de entrega
create policy "publico le categorias" on categorias for select using(true);
create policy "publico le produtos" on produtos for select using(disponivel or is_admin());
create policy "publico le configuracoes" on configuracoes for select using(true);
create policy "publico le bairros" on bairros_entrega for select using(ativo or is_admin());
create policy "admin le o proprio registro" on usuarios_admin for select to authenticated using(id=auth.uid());
-- clientes, endereços, pedidos e itens NÃO são acessíveis ao público: pedidos entram só pela função abaixo.

-- ===== HORÁRIO DE FUNCIONAMENTO (fuso de Brasília) — o banco recusa pedidos fora do horário =====
-- Quarta/quinta/domingo: 19:30 às 23:00 · Sexta/sábado: 19:30 às 00:00 · Segunda/terça: fechado
-- Se mudar o horário, altere aqui E em HORARIO no script.js.
create function loja_aberta() returns boolean language plpgsql stable set search_path=public as $$
declare n timestamp:=now() at time zone 'America/Sao_Paulo'; d int:=extract(dow from n); t time:=n::time;
begin
 return case when d in (0,3,4) then t>=time '19:30' and t<time '23:00'
             when d in (5,6) then t>=time '19:30'
             else false end;
end $$;

-- ===== CRIAÇÃO DE PEDIDO PELO SITE (preços recalculados no servidor) =====
create function criar_pedido(p_nome text,p_telefone text,p_email text,p_endereco text,p_numero text,p_bairro_id bigint,p_complemento text,p_obs text,p_pagamento text,p_itens jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_tel text:=regexp_replace(coalesce(p_telefone,''),'\D','','g'); v_cli bigint; v_end bigint; v_ped bigint;
        v_sub numeric:=0; v_taxa numeric; v_bairro text; i jsonb; p produtos; q int;
begin
 if length(trim(coalesce(p_nome,'')))<2 or length(v_tel)<10 or length(trim(coalesce(p_endereco,'')))<3 or length(trim(coalesce(p_numero,'')))<1 or p_bairro_id is null then raise exception 'dados inválidos'; end if;
 if not loja_aberta() then raise exception 'loja fechada'; end if;
 if p_pagamento not in('PIX','CARTAO_CREDITO','CARTAO_DEBITO','DINHEIRO') then raise exception 'pagamento inválido'; end if;
 if jsonb_typeof(p_itens)<>'array' or jsonb_array_length(p_itens) not between 1 and 50 then raise exception 'itens inválidos'; end if;
 select nome,taxa into v_bairro,v_taxa from bairros_entrega where id=p_bairro_id and ativo;
 if not found then raise exception 'bairro indisponível'; end if;
 insert into clientes(nome,email,telefone) values(left(trim(p_nome),120),nullif(left(coalesce(p_email,''),160),''),v_tel)
  on conflict(telefone) do update set nome=excluded.nome,email=coalesce(excluded.email,clientes.email) returning id into v_cli;
 select id into v_end from enderecos where cliente_id=v_cli and endereco=left(trim(p_endereco),150) and numero=left(trim(p_numero),10) and bairro=v_bairro and complemento is not distinct from nullif(left(trim(coalesce(p_complemento,'')),80),'') limit 1;
 if v_end is null then insert into enderecos(cliente_id,endereco,numero,bairro,complemento) values(v_cli,left(trim(p_endereco),150),left(trim(p_numero),10),v_bairro,nullif(left(trim(coalesce(p_complemento,'')),80),'')) returning id into v_end; end if;
 insert into pedidos(cliente_id,endereco_id,subtotal,taxa_entrega,total,forma_pagamento,observacao)
  values(v_cli,v_end,0,v_taxa,0,p_pagamento,left(coalesce(p_obs,''),500)) returning id into v_ped;
 for i in select * from jsonb_array_elements(p_itens) loop
  q:=(i->>'quantidade')::int; if q<1 or q>50 then raise exception 'quantidade inválida'; end if;
  select * into p from produtos where id=(i->>'produto_id')::bigint and disponivel;
  if not found then raise exception 'produto indisponível'; end if;
  insert into itens_pedido(pedido_id,produto_id,nome_produto,quantidade,preco_unitario,subtotal) values(v_ped,p.id,p.nome,q,p.preco,p.preco*q);
  v_sub:=v_sub+p.preco*q;
 end loop;
 update pedidos set subtotal=v_sub,total=v_sub+v_taxa where id=v_ped;
 return jsonb_build_object('id',v_ped,'total',v_sub+v_taxa,'taxa_entrega',v_taxa);
end $$;
revoke all on function criar_pedido from public; grant execute on function criar_pedido to anon,authenticated;

-- ===== RESUMO DE VENDAS (somente admin) =====
create function resumo_vendas(p_de timestamptz,p_ate timestamptz) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not is_admin() then raise exception 'acesso negado'; end if;
 return jsonb_build_object(
  'dias',coalesce((select jsonb_agg(to_jsonb(s) order by s.dia) from (select (criado_em at time zone 'America/Sao_Paulo')::date dia,sum(total) vendas,count(*) pedidos from pedidos where criado_em>=p_de and criado_em<p_ate and status_pedido<>'CANCELADO' group by 1) s),'[]'::jsonb),
  'pagamentos',coalesce((select jsonb_object_agg(forma_pagamento,t) from (select forma_pagamento,sum(total) t from pedidos where criado_em>=p_de and criado_em<p_ate and status_pedido<>'CANCELADO' group by 1) s),'{}'::jsonb),
  'pagos',(select count(*) from pedidos where criado_em>=p_de and criado_em<p_ate and status_pagamento='PAGO'),
  'cancelados',(select count(*) from pedidos where criado_em>=p_de and criado_em<p_ate and status_pedido='CANCELADO'),
  'pendentes',(select count(*) from pedidos where status_pedido in('NOVO','CONFIRMADO','EM_PREPARO','SAIU_PARA_ENTREGA')));
end $$;
revoke all on function resumo_vendas from public; grant execute on function resumo_vendas to authenticated;

-- pedidos novos aparecem no painel em tempo real
alter publication supabase_realtime add table pedidos;

-- ===== PRIMEIRO ADMINISTRADOR (rode DEPOIS de criar o usuário em Authentication > Users) =====
-- insert into usuarios_admin(id,usuario) select id,'vingadores10' from auth.users where email='vingadores10@vingadores.example';

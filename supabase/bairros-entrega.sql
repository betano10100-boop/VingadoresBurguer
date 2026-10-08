-- ===== TAXA DE ENTREGA POR BAIRRO =====
-- Rode este arquivo UMA vez no SQL Editor do Supabase se o banco já existe (schema.sql antigo).
-- Em instalação nova, o schema.sql já inclui tudo isso.

create table if not exists bairros_entrega(id bigint generated always as identity primary key,nome text not null unique,taxa numeric(10,2) not null default 0 check(taxa>=0),ativo boolean not null default true);
alter table bairros_entrega enable row level security;
drop policy if exists "admin total" on bairros_entrega;
drop policy if exists "publico le bairros" on bairros_entrega;
create policy "admin total" on bairros_entrega for all to authenticated using(is_admin()) with check(is_admin());
create policy "publico le bairros" on bairros_entrega for select using(ativo or is_admin());

-- bairro inicial usando a taxa única que você já tinha (edite e adicione os outros no painel: Configurações)
insert into bairros_entrega(nome,taxa) select 'Coelho Neto',coalesce((select taxa_entrega from configuracoes where id=1),0) on conflict(nome) do nothing;

-- troca a função antiga (que recebia o bairro como texto) pela nova (recebe o id do bairro e calcula a taxa no servidor)
drop function if exists criar_pedido(text,text,text,text,text,text,text,text,text,jsonb);
create function criar_pedido(p_nome text,p_telefone text,p_email text,p_endereco text,p_numero text,p_bairro_id bigint,p_complemento text,p_obs text,p_pagamento text,p_itens jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_tel text:=regexp_replace(coalesce(p_telefone,''),'\D','','g'); v_cli bigint; v_end bigint; v_ped bigint;
        v_sub numeric:=0; v_taxa numeric; v_bairro text; i jsonb; p produtos; q int;
begin
 if length(trim(coalesce(p_nome,'')))<2 or length(v_tel)<10 or length(trim(coalesce(p_endereco,'')))<3 or length(trim(coalesce(p_numero,'')))<1 or p_bairro_id is null then raise exception 'dados inválidos'; end if;
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

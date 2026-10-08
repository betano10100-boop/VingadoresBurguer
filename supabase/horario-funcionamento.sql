-- Rode UMA vez no SQL Editor se o banco já existe (depois de bairros-entrega.sql).
-- Faz o banco recusar pedidos fora do horário de funcionamento.

-- ===== HORÁRIO DE FUNCIONAMENTO (fuso de Brasília) — o banco recusa pedidos fora do horário =====
-- Quarta/quinta/domingo: 19:30 às 23:00 · Sexta/sábado: 19:30 às 00:00 · Segunda/terça: fechado
-- Se mudar o horário, altere aqui E em HORARIO no script.js.
create or replace function loja_aberta() returns boolean language plpgsql stable set search_path=public as $$
declare n timestamp:=now() at time zone 'America/Sao_Paulo'; d int:=extract(dow from n); t time:=n::time;
begin
 return case when d in (0,3,4) then t>=time '19:30' and t<time '23:00'
             when d in (5,6) then t>=time '19:30'
             else false end;
end $$;

create or replace function criar_pedido(p_nome text,p_telefone text,p_email text,p_endereco text,p_numero text,p_bairro_id bigint,p_complemento text,p_obs text,p_pagamento text,p_itens jsonb)
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

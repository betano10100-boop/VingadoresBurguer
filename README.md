# Vingadores Burguer — site + área administrativa (Supabase)

## Estrutura
- `index.html`, `style.css`, `script.js` — site público (layout preservado)
- `config.js` — URL e chave pública (anon) do Supabase
- `admin/login/` → **/admin/login/** (entrar) · `admin/` → **/admin/** (painel)
- `supabase/schema.sql` — tabelas, relacionamentos, RLS, funções · `supabase/seed.sql` — seu cardápio atual

## Configurar (passo a passo)
1. Crie um projeto em supabase.com.
2. **SQL Editor**: rode `supabase/schema.sql`, depois `supabase/seed.sql`. (Banco já existente? Rode, nesta ordem, `supabase/bairros-entrega.sql` e `supabase/horario-funcionamento.sql`.)
3. **Authentication → Providers → Email**: desligue *Allow new users to sign up* (ninguém pode criar conta sozinho).
4. **Authentication → Users → Add user**: e-mail `betano10100@gmail.com`, senha inicial `12345678`, marque *Auto Confirm User*.
5. **SQL Editor** (primeiro administrador):
   `insert into usuarios_admin(id,usuario) select id,'betano10100' from auth.users where email='betano10100@gmail.com';`
6. **Settings → API**: copie *Project URL* e *anon public key* para o `config.js`.
7. Publique a pasta em qualquer hospedagem estática (Netlify, Vercel, Cloudflare Pages…) ou teste localmente com a extensão Live Server do VS Code.
8. Entre em `/admin/login/` com o e-mail `betano10100@gmail.com` e **troque a senha logo em Configurações** (12345678 é fraca).

## Como a segurança funciona
- O login é feito pelo Supabase Auth: a senha nunca está no código. No login você digita o e-mail do administrador (`betano10100@gmail.com`); se digitar só um nome de usuário, o sistema completa com `@ADMIN_EMAIL_DOMAIN` do `config.js`.
- As páginas `/admin` são públicas, mas **não contêm dados**: tudo vem do banco, e as regras RLS só liberam para quem está em `usuarios_admin`. Sem login, as consultas voltam vazias/negadas.
- O público só lê categorias, produtos disponíveis e a taxa de entrega. Pedidos entram pela função `criar_pedido`, que **recalcula os preços no servidor**.
- Nunca coloque a chave `service_role` no site.

## Fluxo do pedido
Cliente finaliza no carrinho → `criar_pedido` salva cliente, endereço, pedido e itens → o painel recebe em tempo real (e atualiza a cada 30 s) → o admin muda o status → o banco é atualizado.
Sem o `config.js` preenchido, o site funciona como antes (cardápio embutido + WhatsApp).

## Fechar pedido
O carrinho pede nome, WhatsApp, rua, número, bairro, complemento (opcional), forma de pagamento (PIX, crédito, débito ou dinheiro, com campo de troco) e observações, com validação campo a campo. O bairro e o endereço completo aparecem no painel.
Se você já tinha rodado uma versão anterior do `schema.sql`, apague a função antiga antes: `drop function criar_pedido(text,text,text,text,text,text,jsonb);` e rode o schema novamente.

## Taxa de entrega por bairro
O cliente escolhe o bairro numa lista no carrinho e a taxa aparece na hora. Cadastre bairros, taxas e ativo/inativo no painel em **Configurações**. A taxa é recalculada no servidor (`criar_pedido` recebe o id do bairro). Sem Supabase configurado, o campo volta a ser texto livre.

## Horário de funcionamento
O site mostra "Aberto agora" / "Fechado agora" (sempre no horário de Brasília), a tabela de horários na seção Contato e um aviso no carrinho quando a loja está fechada. **Pedidos fora do horário são bloqueados**: o botão de enviar fica desativado ("LOJA FECHADA NO MOMENTO") e o próprio banco recusa o pedido (função `loja_aberta()`), então não dá para burlar pelo navegador. Para mudar os horários (altere nos DOIS lugares: no SQL `loja_aberta()` e no site): no `script.js`, a constante `HORARIO` (minutos desde 00:00; dias 0=domingo … 6=sábado) e a lista `#hours` no `index.html`.

## Observações
- Faturamento/pedidos nos relatórios **não contam cancelados**.
- Cupons: a tabela existe (`cupons`), sem tela no painel ainda.
- Imagem do produto: por URL. Endereço do cliente é guardado em um campo único (`endereco`).
- Cadastro/login de clientes do site continua local no navegador; os clientes do painel são criados a partir dos pedidos (por telefone).

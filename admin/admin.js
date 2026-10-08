const C=window.VB_CONFIG||{},$=s=>document.querySelector(s),VIEWS={};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"R$ "+Number(n||0).toFixed(2).replace(".",","),dt=x=>new Date(x).toLocaleString("pt-BR");
const addr=e=>e?`${esc(e.endereco)}, ${esc(e.numero||"s/n")}${e.complemento?" — "+esc(e.complemento):""}${e.bairro?" · "+esc(e.bairro):""}${e.cidade?" · "+esc(e.cidade):""}`:"—";
const ST={NOVO:"Novo",CONFIRMADO:"Confirmado",EM_PREPARO:"Em preparo",SAIU_PARA_ENTREGA:"Saiu para entrega",ENTREGUE:"Entregue",CANCELADO:"Cancelado"},FLOW=Object.keys(ST).slice(0,5);
const PG={PIX:"PIX",CARTAO_CREDITO:"Cartão de crédito",CARTAO_DEBITO:"Cartão de débito",DINHEIRO:"Dinheiro"},SP={PENDENTE:"Pendente",PAGO:"Pago",CANCELADO:"Cancelado"};
const PER={hoje:"Hoje",ontem:"Ontem","7d":"Últimos 7 dias","30d":"Últimos 30 dias",mes:"Este mês",mesant:"Mês anterior",custom:"Período personalizado"};
const opts=(o,v)=>Object.entries(o).map(([k,l])=>`<option value="${k}"${k===v?" selected":""}>${l}</option>`).join("");
const q=async p=>{const r=await p;if(r.error)throw r.error;return r.data};
const modal=h=>{const m=$("#modal");m.innerHTML=`<div class="box"><button class="x" onclick="closeM()">×</button>${h}</div>`;m.hidden=false};window.closeM=()=>$("#modal").hidden=true;
const card=(l,v)=>`<div class="card"><span>${l}</span><b>${v}</b></div>`;
const sb=window.supabase.createClient(C.SUPABASE_URL||"http://x",C.SUPABASE_ANON_KEY||"x"),bye=()=>location.replace("login/");
let refresh=null;

/* ---- períodos e resumo (calculado no banco via resumo_vendas) ---- */
const D=(y,m,d)=>new Date(y,m,d);
function range(p,a,b){const n=new Date(),y=n.getFullYear(),m=n.getMonth(),d=n.getDate();
  return{hoje:[D(y,m,d),D(y,m,d+1)],ontem:[D(y,m,d-1),D(y,m,d)],"7d":[D(y,m,d-6),D(y,m,d+1)],"30d":[D(y,m,d-29),D(y,m,d+1)],mes:[D(y,m,1),D(y,m,d+1)],mesant:[D(y,m-1,1),D(y,m,1)],custom:[new Date(a+"T00:00"),new Date(new Date(b+"T00:00").getTime()+864e5)]}[p]}
const resumo=(f,t)=>q(sb.rpc("resumo_vendas",{p_de:f.toISOString(),p_ate:t.toISOString()}));
const tot=r=>r.dias.reduce((s,d)=>s+Number(d.vendas),0),cnt=r=>r.dias.reduce((s,d)=>s+d.pedidos,0);
function chart(r,f,t){const m=new Map(r.dias.map(d=>[d.dia,d])),a=[];let mx=1;
  for(let d=new Date(f);d<t&&a.length<400;d.setDate(d.getDate()+1)){const k=d.toLocaleDateString("en-CA"),x=m.get(k)||{vendas:0,pedidos:0};a.push([k,+x.vendas,x.pedidos]);mx=Math.max(mx,+x.vendas)}
  return`<div class="bars">${a.map(([k,v,n])=>`<div class="bar" title="${k.slice(8)}/${k.slice(5,7)}: ${money(v)} · ${n} pedido(s)"><small>${n}</small><i style="height:${v/mx*85}%"></i><span>${k.slice(8)}</span></div>`).join("")}</div><p class="muted">Barras: vendas (R$) · número em cima: pedidos no dia</p>`}

/* ---- navegação ---- */
const NAV=[["dashboard","Dashboard"],["pedidos","Pedidos"],["clientes","Clientes"],["produtos","Produtos"],["categorias","Categorias"],["vendas","Vendas"],["config","Configurações"],["sair","Sair"]];
$("#nav").innerHTML=NAV.map(([k,l])=>`<a href="#${k}" data-k="${k}">${l}</a>`).join("");
addEventListener("hashchange",()=>show(location.hash.slice(1)));
async function show(k){if(k==="sair"){await sb.auth.signOut();return bye()}if(!VIEWS[k])k="dashboard";refresh=null;
  document.querySelectorAll("#nav a").forEach(a=>a.classList.toggle("on",a.dataset.k===k));$("#main").innerHTML='<p class="muted">Carregando…</p>';
  try{await VIEWS[k]()}catch(e){$("#main").innerHTML=`<p class="err">Erro: ${esc(e.message||e)}</p>`}}

/* ---- dashboard ---- */
VIEWS.dashboard=async()=>{
  const[h,o,m]=await Promise.all(["hoje","ontem","mes"].map(k=>resumo(...range(k))));
  $("#main").innerHTML=`<h1>Dashboard</h1><div class="cards">${card("Vendas de hoje",money(tot(h)))}${card("Vendas de ontem",money(tot(o)))}${card("Vendas do mês",money(tot(m)))}${card("Pedidos hoje",cnt(h))}${card("Ticket médio (mês)",money(cnt(m)?tot(m)/cnt(m):0))}${card("Pedidos pendentes",h.pendentes)}</div>
  <div class="panel"><div class="row"><h2>Vendas por dia</h2><select id="per">${opts({hoje:PER.hoje,"7d":PER["7d"],"30d":PER["30d"],mes:PER.mes},"7d")}</select></div><div id="ch"></div></div>`;
  const draw=async()=>{const[f,t]=range($("#per").value);$("#ch").innerHTML=chart(await resumo(f,t),f,t)};
  $("#per").onchange=draw;await draw();refresh=()=>show("dashboard")};

/* ---- pedidos ---- */
let ORD=[];
VIEWS.pedidos=async()=>{
  const statusCards=()=>`<div class="cards order-stats">${FLOW.map(k=>`<div class="card"><span>${ST[k]}</span><b id="oc-${k}">0</b></div>`).join('')}</div>`;
  $("#main").innerHTML=`<h1>Pedidos</h1>${statusCards()}<div class="panel"><div class="filters"><input id="fq" placeholder="Nome, telefone, e-mail ou nº do pedido" autocomplete="off"><select id="fs"><option value="">Todos os status</option>${opts(ST)}</select><input type="date" id="fd"><button id="fr" type="button">Atualizar</button></div><p class="muted" id="olast">Carregando pedidos…</p></div><div id="lst"></div>`;
  const go=async()=>{
    try{
      const s=$("#fq").value.trim(),isN=/^#?\d+$/.test(s);
      let r=sb.from("pedidos").select(`*,clientes(nome,telefone,email),enderecos(endereco,numero,bairro,complemento,cidade),itens_pedido(nome_produto,quantidade,preco_unitario,subtotal)`).order("criado_em",{ascending:false}).limit(300);
      if(isN)r=r.eq("id",+s.replace("#",""));
      if($("#fs").value)r=r.eq("status_pedido",$("#fs").value);
      if($("#fd").value){const a=new Date($("#fd").value+"T00:00");r=r.gte("criado_em",a.toISOString()).lt("criado_em",new Date(a.getTime()+864e5).toISOString())}
      let data=await q(r);
      if(s&&!isN){const needle=s.toLowerCase();data=data.filter(o=>[o.clientes?.nome,o.clientes?.telefone,o.clientes?.email].some(v=>String(v||"").toLowerCase().includes(needle)))}
      ORD=data;
      const all=data;
      FLOW.forEach(k=>{const e=$("#oc-"+k);if(e)e.textContent=all.filter(o=>o.status_pedido===k).length});
      $("#olast").textContent=`${data.length} pedido(s) exibido(s) · atualizado às ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}`;
      $("#lst").innerHTML=`<div class="tbl"><table><tr><th>Nº</th><th>Cliente</th><th>Bairro</th><th>Data</th><th>Total</th><th>Pagamento</th><th>Status</th></tr>${ORD.map(o=>`<tr data-id="${o.id}"><td>#${o.id}</td><td><b>${esc(o.clientes?.nome||"—")}</b><br><small class="muted">${esc(o.clientes?.telefone||"")}</small></td><td>${esc(o.enderecos?.bairro||"—")}</td><td>${dt(o.criado_em)}</td><td>${money(o.total)}</td><td>${PG[o.forma_pagamento]||o.forma_pagamento} · <em class="p-${o.status_pagamento}">${SP[o.status_pagamento]||o.status_pagamento}</em></td><td><span class="tag s-${o.status_pedido}">${ST[o.status_pedido]||o.status_pedido}</span></td></tr>`).join("")||"<tr><td colspan=7>Nenhum pedido encontrado.</td></tr>"}</table></div>`;
      $("#lst").querySelectorAll("tr[data-id]").forEach(tr=>tr.onclick=()=>detail(ORD.find(o=>o.id==tr.dataset.id)));
    }catch(e){$("#lst").innerHTML=`<p class="err">Erro ao carregar pedidos: ${esc(e.message||e)}</p>`}
  };
  ["fq","fs","fd"].forEach(i=>$("#"+i).oninput=go);$("#fr").onclick=go;await go();refresh=go;
};
function detail(o){const nx=FLOW[FLOW.indexOf(o.status_pedido)+1];
  const nextButtons=FLOW.filter(k=>k!==o.status_pedido).map(k=>`<button type="button" class="status-btn" data-status="${k}">${ST[k]}</button>`).join("");
  const phone=String(o.clientes?.telefone||"").replace(/\D/g,"");
  modal(`<h2>Pedido #${o.id}</h2><p class="muted">${dt(o.criado_em)}</p><p><b>${esc(o.clientes?.nome)}</b> · ${esc(o.clientes?.telefone)} ${o.clientes?.email?"· "+esc(o.clientes.email):""}</p>
  ${phone?`<p><a class="wa" target="_blank" rel="noopener" href="https://wa.me/55${phone}">Abrir WhatsApp do cliente</a></p>`:""}
  <p>📍 ${addr(o.enderecos)}</p>${o.observacao?`<p>📝 ${esc(o.observacao)}</p>`:""}
  <div class="tbl"><table>${o.itens_pedido.map(i=>`<tr><td>${i.quantidade}x ${esc(i.nome_produto)}</td><td>${money(i.preco_unitario)}</td><td>${money(i.subtotal)}</td></tr>`).join("")}</table></div>
  <p>Subtotal ${money(o.subtotal)} · Entrega ${money(o.taxa_entrega)} · Desconto ${money(o.desconto)} · <b>Total ${money(o.total)}</b></p><p>Pagamento: <b>${PG[o.forma_pagamento]||o.forma_pagamento}</b></p>
  <div class="row"><label>Status do pedido<select id="ns">${opts(ST,o.status_pedido)}</select></label><label>Status do pagamento<select id="npg">${opts(SP,o.status_pagamento)}</select></label></div>
  <div class="panel quick"><b>Alterar status rapidamente</b><div class="row">${nextButtons}</div></div>
  <div class="row"><button id="sv">Salvar alterações</button>${nx?`<button id="ad">Avançar ▶ ${ST[nx]}</button>`:""}${o.status_pedido!=="CANCELADO"?'<button id="cn" class="danger">Cancelar pedido</button>':""}</div><p id="mm" class="err"></p>`);
  const upd=async u=>{try{await q(sb.from("pedidos").update(u).eq("id",o.id));closeM();refresh&&refresh()}catch(e){$("#mm").textContent=e.message}};
  $("#sv").onclick=()=>upd({status_pedido:$("#ns").value,status_pagamento:$("#npg").value});
  $("#ad")&&($("#ad").onclick=()=>upd({status_pedido:nx}));
  $("#cn")&&($("#cn").onclick=()=>confirm("Cancelar este pedido?")&&upd({status_pedido:"CANCELADO",status_pagamento:"CANCELADO"}));
  document.querySelectorAll(".status-btn").forEach(b=>b.onclick=()=>upd({status_pedido:b.dataset.status}));
}

/* ---- clientes ---- */
VIEWS.clientes=async()=>{
  const L=await q(sb.from("clientes").select("*,pedidos(total,status_pedido)").order("criado_em",{ascending:false}));
  const agg=c=>{const v=c.pedidos.filter(p=>p.status_pedido!=="CANCELADO");return[c.pedidos.length,v.reduce((s,p)=>s+Number(p.total),0)]};
  $("#main").innerHTML=`<h1>Clientes</h1><div class="tbl"><table><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th>Cadastro</th><th>Pedidos</th><th>Total gasto</th></tr>${L.map(c=>{const[n,t]=agg(c);return`<tr data-id="${c.id}"><td>${esc(c.nome)}</td><td>${esc(c.telefone)}</td><td>${esc(c.email||"—")}</td><td>${dt(c.criado_em).slice(0,10)}</td><td>${n}</td><td>${money(t)}</td></tr>`}).join("")||"<tr><td colspan=6>Nenhum cliente.</td></tr>"}</table></div>`;
  document.querySelectorAll("tr[data-id]").forEach(tr=>tr.onclick=()=>perfil(L.find(c=>c.id==tr.dataset.id)))};
async function perfil(c){
  const[en,pe]=await Promise.all([q(sb.from("enderecos").select("*").eq("cliente_id",c.id)),q(sb.from("pedidos").select("*,itens_pedido(nome_produto,quantidade)").eq("cliente_id",c.id).order("criado_em",{ascending:false}))]);
  const v=pe.filter(p=>p.status_pedido!=="CANCELADO"),t=v.reduce((s,p)=>s+Number(p.total),0);
  modal(`<h2>${esc(c.nome)}</h2><p>${esc(c.telefone)} · ${esc(c.email||"sem e-mail")} · cadastro em ${dt(c.criado_em).slice(0,10)}</p><h3>Endereços</h3>${en.map(e=>`<p>📍 ${addr(e)}</p>`).join("")||"<p>—</p>"}
  <div class="cards">${card("Total de pedidos",pe.length)}${card("Total gasto",money(t))}${card("Ticket médio",money(v.length?t/v.length:0))}${card("Último pedido",pe[0]?dt(pe[0].criado_em).slice(0,10):"—")}</div>
  <h3>Histórico de pedidos</h3><div class="tbl"><table>${pe.map(p=>`<tr><td>#${p.id}</td><td>${dt(p.criado_em)}</td><td>${p.itens_pedido.map(i=>i.quantidade+"x "+esc(i.nome_produto)).join(", ")}</td><td>${money(p.total)}</td><td>${PG[p.forma_pagamento]}</td><td>${ST[p.status_pedido]}</td></tr>`).join("")}</table></div>`)}

/* ---- produtos ---- */
VIEWS.produtos=async()=>{
  const[P,C2]=await Promise.all([q(sb.from("produtos").select("*,categorias(nome)").order("nome")),q(sb.from("categorias").select("id,nome").order("ordem"))]);
  $("#main").innerHTML=`<div class="row"><h1>Produtos</h1><button id="addp">+ Novo produto</button></div><div class="tbl"><table><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Disponível</th><th></th></tr>${P.map(p=>`<tr><td>${esc(p.nome)}</td><td>${esc(p.categorias?.nome||"—")}</td><td>${money(p.preco)}</td><td><input type="checkbox" data-t="${p.id}"${p.disponivel?" checked":""}></td><td><button data-e="${p.id}">Editar</button> <button class="danger" data-d="${p.id}">Excluir</button></td></tr>`).join("")}</table></div>`;
  const form=p=>{p=p||{disponivel:true};
    modal(`<h2>${p.id?"Editar":"Novo"} produto</h2><label>Nome<input id="fn" value="${esc(p.nome)}"></label><label>Categoria<select id="fc">${C2.map(c=>`<option value="${c.id}"${c.id===p.categoria_id?" selected":""}>${esc(c.nome)}</option>`).join("")}</select></label><label>Descrição<textarea id="fds">${esc(p.descricao)}</textarea></label><label>Preço (R$)<input id="fp" type="number" step="0.01" min="0" value="${p.preco??""}"></label><label>Imagem (URL)<input id="fi" value="${esc(p.imagem)}"></label><label class="chk"><input id="fa" type="checkbox"${p.disponivel?" checked":""}> Disponível para compra</label><button id="fsv">Salvar</button><p id="mm" class="err"></p>`);
    $("#fsv").onclick=async()=>{const r={nome:$("#fn").value.trim(),categoria_id:+$("#fc").value||null,descricao:$("#fds").value,preco:+$("#fp").value,imagem:$("#fi").value||null,disponivel:$("#fa").checked};if(!r.nome)return;
      try{await q(p.id?sb.from("produtos").update(r).eq("id",p.id):sb.from("produtos").insert(r));closeM();show("produtos")}catch(e){$("#mm").textContent=e.message}}};
  $("#addp").onclick=()=>form();
  document.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>form(P.find(p=>p.id==b.dataset.e)));
  document.querySelectorAll("[data-d]").forEach(b=>b.onclick=async()=>{if(confirm("Excluir este produto?")){await q(sb.from("produtos").delete().eq("id",b.dataset.d));show("produtos")}});
  document.querySelectorAll("[data-t]").forEach(b=>b.onchange=()=>q(sb.from("produtos").update({disponivel:b.checked}).eq("id",b.dataset.t)))};

/* ---- categorias ---- */
VIEWS.categorias=async()=>{
  const L=await q(sb.from("categorias").select("*").order("ordem"));
  const row=c=>`<div class="row crow" data-id="${c.id||""}"><input value="${esc(c.nome)}" placeholder="Nome"><input type="number" value="${c.ordem??0}" style="width:80px" title="Ordem"><input value="${esc(c.intro)}" placeholder="Texto de apresentação (opcional)"><button>Salvar</button>${c.id?'<button class="danger">Excluir</button>':""}</div>`;
  $("#main").innerHTML=`<h1>Categorias</h1><div class="panel">${L.map(row).join("")}<h3>Nova categoria</h3>${row({})}</div>`;
  document.querySelectorAll(".crow").forEach(r=>{const[n,o,i]=r.querySelectorAll("input"),[s,d]=r.querySelectorAll("button"),id=r.dataset.id;
    s.onclick=async()=>{const v={nome:n.value.trim(),ordem:+o.value,intro:i.value||null};if(!v.nome)return;try{await q(id?sb.from("categorias").update(v).eq("id",id):sb.from("categorias").insert(v));show("categorias")}catch(e){alert(e.message)}};
    d&&(d.onclick=async()=>{if(confirm("Excluir categoria? Os produtos ficam sem categoria.")){await q(sb.from("categorias").delete().eq("id",id));show("categorias")}})})};

/* ---- vendas (financeiro) ---- */
VIEWS.vendas=async()=>{
  $("#main").innerHTML=`<h1>Vendas</h1><div class="filters"><select id="per">${opts(PER,"mes")}</select><input type="date" id="da"><input type="date" id="db"></div><div id="out"></div>`;
  const go=async()=>{const p=$("#per").value;if(p==="custom"&&!($("#da").value&&$("#db").value))return;
    const[f,t]=range(p,$("#da").value,$("#db").value),r=await resumo(f,t),n=cnt(r),v=tot(r);
    $("#out").innerHTML=`<div class="cards">${card("Faturamento",money(v))}${card("Pedidos",n)}${card("Ticket médio",money(n?v/n:0))}${card("Pedidos pagos",r.pagos)}${card("Pedidos cancelados",r.cancelados)}</div><div class="cards">${Object.entries(PG).map(([k,l])=>card(l,money(r.pagamentos[k]))).join("")}</div><div class="panel">${chart(r,f,t)}</div><p class="muted">Faturamento e pedidos não incluem cancelados.</p>`};
  ["per","da","db"].forEach(i=>$("#"+i).oninput=go);await go()};

/* ---- configurações ---- */
VIEWS.config=async()=>{
  const b=await q(sb.from("bairros_entrega").select("*").order("nome"));
  $("#main").innerHTML=`<h1>Configurações</h1><div class="panel"><h2>Bairros e taxas de entrega</h2><p class="muted">O cliente escolhe o bairro no carrinho e a taxa é aplicada automaticamente. Desmarque “Ativo” para parar de entregar em um bairro.</p>
  <div class="tbl"><table><tr><th>Bairro</th><th>Taxa (R$)</th><th>Ativo</th><th></th></tr>${b.map(x=>`<tr data-id="${x.id}"><td><input class="bn" value="${esc(x.nome)}" maxlength="80"></td><td><input class="bt" type="number" step="0.01" min="0" value="${x.taxa}"></td><td><input class="ba" type="checkbox" ${x.ativo?"checked":""}></td><td><button class="bs">Salvar</button> <button class="bd">Excluir</button></td></tr>`).join("")||"<tr><td colspan=4>Nenhum bairro cadastrado. Sem bairros, o site não aceita pedidos.</td></tr>"}</table></div>
  <h2>Adicionar bairro</h2><div class="filters"><input id="nn" placeholder="Nome do bairro" maxlength="80"><input id="nt" type="number" step="0.01" min="0" placeholder="Taxa (R$)"><button id="nadd">Adicionar</button></div><span id="m1"></span></div>
  <div class="panel"><h2>Alterar senha do administrador</h2><label>Nova senha (mínimo 8 caracteres)<input id="pw" type="password" autocomplete="new-password"></label><button id="spw">Alterar senha</button> <span id="m2"></span></div>`;
  const m1=t=>$("#m1").textContent=t;
  $("#nadd").onclick=async()=>{const nome=$("#nn").value.trim(),taxa=+$("#nt").value||0;if(nome.length<2){m1("Informe o nome do bairro.");return}
    try{await q(sb.from("bairros_entrega").insert({nome,taxa}));await VIEWS.config()}catch(e){m1(e.code==="23505"?"Esse bairro já existe.":e.message)}};
  document.querySelectorAll("tr[data-id]").forEach(tr=>{const id=tr.dataset.id;
    tr.querySelector(".bs").onclick=async()=>{const nome=tr.querySelector(".bn").value.trim();if(nome.length<2){m1("Informe o nome do bairro.");return}
      try{await q(sb.from("bairros_entrega").update({nome,taxa:+tr.querySelector(".bt").value||0,ativo:tr.querySelector(".ba").checked}).eq("id",id));m1("Salvo: "+nome)}catch(e){m1(e.code==="23505"?"Esse bairro já existe.":e.message)}};
    tr.querySelector(".bd").onclick=async()=>{if(!confirm("Excluir este bairro?"))return;try{await q(sb.from("bairros_entrega").delete().eq("id",id));await VIEWS.config()}catch(e){m1(e.message)}}});
  $("#spw").onclick=async()=>{const p=$("#pw").value;if(p.length<8){$("#m2").textContent="Use ao menos 8 caracteres.";return}const{error}=await sb.auth.updateUser({password:p});$("#m2").textContent=error?error.message:"Senha alterada."}};

/* ---- proteção: sessão + registro em usuarios_admin (as regras RLS do banco protegem os dados de verdade) ---- */
(async()=>{
  if(!C.SUPABASE_URL){document.body.classList.add("ok");$("#main").innerHTML='<p class="err">Configure o arquivo config.js (veja o README).</p>';return}
  const{data:{session}}=await sb.auth.getSession();if(!session)return bye();
  const a=await sb.from("usuarios_admin").select("id").eq("id",session.user.id).maybeSingle();
  if(!a.data){await sb.auth.signOut();return bye()}
  document.body.classList.add("ok");
  sb.auth.onAuthStateChange(e=>{if(e==="SIGNED_OUT")bye()});
  sb.channel("pedidos-live").on("postgres_changes",{event:"*",schema:"public",table:"pedidos"},()=>refresh&&refresh()).subscribe();
  setInterval(()=>refresh&&refresh(),30000);
  show(location.hash.slice(1)||"dashboard");
})();

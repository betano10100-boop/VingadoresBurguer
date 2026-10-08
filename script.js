const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const SRC="<!DOCTYPE html>\n"+document.documentElement.outerHTML;
const WA="5521959195453";
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const LS={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const cl=async n=>{try{return await window.claude?.use(n)}catch{return null}};
const money=n=>"R$ "+n.toFixed(2).replace(".",",");
const num=p=>parseFloat(String(p).replace(/[^\d,]/g,"").replace(",","."))||0;
let MENU=JSON.parse($("#menu-data").textContent);
const CFG=window.VB_CONFIG||{},SB=(CFG.SUPABASE_URL&&window.supabase)?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;

/* ---- layout ---- */
const header=$("#header"),toggle=$(".menu-toggle");
toggle.onclick=()=>toggle.setAttribute("aria-expanded",header.classList.toggle("mobile-open"));
$$(".nav a").forEach(a=>a.onclick=()=>header.classList.remove("mobile-open"));
$("#year").textContent=new Date().getFullYear();
const navLinks=$$(".nav a");
const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)navLinks.forEach(l=>l.classList.toggle("active",l.getAttribute("href")==="#"+e.target.id))}),{threshold:.45});
$$("main section[id]").forEach(s=>obs.observe(s));
const glow=$(".cursor-glow");
addEventListener("pointermove",e=>{glow.style.left=e.clientX+"px";glow.style.top=e.clientY+"px"});

/* ---- modais ---- */
const open=m=>{$(m).classList.add("open");document.body.style.overflow="hidden"};
const close=()=>{$$(".modal.open").forEach(m=>m.classList.remove("open"));document.body.style.overflow=""};
$$("[data-close]").forEach(b=>b.onclick=close);
$$(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)close()}));
$$("[data-open-order]").forEach(b=>b.onclick=()=>window.open(`https://wa.me/${WA}?text=${encodeURIComponent("Olá! Vim pelo site do Vingadores Burguer.")}`,"_blank","noopener"));

/* ---- horário de funcionamento (sempre no fuso de Brasília, independente do aparelho do cliente) ---- */
const HORARIO={0:[1170,1380],3:[1170,1380],4:[1170,1380],5:[1170,1440],6:[1170,1440]}, /* minutos desde 00:00: 1170=19:30 · 1380=23:00 · 1440=00:00 */
  DIAS=["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
const hm=m=>String(Math.floor(m/60)%24).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
function lojaStatus(now=new Date()){
  const p=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(now).map(x=>[x.type,x.value]));
  const d=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(p.weekday),m=+p.hour*60+ +p.minute,h=HORARIO[d];
  if(h&&m>=h[0]&&m<h[1])return{open:true,d,text:`Aberto agora · até ${hm(h[1])}`};
  if(h&&m<h[0])return{open:false,d,text:`Fechado agora · abre hoje às ${hm(h[0])}`};
  for(let i=1;i<=7;i++){const n=(d+i)%7;if(HORARIO[n])return{open:false,d,text:`Fechado agora · abre ${i===1?"amanhã":DIAS[n]} às ${hm(HORARIO[n][0])}`}}
}

/* ---- carrinho ---- */
let CART=LS.get("vb_cart",{}),ORDERS=LS.get("vb_orders",[]),TAXA=0,BAIRROS=[];
function add(name,price,d,id){const c=CART[name]||(CART[name]={price,qty:0,id});c.qty+=d;if(c.qty<=0)delete CART[name];LS.set("vb_cart",CART);renderCart()}
function renderCart(){
  const list=$("#cartList");list.textContent="";let total=0,count=0;
  Object.keys(CART).forEach(n=>{
    const c=CART[n],sub=num(c.price)*c.qty;total+=sub;count+=c.qty;
    const r=el("div","cart-row"),q=el("div"),m=el("button",null,"−"),p=el("button",null,"+");
    m.onclick=()=>add(n,c.price,-1);p.onclick=()=>add(n,c.price,1);
    q.append(m,el("b",null,c.qty),p);r.append(el("span",null,n),q,el("em",null,money(sub)));list.append(r);
  });
  if(!count)list.append(el("p",null,"Seu carrinho está vazio. Escolha itens no cardápio."));
  $("#cartSub").textContent=money(total);$("#feeRow").hidden=!SB||!count;$("#cartFee").textContent=!$("#orderForm").elements.bairro.value?"Escolha o bairro":TAXA>0?money(TAXA):"Grátis";$("#cartTotal").textContent=money(total+(SB&&count?TAXA:0));$("#cartCount").textContent=count;
  const sb_=$("#orderForm button[type=submit]"),aberta=lojaStatus().open;sb_.dataset.t=sb_.dataset.t||sb_.textContent;sb_.disabled=!count||!aberta;sb_.textContent=aberta?sb_.dataset.t:"LOJA FECHADA NO MOMENTO";
}
$("#cartBtn").onclick=()=>{$("#orderMsg").textContent="";renderCart();prefill();open("#cartModal")};
/* ---- fechar pedido: máscara, validação e envio ---- */
const OF=$("#orderForm"),digits=s=>String(s||"").replace(/\D/g,"");
const maskPhone=v=>{const d=digits(v).slice(0,11);return d.length>10?`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`:d.length>6?`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`:d.length>2?`(${d.slice(0,2)}) ${d.slice(2)}`:d?`(${d}`:""};
const parseMoney=s=>{s=String(s).trim();return s.includes(",")?num(s):parseFloat(s)||0};
const PAY={PIX:"PIX",CARTAO_CREDITO:"Cartão de crédito",CARTAO_DEBITO:"Cartão de débito",DINHEIRO:"Dinheiro"};
const PAYHINT={PIX:"Os dados para o pagamento via PIX serão combinados pelo WhatsApp.",DINHEIRO:"Pagamento em dinheiro na entrega."};
const FIELDS=["name","phone","street","number","bairro","payment","change"];
const FE=(n,m)=>{const s=OF.querySelector(`[data-for="${n}"]`);if(s)s.textContent=m||"";const i=OF.elements[n];if(i&&i.classList)i.classList.toggle("bad",!!m)};
const cartTotals=()=>{const sub=Object.values(CART).reduce((s,c)=>s+num(c.price)*c.qty,0),fee=SB?TAXA:0;return{sub,fee,total:sub+fee}};
function prefill(){const f=OF.elements,c=LS.get("vb_cust",{}),u=ME&&USERS[ME]||{},set=(n,v)=>{if(v&&!f[n].value)f[n].value=v};
  set("name",c.name||u.name);set("phone",c.phone||maskPhone(u.phone));set("street",c.street||u.address);set("number",c.number);(!SB&&set("bairro",c.bairro));set("complement",c.complement)}
/* bairro: lista com taxa por bairro (com Supabase) ou campo de texto (sem Supabase) */
if(!SB){const i=document.createElement("input");i.name="bairro";i.autocomplete="address-level3";i.placeholder="Ex.: Coelho Neto";i.maxLength=80;OF.elements.bairro.replaceWith(i)}
function applyTaxa(){const b=BAIRROS.find(x=>String(x.id)===String(OF.elements.bairro.value));TAXA=b?Number(b.taxa):0;renderCart()}
function fillBairros(){const s=OF.elements.bairro;if(!s||s.tagName!=="SELECT")return;const cur=s.selectedOptions[0]?.dataset.nome||LS.get("vb_cust",{}).bairro;
  s.textContent="";s.append(new Option(BAIRROS.length?"Selecione o bairro…":"Nenhum bairro disponível no momento",""));
  BAIRROS.forEach(b=>{const t=Number(b.taxa),o=new Option(`${b.nome} — ${t>0?money(t):"Grátis"}`,b.id);o.dataset.nome=b.nome;s.append(o)});
  const m=[...s.options].find(o=>o.dataset.nome&&o.dataset.nome===cur);if(m)s.value=m.value;applyTaxa()}
OF.addEventListener("change",e=>{if(SB&&e.target.name==="bairro")applyTaxa()});
OF.elements.phone.addEventListener("input",e=>e.target.value=maskPhone(e.target.value));
OF.elements.change.addEventListener("input",e=>e.target.value=e.target.value.replace(/[^\d,.]/g,""));
OF.addEventListener("input",e=>{if(e.target.name&&e.target.name!=="payment")FE(e.target.name,"")});
OF.addEventListener("change",e=>{if(e.target.name==="payment"){$("#troco").hidden=e.target.value!=="DINHEIRO";$("#payHint").textContent=PAYHINT[e.target.value]||"";FE("payment","")}});
function validateOrder(){
  const f=OF.elements,v=n=>f[n].value.trim();let first=null;FIELDS.forEach(n=>FE(n,""));
  const bad=(n,m)=>{FE(n,m);first=first||n};
  if(v("name").length<2)bad("name","Informe seu nome.");
  const d=digits(v("phone"));if(d.length<10||d.length>11||+d.slice(0,2)<11)bad("phone","Informe um WhatsApp válido com DDD. Ex.: (21) 99999-9999");
  if(v("street").length<3)bad("street","Informe a rua ou avenida.");
  if(!v("number"))bad("number","Informe o número (ou S/N).");
  if(SB?!v("bairro"):v("bairro").length<2)bad("bairro",SB?"Escolha o bairro de entrega.":"Informe o bairro.");
  if(!f.payment.value)bad("payment","Escolha a forma de pagamento.");
  const ch=v("change"),total=cartTotals().total;
  if(f.payment.value==="DINHEIRO"&&ch&&parseMoney(ch)<total)bad("change","O troco deve ser para um valor igual ou maior que o total ("+money(total)+").");
  if(first){const el=f[first];(el.focus?el:el[0]).focus()}
  return !first;
}
OF.onsubmit=async e=>{
  e.preventDefault();const ns=Object.keys(CART);if(!ns.length){$("#orderMsg").textContent="Seu carrinho está vazio.";return}if(!lojaStatus().open){$("#orderMsg").textContent="A loja está fechada no momento. "+lojaStatus().text.replace("Fechado agora · ","")+".";paintLoja();return}if(!validateOrder())return;
  const f=OF.elements,v=n=>f[n].value.trim(),msg=$("#orderMsg"),btn=e.submitter,pay=f.payment.value;
  const bo=f.bairro.selectedOptions&&f.bairro.selectedOptions[0],c={name:v("name"),phone:maskPhone(v("phone")),street:v("street"),number:v("number"),bairro:SB&&bo?bo.dataset.nome:v("bairro"),complement:v("complement")};
  const change=pay==="DINHEIRO"&&v("change")?parseMoney(v("change")):0,note=v("note"),obs=[change?"Troco para "+money(change):"",note].filter(Boolean).join(" | ");
  const w=window.open("","_blank");if(w)w.opener=null;
  let{sub,fee,total}=cartTotals(),orderId=0;
  if(SB){ /* 1) pedido salvo no Supabase  2) aparece no painel admin  3) WhatsApp */
    if(btn)btn.disabled=true;msg.textContent="Enviando pedido…";
    const pid=n=>CART[n].id||MENU.flatMap(k=>k.items).find(i=>i[0]===n)?.[3];
    const{data,error}=await SB.rpc("criar_pedido",{p_nome:c.name,p_telefone:c.phone,p_email:ME&&USERS[ME]?ME:null,p_endereco:c.street,p_numero:c.number,p_bairro_id:Number(v("bairro")),p_complemento:c.complement||null,p_obs:obs,p_pagamento:pay,p_itens:ns.map(k=>({produto_id:pid(k),quantidade:CART[k].qty}))});
    if(btn)btn.disabled=false;
    if(error||!data){if(w)w.close();msg.textContent=/fechada/i.test(error?.message||"")?"A loja está fechada no momento e não está aceitando pedidos. Veja nosso horário em Contato.":"Não foi possível registrar o pedido agora. Confira os dados e tente novamente.";if(/fechada/i.test(error?.message||""))paintLoja();return}
    total=Number(data.total);fee=Number(data.taxa_entrega);orderId=data.id;
  }
  const txt=[orderId?`*NOVO PEDIDO #${orderId}*`:"*NOVO PEDIDO*","","*Itens*",...ns.map(k=>`${CART[k].qty}x ${k} — ${money(num(CART[k].price)*CART[k].qty)}`),"",`Subtotal: ${money(sub)}`,...(SB?[`Entrega: ${fee>0?money(fee):"Grátis"}`]:[]),`*Total: ${money(total)}*`,"",
    `*Pagamento:* ${PAY[pay]}${change?` (troco para ${money(change)})`:""}`,`*Cliente:* ${c.name}`,`*WhatsApp:* ${c.phone}`,`*Endereço:* ${c.street}, ${c.number}${c.complement?" — "+c.complement:""}`,`*Bairro:* ${c.bairro} — Rio de Janeiro/RJ`,...(note?[`*Obs.:* ${note}`]:[])].join("\n");
  const url=`https://wa.me/${WA}?text=${encodeURIComponent(txt)}`;
  ORDERS.unshift({id:Date.now(),ts:Date.now(),name:c.name,address:`${c.street}, ${c.number}${c.complement?" — "+c.complement:""} · ${c.bairro}`,note:obs,items:ns.map(k=>[k,CART[k].qty,CART[k].price]),total,status:"Novo"});LS.set("vb_orders",ORDERS);LS.set("vb_cust",c);
  if(w)w.location.href=url;
  msg.textContent=(orderId?`Pedido nº ${orderId} registrado! `:"Pedido pronto! ")+"Se o WhatsApp não abrir, ";
  const a=el("a",null,"clique aqui");a.href=url;a.target="_blank";a.rel="noopener";a.style.textDecoration="underline";msg.append(a,".");
  CART={};LS.set("vb_cart",CART);renderCart();
  f.note.value="";f.change.value="";OF.querySelectorAll("[name=payment]").forEach(r=>r.checked=false);$("#troco").hidden=true;$("#payHint").textContent="";
};

/* ---- cardápio ---- */
const tabsEl=$("#menuTabs"),gridEl=$("#menuGrid"),introEl=$("#menuIntro");
function showCategory(cat){
  $$("#menuTabs button").forEach(b=>b.classList.toggle("on",b.textContent===cat.id));
  introEl.textContent=cat.intro||"";gridEl.textContent="";
  cat.items.forEach(([name,desc,price,id])=>{
    const it=el("article","menu-item"),info=el("div"),buy=el("div","menu-buy"),btn=el("button",null,"+");
    info.append(el("h3",null,name));if(desc)info.append(el("p",null,desc));
    btn.setAttribute("aria-label","Adicionar "+name);
    btn.onclick=()=>{add(name,price,1,id);btn.textContent="✓";setTimeout(()=>btn.textContent="+",700)};
    buy.append(el("strong",null,"R$ "+price),btn);it.append(info,buy);gridEl.append(it);
  });
}
function buildMenu(){tabsEl.textContent="";MENU.forEach(cat=>{const b=el("button",null,cat.id);b.onclick=()=>showCategory(cat);tabsEl.append(b)});if(MENU[0])showCategory(MENU[0])}
buildMenu();
/* Com o Supabase configurado, o cardápio vem do banco (somente produtos disponíveis). Sem ele, usa o cardápio embutido. */
if(SB)(async()=>{try{
  const[c,p,cf]=await Promise.all([SB.from("categorias").select("id,nome,intro").order("ordem"),SB.from("produtos").select("id,categoria_id,nome,descricao,preco").eq("disponivel",true).order("id"),SB.from("bairros_entrega").select("id,nome,taxa").eq("ativo",true).order("nome")]);
  BAIRROS=cf.data||[];fillBairros();
  if(c.error||p.error||!p.data.length)return;
  MENU=c.data.map(k=>({id:k.nome,intro:k.intro||"",items:p.data.filter(x=>x.categoria_id===k.id).map(x=>[x.nome,x.descricao||"",Number(x.preco).toFixed(2).replace(".",","),x.id])})).filter(k=>k.items.length);
  buildMenu();
}catch{}})();

/* ---- backup (arquivo) ---- */
async function saveFile(filename,obj){
  const data=JSON.stringify(obj,null,2),dl=await cl("downloads");
  if(dl)return dl.save({filename,data}).catch(()=>{});
  const a=el("a");a.href=URL.createObjectURL(new Blob([data],{type:"application/json"}));a.download=filename;a.click();
}
const readFile=(inp,cb)=>inp.onchange=()=>{const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{cb(JSON.parse(r.result))}catch{$("#admMsg").textContent="Arquivo de backup inválido."}};r.readAsText(f);inp.value=""};

/* ---- cadastro e login (salvos neste aparelho) ---- */
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,"0")).join("");
let USERS=LS.get("vb_users",{}),ME=LS.get("vb_me",null),mode="login",ADMIN=false;
const ADMIN_MAP=Object.fromEntries(Object.entries(CFG.ADMIN_USERS||{}).map(([k,v])=>[k.toLowerCase(),v]));
const isAdminSession=async s=>{try{return !!(s&&(await SB.from("usuarios_admin").select("id").eq("id",s.user.id).maybeSingle()).data)}catch{return false}};
async function paintAdmin(){ADMIN=false;if(SB){try{const{data:{session}}=await SB.auth.getSession();ADMIN=await isAdminSession(session)}catch{}}$("#adminBtn").hidden=!ADMIN;paintAuth()}
function paintAuth(){
  const u=ME&&USERS[ME],on=!!u||ADMIN;$("#authBtn").textContent=ADMIN&&!u?"Conta admin":u?"Olá, "+u.name.split(" ")[0]:"Entrar";
  $("#authForm").hidden=on;$("#authTabs").hidden=on;$("#authOut").hidden=!on;
  if(on){$("#authWho").textContent=ADMIN&&!u?"Conectado como administrador":"Conectado como "+u.name+" ("+ME+")"+(ADMIN?" · administrador":"");if(u)prefill()}
}
function setMode(m){mode=m;$("#regFields").hidden=m!=="reg";$("#authSubmit").textContent=m==="reg"?"CRIAR CONTA":"ENTRAR";$("#tabLogin").classList.toggle("on",m==="login");$("#tabReg").classList.toggle("on",m==="reg");$("#authMsg").textContent=""}
$("#tabLogin").onclick=()=>setMode("login");$("#tabReg").onclick=()=>setMode("reg");
$("#authBtn").onclick=()=>{setMode("login");paintAuth();open("#authModal")};
$("#authForm").onsubmit=async e=>{
  e.preventDefault();const f=new FormData(e.target),em=f.get("email").trim().toLowerCase(),msg=$("#authMsg");
  /* login de administrador (Supabase): usuário do config.js ou e-mail de admin */
  if(mode==="login"&&SB&&(ADMIN_MAP[em]||(!em.includes("@")&&!USERS[em]))){
    msg.textContent="Entrando…";
    const mail=ADMIN_MAP[em]||(em+"@"+(CFG.ADMIN_EMAIL_DOMAIN||"x.example")),{data,error}=await SB.auth.signInWithPassword({email:mail,password:f.get("pass")});
    if(error||!await isAdminSession(data.session)){if(!error)await SB.auth.signOut();msg.textContent="Usuário ou senha incorretos.";return}
    e.target.reset();msg.textContent="";await paintAdmin();paintAuth();close();return;
  }
  if(mode==="reg"){
    if(!/^\S+@\S+\.\S+$/.test(em)){msg.textContent="Informe um e-mail válido.";return}
    if(USERS[em]){msg.textContent="Esse e-mail já está cadastrado.";return}
    const salt=[...crypto.getRandomValues(new Uint8Array(8))].join("");
    USERS[em]={name:f.get("name")||em,phone:f.get("phone"),address:f.get("address"),salt,hash:await sha(salt+f.get("pass"))};
  }else{const u=USERS[em];if(!u||u.hash!==await sha(u.salt+f.get("pass"))){
    if(SB&&em.includes("@")){const{data,error}=await SB.auth.signInWithPassword({email:em,password:f.get("pass")});
      if(!error&&await isAdminSession(data.session)){e.target.reset();msg.textContent="";await paintAdmin();paintAuth();close();return}
      if(!error)await SB.auth.signOut()}
    msg.textContent="E-mail ou senha incorretos.";return}}
  ME=em;LS.set("vb_users",USERS);LS.set("vb_me",ME);e.target.reset();paintAuth();close();
};
$("#logout").onclick=async()=>{ME=null;LS.set("vb_me",null);if(SB){try{await SB.auth.signOut()}catch{}}ADMIN=false;$("#adminBtn").hidden=true;paintAuth();close()};
paintAuth();renderCart();paintAdmin();
if(SB)SB.auth.onAuthStateChange(ev=>{if(ev==="SIGNED_OUT"){ADMIN=false;$("#adminBtn").hidden=true;paintAuth()}});

/* ---- administração (só para quem edita a página) ---- */
let DRAFT=null;
function adminRender(){
  const box=$("#adminList");box.textContent="";
  DRAFT.forEach((cat,ci)=>{
    const sec=el("div","adm-cat"),head=el("div","adm-head"),nm=el("input");
    nm.value=cat.id;nm.oninput=()=>cat.id=nm.value;
    const del=el("button",null,"Excluir categoria");let sure=false;del.onclick=()=>{if(sure){DRAFT.splice(ci,1);adminRender()}else{sure=true;del.textContent="Clique de novo para excluir"}};
    head.append(nm,del);sec.append(head);
    cat.items.forEach((it,ii)=>{
      const row=el("div","adm-row");
      [0,1,2].forEach(k=>{const i=el("input");i.value=it[k];i.placeholder=["Nome","Descrição","Preço"][k];i.oninput=()=>it[k]=i.value;row.append(i)});
      const x=el("button",null,"✕");x.onclick=()=>{cat.items.splice(ii,1);adminRender()};row.append(x);sec.append(row);
    });
    const a=el("button","adm-add","+ Adicionar item");a.onclick=()=>{cat.items.push(["Novo item","","0,00"]);adminRender()};
    sec.append(a);box.append(sec);
  });
}
$("#admAddCat").onclick=()=>{DRAFT.push({id:"Nova categoria",items:[]});adminRender()};
const STATUS=["Novo","Preparando","Entregue","Cancelado"],TABS=["Menu","Orders","Backup"];
const admTab=t=>{TABS.forEach(k=>{$("#adm"+k).hidden=k!==t;$("#admTab"+k).classList.toggle("on",k===t)});$("#admMsg").textContent="";if(t==="Orders")renderOrders()};
TABS.forEach(k=>$("#admTab"+k).onclick=()=>admTab(k));
const saveOrders=()=>LS.set("vb_orders",ORDERS);
function renderOrders(){
  const box=$("#ordList");box.textContent="";
  const live=ORDERS.filter(o=>o.status!=="Cancelado");
  $("#ordSum").textContent=live.length+" · "+money(live.reduce((s,o)=>s+o.total,0));$("#ordCount").textContent=ORDERS.length||"";
  if(!ORDERS.length)box.append(el("p",null,"Nenhum pedido salvo ainda."));
  ORDERS.forEach((o,i)=>{
    const c=el("div","ord"),h=el("div","ord-h");
    h.append(el("strong",null,o.name||"Cliente"),el("span",null,new Date(o.ts).toLocaleString("pt-BR")));
    c.append(h,el("p",null,o.items?o.items.map(([n,q])=>q+"x "+n).join(", "):o.text));
    if(o.address)c.append(el("p",null,"📍 "+o.address));
    if(o.note)c.append(el("p",null,"Obs.: "+o.note));
    const f=el("div","ord-f"),sel=el("select");
    STATUS.forEach(s=>{const op=el("option",null,s);op.selected=o.status===s;sel.append(op)});
    sel.onchange=()=>{o.status=sel.value;saveOrders();renderOrders()};
    const del=el("button",null,"Excluir");del.onclick=()=>{ORDERS.splice(i,1);saveOrders();renderOrders()};
    f.append(el("strong",null,money(o.total)),sel,del);c.append(f);box.append(c);
  });
}
$("#ordForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);ORDERS.unshift({id:Date.now(),ts:Date.now(),name:f.get("name"),text:f.get("text"),total:num(f.get("total")),status:"Novo"});saveOrders();e.target.reset();renderOrders()};
$("#admExport").onclick=()=>saveFile("backup-vingadores.json",{tipo:"vingadores-backup",versao:1,data:new Date().toISOString(),cardapio:DRAFT||MENU,pedidos:ORDERS,contas:USERS});
readFile($("#admImport"),d=>{
  const out=[],card=Array.isArray(d)?d:d.cardapio;
  if(Array.isArray(card)){DRAFT=card;adminRender();out.push("cardápio (publique na aba Cardápio para aplicar no site)")}
  if(Array.isArray(d.pedidos)){ORDERS=d.pedidos;saveOrders();out.push(d.pedidos.length+" pedidos")}
  if(d.contas&&typeof d.contas==="object"){USERS={...USERS,...d.contas};LS.set("vb_users",USERS);out.push("contas")}
  if(!out.length)throw 0;
  $("#admMsg").textContent="Restaurado: "+out.join(", ")+".";
});
$("#admPublish").onclick=async()=>{
  const m=$("#admMsg"),a=await cl("artifact");
  if(!a){m.textContent="Publicação indisponível neste ambiente. Use “Baixar backup” para guardar suas alterações.";return}
  const json=JSON.stringify(DRAFT).replace(/</g,"\\u003c");
  const html=SRC.replace(/(<script id="menu-data" type="application\/json">)[\s\S]*?(<\/script>)/,(x,p,q)=>p+json+q);
  m.textContent="Publicando…";
  try{await a.publish(html)}catch(e){m.textContent=e.code==="conflict"?"Outra versão foi publicada antes. Recarregue a página e tente de novo.":"Não foi possível publicar ("+(e.code||e.message)+")."}
};

let LOJA_ABERTA=null;
function paintLoja(){
  const s=lojaStatus(),b=$("#openStatus"),n=$("#closedNote");
  b.textContent=s.text;b.classList.toggle("on",s.open);
  $$("#hours li[data-d]").forEach(li=>li.classList.toggle("today",li.dataset.d.split(",").includes(String(s.d))));
  n.hidden=s.open;n.textContent=s.open?"":s.text+". Não aceitamos pedidos fora do horário de funcionamento. Você pode montar o carrinho e finalizar quando abrirmos.";
  if(LOJA_ABERTA!==s.open){LOJA_ABERTA=s.open;renderCart()}
}
paintLoja();setInterval(paintLoja,60000);

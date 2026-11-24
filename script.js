"use strict";
const DB = {
  users: "of_users", session: "of_session",
  clients: "of_clients_", services: "of_services_", quotes: "of_quotes_"
};
let currentUser = null, clients = [], services = [], quotes = [];
const $ = id => document.getElementById(id);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now()+"-"+Math.random().toString(16).slice(2));
const read = (key, fallback=[]) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const money = value => Number(value||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc = value => String(value ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateBR = value => new Date(value).toLocaleDateString("pt-BR");
function notice(message){ alert(message); }
function keyFor(type){ return DB[type] + currentUser.id; }
function loadData(){ clients=read(keyFor("clients")); services=read(keyFor("services")); quotes=read(keyFor("quotes")); }
function saveData(){ write(keyFor("clients"),clients); write(keyFor("services"),services); write(keyFor("quotes"),quotes); }
function showAuth(mode="login"){
  $("auth-screen").hidden=false; $("app-container").hidden=true; $("client-portal").hidden=true;
  $("login-form").hidden=mode!=="login"; $("register-form").hidden=mode!=="register";
  $("client-auth-panel").hidden=true; $("worker-auth").hidden=false;
}
$("show-register").addEventListener("click",()=>showAuth("register"));
$("show-login").addEventListener("click",()=>showAuth("login"));
$("login-form").addEventListener("submit",e=>{
  e.preventDefault();
  const email=$("login-email").value.trim().toLowerCase(), password=$("login-password").value;
  const user=read(DB.users).find(u=>u.email===email && u.password===password);
  if(!user){$("auth-message").textContent="E-mail ou senha incorretos.";return;}
  startSession(user);
});
$("register-form").addEventListener("submit",e=>{
  e.preventDefault();
  const name=$("register-name").value.trim(), email=$("register-email").value.trim().toLowerCase(), password=$("register-password").value;
  const users=read(DB.users);
  if(users.some(u=>u.email===email)){$("register-message").textContent="Este e-mail já está cadastrado.";return;}
  if(password.length<6){$("register-message").textContent="A senha precisa ter pelo menos 6 caracteres.";return;}
  const user={id:uid(),name,email,password};
  users.push(user);write(DB.users,users);e.target.reset();startSession(user);
});
function startSession(user){
  currentUser=user;write(DB.session,user.id);loadData();
  $("auth-screen").hidden=true;$("client-portal").hidden=true;$("app-container").hidden=false;
  $("worker-name").textContent=user.name;$("worker-avatar").textContent=user.name.charAt(0).toUpperCase();
  $("profile-name").value=user.name;$("profile-email").value=user.email;
  $("today-label").textContent=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
  renderAll();navigate("dashboard");
}
function restoreSession(){
  const id=read(DB.session,null), user=read(DB.users).find(u=>u.id===id);
  if(user)startSession(user);else showAuth("login");
}
$("logout-button").addEventListener("click",()=>{localStorage.removeItem(DB.session);currentUser=null;showAuth("login");});
function navigate(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  const target=$("page-"+page);if(!target)return;
  target.classList.add("active");
  document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  const titles={dashboard:"Painel",clientes:"Clientes",servicos:"Serviços","novo-orcamento":"Novo orçamento",orcamentos:"Orçamentos",chat:"Chat",perfil:"Meu perfil"};
  $("page-title").textContent=titles[page]||"OrçaFácil";
  if(page==="chat" && window.renderWorkerContacts)renderWorkerContacts();
}
document.addEventListener("click",e=>{
  const nav=e.target.closest("[data-page]");if(nav){e.preventDefault();navigate(nav.dataset.page);}
  const go=e.target.closest("[data-go]");if(go)navigate(go.dataset.go);
});
function renderClients(filter=""){
  const body=$("clients-list"), list=clients.filter(c=>c.name.toLowerCase().includes(filter.toLowerCase())||String(c.email||"").toLowerCase().includes(filter.toLowerCase()));
  body.innerHTML=list.length?list.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.phone||"—")}</td><td>${esc(c.email||"—")}</td><td><button class="action-btn" data-action="edit-client" data-id="${c.id}">Editar</button><button class="action-btn danger" data-action="delete-client" data-id="${c.id}">Excluir</button></td></tr>`).join(""):`<tr><td colspan="4" class="empty-row">Nenhum cliente cadastrado.</td></tr>`;
}
$("client-form").addEventListener("submit",e=>{
  e.preventDefault();const id=$("client-id").value;
  const item={id:id||uid(),name:$("client-name").value.trim(),phone:$("client-phone").value.trim(),email:$("client-email").value.trim(),address:$("client-address").value.trim()};
  if(id)clients=clients.map(c=>c.id===id?item:c);else clients.push(item);
  saveData();e.target.reset();$("client-id").value="";$("client-form-title").textContent="Adicionar cliente";$("cancel-client-edit").hidden=true;renderAll();
});
function editClient(id){const c=clients.find(x=>x.id===id);if(!c)return;$("client-id").value=c.id;$("client-name").value=c.name;$("client-phone").value=c.phone||"";$("client-email").value=c.email||"";$("client-address").value=c.address||"";$("client-form-title").textContent="Editar cliente";$("cancel-client-edit").hidden=false;navigate("clientes");}
function deleteClient(id){if(!confirm("Excluir este cliente?"))return;clients=clients.filter(c=>c.id!==id);saveData();renderAll();}
$("cancel-client-edit").addEventListener("click",()=>{$("client-form").reset();$("client-id").value="";$("client-form-title").textContent="Adicionar cliente";$("cancel-client-edit").hidden=true;});
$("search-clients").addEventListener("input",e=>renderClients(e.target.value));
function renderServices(filter=""){
  const body=$("services-list"),list=services.filter(s=>s.name.toLowerCase().includes(filter.toLowerCase()));
  body.innerHTML=list.length?list.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.description||"—")}</td><td>${money(s.price)}</td><td><button class="action-btn" data-action="edit-service" data-id="${s.id}">Editar</button><button class="action-btn danger" data-action="delete-service" data-id="${s.id}">Excluir</button></td></tr>`).join(""):`<tr><td colspan="4" class="empty-row">Nenhum serviço cadastrado.</td></tr>`;
}
$("service-form").addEventListener("submit",e=>{
  e.preventDefault();const id=$("service-id").value,price=Number($("service-price").value);
  if(!Number.isFinite(price)||price<0){notice("Informe um preço válido.");return;}
  const item={id:id||uid(),name:$("service-name").value.trim(),price,description:$("service-description").value.trim()};
  if(id)services=services.map(s=>s.id===id?item:s);else services.push(item);
  saveData();e.target.reset();$("service-id").value="";$("service-form-title").textContent="Adicionar serviço";$("cancel-service-edit").hidden=true;renderAll();
});
function editService(id){const s=services.find(x=>x.id===id);if(!s)return;$("service-id").value=s.id;$("service-name").value=s.name;$("service-price").value=s.price;$("service-description").value=s.description||"";$("service-form-title").textContent="Editar serviço";$("cancel-service-edit").hidden=false;navigate("servicos");}
function deleteService(id){if(!confirm("Excluir este serviço?"))return;services=services.filter(s=>s.id!==id);saveData();renderAll();}
$("cancel-service-edit").addEventListener("click",()=>{$("service-form").reset();$("service-id").value="";$("service-form-title").textContent="Adicionar serviço";$("cancel-service-edit").hidden=true;});
$("search-services").addEventListener("input",e=>renderServices(e.target.value));
function updateQuoteSelects(){
  const client=$("quote-client").value,service=$("quote-service").value;
  $("quote-client").innerHTML='<option value="">Selecione um cliente</option>'+clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
  $("quote-service").innerHTML='<option value="">Selecione um serviço</option>'+services.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");
  if(clients.some(c=>c.id===client))$("quote-client").value=client;
  if(services.some(s=>s.id===service))$("quote-service").value=service;
  updateQuotePrice();
}
function updateQuotePrice(){const s=services.find(x=>x.id===$("quote-service").value);$("quote-price").value=s?s.price:"";calculateQuote();}
function calculateQuote(){
  const price=Math.max(0,Number($("quote-price").value)||0),qty=Math.max(1,Number($("quote-quantity").value)||1),discount=Math.min(100,Math.max(0,Number($("quote-discount").value)||0));
  const subtotal=price*qty,total=subtotal*(1-discount/100);$("quote-total").textContent=money(total);return{subtotal,total,discount};
}
$("quote-service").addEventListener("change",updateQuotePrice);
$("quote-quantity").addEventListener("input",calculateQuote);$("quote-discount").addEventListener("input",calculateQuote);
$("quote-form").addEventListener("submit",e=>{
  e.preventDefault();const client=clients.find(c=>c.id===$("quote-client").value),service=services.find(s=>s.id===$("quote-service").value);
  if(!client||!service){notice("Selecione um cliente e um serviço.");return;}
  const qty=Number($("quote-quantity").value),validity=Number($("quote-validity").value);
  if(!Number.isInteger(qty)||qty<1||!Number.isInteger(validity)||validity<1){notice("Confira quantidade e validade.");return;}
  const calc=calculateQuote(),quote={id:uid(),number:String(Date.now()).slice(-8),clientId:client.id,clientName:client.name,clientPhone:client.phone,clientEmail:client.email,clientAddress:client.address,serviceId:service.id,serviceName:service.name,serviceDescription:service.description,quantity:qty,unitPrice:service.price,subtotal:calc.subtotal,discount:calc.discount,total:calc.total,validity,notes:$("quote-notes").value.trim(),status:"Pendente",date:new Date().toISOString()};
  quotes.unshift(quote);saveData();e.target.reset();$("quote-quantity").value=1;$("quote-discount").value=0;updateQuoteSelects();renderAll();navigate("orcamentos");notice("Orçamento criado com sucesso!");
});
function renderQuotes(filter=""){
  const list=quotes.filter(q=>String(q.number).includes(filter)||q.clientName.toLowerCase().includes(filter.toLowerCase()));
  $("quotes-list").innerHTML=list.length?list.map(q=>`<tr><td>#${esc(q.number)}</td><td>${esc(q.clientName)}</td><td>${dateBR(q.date)}</td><td>${money(q.total)}</td><td><span class="status ${q.status}">${esc(q.status)}</span></td><td><button class="action-btn" data-action="print-quote" data-id="${q.id}">Imprimir</button><button class="action-btn" data-action="whatsapp-quote" data-id="${q.id}">WhatsApp</button><button class="action-btn" data-action="status-quote" data-id="${q.id}">Status</button><button class="action-btn danger" data-action="delete-quote" data-id="${q.id}">Excluir</button></td></tr>`).join(""):`<tr><td colspan="6" class="empty-row">Nenhum orçamento encontrado.</td></tr>`;
}
$("search-quotes").addEventListener("input",e=>renderQuotes(e.target.value));
function updateQuoteStatus(id){const q=quotes.find(x=>x.id===id);if(!q)return;const value=prompt("Novo status: Pendente, Aprovado ou Reprovado",q.status);if(value===null)return;const statuses={pendente:"Pendente",aprovado:"Aprovado",reprovado:"Reprovado"};if(!statuses[value.trim().toLowerCase()]){notice("Status inválido.");return;}q.status=statuses[value.trim().toLowerCase()];saveData();renderAll();}
function deleteQuote(id){if(!confirm("Excluir este orçamento?"))return;quotes=quotes.filter(q=>q.id!==id);saveData();renderAll();}
function printQuote(id){
  const q=quotes.find(x=>x.id===id);if(!q)return;
  $("print-area").innerHTML=`<div class="print-header"><h1>OrçaFácil</h1><p>Orçamento profissional</p><p>Número: #${esc(q.number)} · Data: ${dateBR(q.date)}</p></div><h3>Cliente</h3><p><b>${esc(q.clientName)}</b></p><p>Telefone: ${esc(q.clientPhone||"—")} · E-mail: ${esc(q.clientEmail||"—")}</p><p>Endereço: ${esc(q.clientAddress||"—")}</p><table><thead><tr><th>Serviço</th><th>Qtd.</th><th>Preço unitário</th><th>Subtotal</th></tr></thead><tbody><tr><td>${esc(q.serviceName)}</td><td>${q.quantity}</td><td>${money(q.unitPrice)}</td><td>${money(q.subtotal)}</td></tr></tbody></table><p>Desconto: ${q.discount}%</p><div class="print-total">Total: ${money(q.total)}</div><p>Validade: ${q.validity} dias</p><p>Observações: ${esc(q.notes||"Nenhuma")}</p><p style="margin-top:55px">__________________________________<br>Assinatura do cliente</p>`;
  window.print();
}
function sendWhatsApp(id){const q=quotes.find(x=>x.id===id);if(!q)return;if(!q.clientPhone){notice("Cliente sem telefone cadastrado.");return;}let phone=q.clientPhone.replace(/\D/g,"");if(phone.length<10){notice("Telefone inválido.");return;}if(!phone.startsWith("55"))phone="55"+phone;const msg=`Olá, ${q.clientName}! Segue seu orçamento OrçaFácil #${q.number}. Serviço: ${q.serviceName}. Quantidade: ${q.quantity}. Total: ${money(q.total)}. Validade: ${q.validity} dias.`;window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,"_blank","noopener");}
document.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b)return;const{id,action}= {id:b.dataset.id,action:b.dataset.action};if(action==="edit-client")editClient(id);if(action==="delete-client")deleteClient(id);if(action==="edit-service")editService(id);if(action==="delete-service")deleteService(id);if(action==="print-quote")printQuote(id);if(action==="whatsapp-quote")sendWhatsApp(id);if(action==="status-quote")updateQuoteStatus(id);if(action==="delete-quote")deleteQuote(id);});
function renderDashboard(){
  $("stat-clients").textContent=clients.length;$("stat-services").textContent=services.length;$("stat-pending").textContent=quotes.filter(q=>q.status==="Pendente").length;
  $("stat-value").textContent=money(quotes.filter(q=>q.status==="Aprovado").reduce((sum,q)=>sum+Number(q.total),0));
  const recent=quotes.slice(0,5);$("recent-quotes").innerHTML=recent.length?recent.map(q=>`<tr><td>#${esc(q.number)}</td><td>${esc(q.clientName)}</td><td>${dateBR(q.date)}</td><td>${money(q.total)}</td><td><span class="status ${q.status}">${esc(q.status)}</span></td></tr>`).join(""):`<tr><td colspan="5" class="empty-row">Nenhum orçamento cadastrado.</td></tr>`;
}
function renderAll(){renderDashboard();renderClients($("search-clients").value);renderServices($("search-services").value);renderQuotes($("search-quotes").value);updateQuoteSelects();}
$("profile-form").addEventListener("submit",e=>{e.preventDefault();const name=$("profile-name").value.trim();if(!name)return;const users=read(DB.users);const user=users.find(u=>u.id===currentUser.id);if(!user)return;user.name=name;write(DB.users,users);currentUser=user;$("worker-name").textContent=name;$("worker-avatar").textContent=name.charAt(0).toUpperCase();notice("Perfil atualizado.");});
$("password-form").addEventListener("submit",e=>{e.preventDefault();const users=read(DB.users),user=users.find(u=>u.id===currentUser.id);if(!user||user.password!==$("current-password").value){notice("Senha atual incorreta.");return;}const next=$("new-password").value;if(next.length<6){notice("A nova senha deve ter pelo menos 6 caracteres.");return;}user.password=next;write(DB.users,users);e.target.reset();notice("Senha alterada.");});
document.addEventListener("DOMContentLoaded",restoreSession);

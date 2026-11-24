"use strict";
const CHAT = {clients:"of_chat_clients",messages:"of_chat_messages",session:"of_chat_session"};
let activeClient=null, selectedChatClient=null;
const chat$=id=>document.getElementById(id);
const chatRead=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const chatWrite=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const chatUid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const chatEsc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function chatClients(){return chatRead(CHAT.clients);}
function chatMessages(){return chatRead(CHAT.messages);}
function chatFeedback(message){const el=chat$("client-auth-message");if(el)el.textContent=message;}
function showClientAccess(){
  chat$("worker-auth").hidden=true;chat$("client-auth-panel").hidden=false;
  chat$("client-login-form").hidden=false;chat$("client-register-form").hidden=true;chatFeedback("");
}
chat$("show-client-access").addEventListener("click",showClientAccess);
chat$("client-back-worker-login").addEventListener("click",()=>{chat$("client-auth-panel").hidden=true;chat$("worker-auth").hidden=false;});
chat$("client-show-register").addEventListener("click",()=>{chat$("client-login-form").hidden=true;chat$("client-register-form").hidden=false;chatFeedback("");});
chat$("client-show-login").addEventListener("click",()=>{chat$("client-register-form").hidden=true;chat$("client-login-form").hidden=false;chatFeedback("");});
chat$("client-register-form").addEventListener("submit",e=>{
  e.preventDefault();
  const name=chat$("client-register-name").value.trim(),email=chat$("client-register-email").value.trim().toLowerCase(),workerEmail=chat$("client-register-worker-email").value.trim().toLowerCase(),password=chat$("client-register-password").value,confirmPassword=chat$("client-register-confirm").value;
  if(password.length<6){chatFeedback("A senha precisa ter pelo menos 6 caracteres.");return;}
  if(password!==confirmPassword){chatFeedback("As senhas não coincidem.");return;}
  const worker=chatRead("of_users").find(u=>u.email===workerEmail);
  if(!worker){chatFeedback("Não encontramos trabalhador com esse e-mail.");return;}
  if(chatClients().some(c=>c.email===email)){chatFeedback("Este e-mail já está cadastrado.");return;}
  const all=chatClients();all.push({id:chatUid(),name,email,password,workerId:worker.id,workerName:worker.name,workerEmail});chatWrite(CHAT.clients,all);e.target.reset();chatFeedback("Cadastro criado! Agora entre com seu e-mail e senha.");chat$("client-register-form").hidden=true;chat$("client-login-form").hidden=false;
});
chat$("client-login-form").addEventListener("submit",e=>{
  e.preventDefault();const email=chat$("client-login-email").value.trim().toLowerCase(),password=chat$("client-login-password").value;
  const client=chatClients().find(c=>c.email===email&&c.password===password);
  if(!client){chatFeedback("E-mail ou senha incorretos.");return;}
  activeClient=client;localStorage.setItem(CHAT.session,client.id);e.target.reset();openClientPortal();
});
function openClientPortal(){
  if(!activeClient)return;
  chat$("auth-screen").hidden=true;chat$("app-container").hidden=true;chat$("client-portal").hidden=false;
  chat$("client-portal-name").textContent=activeClient.name;chat$("client-worker-name").textContent=activeClient.workerName;chat$("client-worker-label").textContent="Conversa com seu profissional";chat$("client-worker-avatar").textContent=(activeClient.workerName||"T").charAt(0).toUpperCase();renderClientMessages();
}
function renderClientMessages(){
  if(!activeClient)return;const area=chat$("client-chat-messages"),list=chatMessages().filter(m=>m.clientId===activeClient.id);
  area.innerHTML=list.length?list.map(m=>`<div class="chat-message ${m.sender==="client"?"sent":"received"}"><div>${chatEsc(m.text)}</div><small>${new Date(m.date).toLocaleString("pt-BR")}</small></div>`).join(""):`<div class="chat-placeholder"><h3>Nenhuma mensagem ainda</h3><p>Envie uma mensagem para começar.</p></div>`;
  area.scrollTop=area.scrollHeight;
}
chat$("client-chat-form").addEventListener("submit",e=>{
  e.preventDefault();if(!activeClient)return;const input=chat$("client-chat-input"),text=input.value.trim();if(!text)return;
  const list=chatMessages();list.push({id:chatUid(),clientId:activeClient.id,workerId:activeClient.workerId,sender:"client",text,date:new Date().toISOString()});chatWrite(CHAT.messages,list);input.value="";renderClientMessages();
});
chat$("client-logout-btn").addEventListener("click",()=>{activeClient=null;localStorage.removeItem(CHAT.session);chat$("client-portal").hidden=true;chat$("auth-screen").hidden=false;chat$("client-auth-panel").hidden=false;chat$("worker-auth").hidden=true;chat$("client-login-form").hidden=false;chat$("client-register-form").hidden=true;chatFeedback("");});
function renderWorkerContacts(){
  if(!window.currentUser && !currentUser)return;
  const user=window.currentUser||currentUser,search=chat$("worker-chat-search").value.trim().toLowerCase();
  const list=chatClients().filter(c=>c.workerId===user.id&&(c.name.toLowerCase().includes(search)||c.email.includes(search)));
  chat$("worker-chat-contacts").innerHTML=list.length?list.map(c=>`<button type="button" class="chat-contact ${selectedChatClient===c.id?"active":""}" data-chat-client="${c.id}"><span class="chat-avatar">${chatEsc(c.name.charAt(0).toUpperCase())}</span><span class="chat-contact-info"><strong>${chatEsc(c.name)}</strong><small>${chatEsc(c.email)}</small></span></button>`).join(""):`<div class="chat-empty-small">Nenhum cliente cadastrado no chat ainda.</div>`;
}
function openWorkerConversation(id){
  const user=window.currentUser||currentUser;if(!user)return;
  const client=chatClients().find(c=>c.id===id&&c.workerId===user.id);if(!client)return;
  selectedChatClient=id;chat$("worker-chat-empty").hidden=true;chat$("worker-chat-active").hidden=false;chat$("worker-chat-name").textContent=client.name;chat$("worker-chat-email").textContent=client.email;chat$("worker-chat-avatar").textContent=client.name.charAt(0).toUpperCase();renderWorkerContacts();renderWorkerMessages();
}
function renderWorkerMessages(){
  if(!selectedChatClient)return;const area=chat$("worker-chat-messages"),list=chatMessages().filter(m=>m.clientId===selectedChatClient);
  area.innerHTML=list.length?list.map(m=>`<div class="chat-message ${m.sender==="worker"?"sent":"received"}"><div>${chatEsc(m.text)}</div><small>${new Date(m.date).toLocaleString("pt-BR")}</small></div>`).join(""):`<div class="chat-placeholder"><h3>Inicie a conversa</h3><p>Envie uma mensagem para seu cliente.</p></div>`;
  area.scrollTop=area.scrollHeight;
}
chat$("worker-chat-contacts").addEventListener("click",e=>{const b=e.target.closest("[data-chat-client]");if(b)openWorkerConversation(b.dataset.chatClient);});
chat$("worker-chat-search").addEventListener("input",renderWorkerContacts);
chat$("worker-chat-form").addEventListener("submit",e=>{
  e.preventDefault();const user=window.currentUser||currentUser;if(!user||!selectedChatClient)return;const input=chat$("worker-chat-input"),text=input.value.trim();if(!text)return;
  const list=chatMessages();list.push({id:chatUid(),clientId:selectedChatClient,workerId:user.id,sender:"worker",text,date:new Date().toISOString()});chatWrite(CHAT.messages,list);input.value="";renderWorkerMessages();
});
window.addEventListener("storage",e=>{if(e.key===CHAT.messages){if(activeClient)renderClientMessages();renderWorkerMessages();}});
window.renderWorkerContacts=renderWorkerContacts;
function restoreChatSession(){
  const id=localStorage.getItem(CHAT.session);if(!id)return;const client=chatClients().find(c=>c.id===id);if(!client){localStorage.removeItem(CHAT.session);return;}
  activeClient=client;openClientPortal();
}
document.addEventListener("DOMContentLoaded",restoreChatSession);

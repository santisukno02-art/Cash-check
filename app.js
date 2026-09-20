const GOOGLE_SCRIPT_URL="https://script.google.com/macros/s/AKfycbwSCRVk13q3CEXXDEAX9fy6UfnkgY1x67P9biIDe4dqeIskfpgg8jMqSkAW3ZYsvAcF/exec",SESSION_MS=3600000;
const DENOMS=[{v:1000,l:"1,000",u:"",t:"note"},{v:500,l:"500",u:"",t:"note"},{v:100,l:"100",u:"",t:"note"},{v:50,l:"50",u:"",t:"note"},{v:20,l:"20",u:"",t:"note"},{v:10,l:"10",u:"เหรียญ",t:"coin"},{v:5,l:"5",u:"เหรียญ",t:"coin"},{v:2,l:"2",u:"เหรียญ",t:"coin"},{v:1,l:"1",u:"เหรียญ",t:"coin"},{v:.5,l:"0.50",u:"เหรียญ",t:"coin"},{v:.25,l:"0.25",u:"เหรียญ",t:"coin"}],rounds={1:Object.fromEntries(DENOMS.map(d=>[d.v,0])),2:Object.fromEntries(DENOMS.map(d=>[d.v,0]))};
const $=id=>document.getElementById(id),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])),money=n=>Number(n||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});let profiles=[],adminToken="",photoData="",active=null,tick,pin="",loadingProfiles=false;
function device(){let x=localStorage.getItem("cashCheckDeviceId");if(!x){x=crypto.randomUUID();localStorage.setItem("cashCheckDeviceId",x)}return x}
function hidden(id,on){$(id).classList.toggle("hidden",on)}
function toast(m,b){let t=$("toast");t.textContent=m;t.className="toast show"+(b?" error":"");setTimeout(()=>t.className="toast",2800)}
async function get(p){let r=await fetch(`${GOOGLE_SCRIPT_URL}?${new URLSearchParams(p)}`,{cache:"no-store"});if(!r.ok)throw Error();return r.json()}
async function post(p){let r=await fetch(GOOGLE_SCRIPT_URL,{method:"POST",redirect:"follow",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(p)}),t=await r.text();if(!r.ok)throw Error();return JSON.parse(t)}
async function loadProfiles(){if(loadingProfiles)return;loadingProfiles=true;$("profiles").innerHTML='<div class="profile-loading"><span class="loading-spinner" aria-hidden="true"></span><span>กำลังโหลด User</span></div>';try{let r=await get({action:"profiles"});if(!r.ok)throw Error(r.message);profiles=(r.profiles||[]).filter(p=>p.role!=='admin');renderProfiles()}catch{$("profiles").innerHTML='<div class="profile-load-fail"><span>โหลด User ไม่สำเร็จ</span><button id="retryProfilesBtn" class="retry-btn" type="button">ลองอีกครั้ง</button></div>'}finally{loadingProfiles=false}}
function renderProfiles(){$("profiles").innerHTML=profiles.map(p=>`<button class="profile-card pressable" data-profile="${esc(p.id)}"><img src="${esc(p.photoUrl||'./icons/icon-192.png')}" alt=""><span>${esc(p.name)}</span></button>`).join("")||'<p class="load-error">ยังไม่มีผู้ใช้</p>'}
async function choose(id){let p=profiles.find(x=>x.id===id);if(!p)return;if(p.role==='admin')return openPin();let buttons=document.querySelectorAll("[data-profile]");buttons.forEach(b=>b.disabled=true);try{let r=await post({action:"login",profileId:id,deviceId:device()});if(!r.ok)throw Error(r.message);start(r.session,p.name)}catch(e){toast(e.message||"เข้าสู่ระบบไม่ได้",true)}finally{buttons.forEach(b=>b.disabled=false)}}
function start(s,name){active={...s,name};sessionStorage.setItem("cashCheckSession",JSON.stringify(active));$("activeUserText").textContent="ผู้ใช้งาน: "+name;hidden("profileScreen",true);hidden("counterScreen",false);timer();clearInterval(tick);tick=setInterval(timer,1000)}
function timer(){if(!active)return;let n=new Date(active.expiresAt)-Date.now();if(n<=0){end("timeout");return}n=Math.ceil(n/1000);$("sessionTimer").textContent=`${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`}
async function end(mode="manual"){let s=active;if(!s)return;active=null;clearInterval(tick);sessionStorage.removeItem("cashCheckSession");hidden("counterScreen",true);hidden("profileScreen",false);$("sessionTimer").textContent="60:00";try{await post({action:"logout",userId:s.userId,deviceId:s.deviceId,loginAt:s.loginAt})}catch{}if(mode==="timeout")toast("ครบเวลา 1 ชั่วโมงแล้ว กรุณาเลือกผู้ใช้ใหม่")}
async function restore(){let raw=sessionStorage.getItem("cashCheckSession");if(!raw)return;try{let s=JSON.parse(raw),r=await get({action:"session",userId:s.userId,deviceId:s.deviceId,loginAt:s.loginAt});if(r.ok&&r.active)start({...s,expiresAt:r.expiresAt},s.name);else{sessionStorage.removeItem("cashCheckSession");hidden("counterScreen",true);hidden("profileScreen",false)}}catch{sessionStorage.removeItem("cashCheckSession");hidden("counterScreen",true);hidden("profileScreen",false)}}
function showPin(){$("pinDots").innerHTML=pin?"● ".repeat(pin.length):"<span>กรอกรหัส</span>"}function openPin(){pin="";showPin();hidden("pinModal",false)}function pressPin(key){if(key==="clear")pin="";else if(key==="back")pin=pin.slice(0,-1);else if(pin.length<12)pin+=key;showPin()}
async function checkPin(){if(!pin)return toast("กรุณากดรหัส Admin",true);let b=$("verifyPinBtn");b.disabled=true;b.classList.add("is-loading");b.dataset.originalText=b.textContent;b.textContent="กำลังตรวจสอบ...";try{let r=await post({action:"admin-login",pin});if(!r.ok)throw Error(r.message);adminToken=r.token;pin="";hidden("pinModal",true);resetForm();showManager();hidden("managerModal",false)}catch(e){pin="";showPin();toast(e.message||"รหัสไม่ถูกต้อง",true)}finally{b.disabled=false;b.classList.remove("is-loading");b.textContent=b.dataset.originalText||"ยืนยัน"}}
function showManager(){$("manageProfilesList").innerHTML=profiles.map(p=>`<div class="manage-item"><img src="${esc(p.photoUrl||'./icons/icon-192.png')}" alt=""><span>${esc(p.name)}${p.role==='admin'?' (Admin)':''}</span>${p.role==='admin'?'':`<button data-edit="${esc(p.id)}">แก้ไข</button><button class="delete" data-delete="${esc(p.id)}">ลบ</button>`}</div>`).join("")}
function resetForm(){$("profileForm").reset();$("profileId").value="";photoData="";$("photoPreview").textContent="ไม่มีรูปใหม่"}
function edit(id){let p=profiles.find(x=>x.id===id);if(!p)return;$("profileId").value=p.id;$("profileName").value=p.name;photoData="";$("photoPreview").innerHTML=`<img src="${esc(p.photoUrl)}" alt="">รูปปัจจุบัน`}
async function save(e){e.preventDefault();let b=e.submitter||$("profileForm").querySelector("button[type=submit]");b.disabled=true;b.classList.add("is-loading");let old=b.textContent;b.textContent="กำลังบันทึก...";try{let r=await post({action:"profile-save",token:adminToken,id:$("profileId").value,name:$("profileName").value.trim(),photoData});if(!r.ok)throw Error(r.message);profiles=(r.profiles||[]).filter(p=>p.role!=='admin');renderProfiles();showManager();resetForm();toast("บันทึกผู้ใช้แล้ว")}catch(e){toast(e.message||"บันทึกไม่ได้",true)}finally{b.disabled=false;b.classList.remove("is-loading");b.textContent=old}}
async function del(id){let p=profiles.find(x=>x.id===id);if(!p||!confirm(`ลบผู้ใช้ ${p.name} ใช่หรือไม่?`))return;try{let r=await post({action:"profile-delete",token:adminToken,id});if(!r.ok)throw Error(r.message);profiles=(r.profiles||[]).filter(p=>p.role!=='admin');renderProfiles();showManager();toast("ลบผู้ใช้แล้ว")}catch(e){toast(e.message||"ลบไม่ได้",true)}}
function photo(f){if(!f)return;if(f.size>1048576)return toast("รูปต้องไม่เกิน 1 MB",true);let r=new FileReader;r.onload=()=>{photoData=r.result;$("photoPreview").innerHTML=`<img src="${r.result}" alt="">รูปใหม่พร้อมบันทึก`};r.readAsDataURL(f)}
let numberPad={type:null,round:null,v:null,original:"",value:""};
function openNumberPad(type,round,v){
  numberPad={type,round,v,original:"",value:""};
  if(type==="target") numberPad.original=$("round1Target").value||"";
  else numberPad.original=String(rounds[round][v]||"");
  numberPad.value=numberPad.original;
  $("numberPadTitle").textContent=type==="target"?"กำหนดยอดเงินรอบที่ 1":(()=>{const d=DENOMS.find(x=>String(x.v)===String(v));return `จำนวน${d?.t==="coin"?"เหรียญ":"แบงค์"} ${d?.l||v}`})();
  updateNumberPadDisplay();
  hidden("numberPadModal",false);
}
function updateNumberPadDisplay(){$("numberPadValue").textContent=numberPad.value===""?"":Number(numberPad.value).toLocaleString("th-TH");}
function pressNumberKey(key){
  if(key==="back") numberPad.value=numberPad.value.slice(0,-1);
  else if(/^\d$/.test(key)){if(numberPad.value==="0")numberPad.value=key;else if(numberPad.value.length<12)numberPad.value+=key;}
  updateNumberPadDisplay();
}
function commitNumberPad(){
  let n=numberPad.value===""?"":String(Math.max(0,parseInt(numberPad.value,10)||0));
  if(numberPad.type==="target") $("round1Target").value=n;
  else {rounds[numberPad.round][numberPad.v]=n===""?0:parseInt(n,10)||0;document.querySelector(`input[data-round=\"${numberPad.round}\"][data-v=\"${numberPad.v}\"]`).value=n===""?0:n;update()}
  hidden("numberPadModal",true);
  numberPad={type:null,round:null,v:null,original:"",value:""};
}
function cancelNumberPad(){hidden("numberPadModal",true);numberPad={type:null,round:null,v:null,original:"",value:""}}
function render(r){let root=$(`round${r}List`),last="";root.innerHTML="";DENOMS.forEach(d=>{if(last!==d.t){last=d.t;root.insertAdjacentHTML("beforeend",`<div class="list-label">${last==='note'?'ธนบัตร':'เหรียญ'}</div>`)}root.insertAdjacentHTML("beforeend",`<div class="money-row"><div class="denom">${d.l}<span class="unit">${d.u}</span></div><div class="row-amount" id="amount-${r}-${d.v}">0.00 บาท</div><div class="counter"><button class="pressable" data-round="${r}" data-v="${d.v}" data-act="-" type="button">−</button><input type="text" inputmode="none" readonly value="0" data-numpad="count" data-round="${r}" data-v="${d.v}" aria-label="จำนวน ${d.l} ${d.u}"><button class="plus pressable" data-round="${r}" data-v="${d.v}" data-act="+" type="button">+</button></div></div>`)})}
function total(r){return DENOMS.reduce((s,d)=>s+d.v*rounds[r][d.v],0)}
function update(){[1,2].forEach(r=>{let t=total(r);$(`round${r}Total`).textContent=money(t);$(`break${r}`).textContent=money(t)+" บาท";DENOMS.forEach(d=>$(`amount-${r}-${d.v}`).textContent=money(d.v*rounds[r][d.v])+" บาท")});$("grandTotal").textContent=money(total(1)+total(2))}
function clear(){[1,2].forEach(r=>DENOMS.forEach(d=>rounds[r][d.v]=0));$("round1Target").value="";document.querySelectorAll("input[data-round]").forEach(x=>x.value=0);update()}
document.addEventListener("click",e=>{
  let key=e.target.closest("[data-pin]");if(key)return pressPin(key.dataset.pin);
  let retry=e.target.closest("#retryProfilesBtn");if(retry)return loadProfiles();
  let num=e.target.closest("[data-numpad]");if(num)return openNumberPad(num.dataset.numpad,num.dataset.round,num.dataset.v);
  let numKey=e.target.closest("[data-num-key]");if(numKey){pressNumberKey(numKey.dataset.numKey);return}
  if(e.target.closest("#numberPadConfirm"))return commitNumberPad();
  if(e.target.closest("#numberPadCancel"))return cancelNumberPad();
  let p=e.target.closest("[data-profile]");if(p)return choose(p.dataset.profile);
  let b=e.target.closest("[data-act]");if(b){let r=b.dataset.round,v=b.dataset.v;rounds[r][v]=Math.max(0,rounds[r][v]+(b.dataset.act==='+'?1:-1));document.querySelector(`input[data-round="${r}"][data-v="${v}"]`).value=rounds[r][v];b.classList.remove("tap");void b.offsetWidth;b.classList.add("tap");return update()}
  if(e.target.dataset.edit)return edit(e.target.dataset.edit);
  if(e.target.dataset.delete)return del(e.target.dataset.delete);
  if(e.target.dataset.close)return hidden(e.target.dataset.close,true);
});
$("manageProfilesBtn").onclick=openPin;
$("verifyPinBtn").onclick=checkPin;
$("profileForm").onsubmit=save;
$("profilePhoto").onchange=e=>photo(e.target.files[0]);
$("resetProfileBtn").onclick=resetForm;
$("logoutBtn").onclick=()=>end("manual");
$("clearBtn").onclick=()=>confirm("ต้องการล้างจำนวนเงินทั้ง 2 รอบใช่หรือไม่?")&&clear();
render(1);render(2);update();loadProfiles();restore();



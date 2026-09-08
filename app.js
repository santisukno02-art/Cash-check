const GOOGLE_SCRIPT_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

const DENOMS = [
  {v:1000,label:"1,000",unit:"ใบ",type:"note"},
  {v:500,label:"500",unit:"ใบ",type:"note"},
  {v:100,label:"100",unit:"ใบ",type:"note"},
  {v:50,label:"50",unit:"ใบ",type:"note"},
  {v:20,label:"20",unit:"ใบ",type:"note"},
  {v:10,label:"10",unit:"เหรียญ",type:"coin"},
  {v:5,label:"5",unit:"เหรียญ",type:"coin"},
  {v:2,label:"2",unit:"เหรียญ",type:"coin"},
  {v:1,label:"1",unit:"เหรียญ",type:"coin"},
  {v:.50,label:"0.50",unit:"เหรียญ",type:"coin"},
  {v:.25,label:"0.25",unit:"เหรียญ",type:"coin"}
];

const rounds = {
  1:Object.fromEntries(DENOMS.map(d=>[String(d.v),0])),
  2:Object.fromEntries(DENOMS.map(d=>[String(d.v),0]))
};

const $=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});

function renderRound(round){
  const root=$(`round${round}List`);
  root.innerHTML="";
  let lastType="";
  DENOMS.forEach(d=>{
    if(lastType!==d.type){
      const title=document.createElement("div");
      title.className="list-label";
      title.textContent=d.type==="note"?"ธนบัตร":"เหรียญ";
      root.appendChild(title);
      lastType=d.type;
    }
    const row=document.createElement("div");
    row.className="money-row";
    row.innerHTML=`
      <div class="denom">${d.label}<span class="unit">${d.unit}</span></div>
      <div class="row-amount" id="amount-${round}-${d.v}">0.00 บาท</div>
      <div class="counter">
        <button data-round="${round}" data-v="${d.v}" data-act="minus">−</button>
        <input type="number" min="0" step="1" value="0" data-round="${round}" data-v="${d.v}">
        <button class="plus" data-round="${round}" data-v="${d.v}" data-act="plus">+</button>
      </div>`;
    root.appendChild(row);
  });
}

function getRoundTotal(round){
  return DENOMS.reduce((sum,d)=>sum+d.v*rounds[round][String(d.v)],0);
}

function update(){
  [1,2].forEach(r=>{
    const total=getRoundTotal(r);
    $(`round${r}Total`).textContent=money(total);
    $(`break${r}`).textContent=`${money(total)} บาท`;
    DENOMS.forEach(d=>{
      $(`amount-${r}-${d.v}`).textContent=`${money(d.v*rounds[r][String(d.v)])} บาท`;
    });
  });
  const total=getRoundTotal(1)+getRoundTotal(2);
  $("grandTotal").textContent=money(total);
  const target=Number($("round1Target").value||0);
  $("round1Target").dataset.difference = target ? (getRoundTotal(1)-target) : "";
}

function bind(){
  document.addEventListener("click",e=>{
    const b=e.target.closest("[data-act]");
    if(!b)return;
    const r=b.dataset.round,k=b.dataset.v;
    rounds[r][k]=Math.max(0,rounds[r][k]+(b.dataset.act==="plus"?1:-1));
    const input=document.querySelector(`input[data-round="${r}"][data-v="${k}"]`);
    if(input)input.value=rounds[r][k];
    update();
  });
  document.addEventListener("input",e=>{
    if(e.target.matches("input[data-round]")){
      const r=e.target.dataset.round,k=e.target.dataset.v;
      rounds[r][k]=Math.max(0,Math.floor(Number(e.target.value)||0));
      update();
    }
  });
  $("round1Target").addEventListener("input",update);
  $("clearBtn").addEventListener("click",()=>{
    if(!confirm("ต้องการล้างจำนวนเงินทั้ง 2 รอบใช่หรือไม่?"))return;
    [1,2].forEach(r=>DENOMS.forEach(d=>rounds[r][String(d.v)]=0));
    $("round1Target").value=""; $("note").value="";
    document.querySelectorAll("input[data-round]").forEach(x=>x.value=0);
    update();
  });
  $("saveBtn").addEventListener("click",save);
  $("refreshBtn").addEventListener("click",loadHistory);
}

async function apiGet(q){
  const res=await fetch(`${GOOGLE_SCRIPT_URL}?${q}`);
  if(!res.ok)throw new Error("เชื่อมต่อ Google Sheets ไม่สำเร็จ");
  return res.json();
}
async function apiPost(data){
  const res=await fetch(GOOGLE_SCRIPT_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(data)});
  if(!res.ok)throw new Error("บันทึกข้อมูลไม่สำเร็จ");
  return res.json();
}

async function checkConnection(){
  if(GOOGLE_SCRIPT_URL.includes("PASTE_YOUR")){
    $("connectionText").textContent="ยังไม่ได้เชื่อมต่อ";
    return;
  }
  try{await apiGet("action=ping");$("dot").classList.add("on");$("connectionText").textContent="ออนไลน์";}
  catch{$("connectionText").textContent="เชื่อมต่อไม่ได้";}
}

async function save(){
  if(GOOGLE_SCRIPT_URL.includes("PASTE_YOUR"))return toast("ใส่ Google Apps Script URL ใน app.js ก่อน",true);
  const r1=getRoundTotal(1),r2=getRoundTotal(2),target=$("round1Target").value===""?null:Number($("round1Target").value);
  if(r1<=0&&r2<=0)return toast("กรุณากรอกจำนวนเงินก่อน",true);

  const counts1={},counts2={};
  DENOMS.forEach(d=>{counts1[String(d.v)]=rounds[1][String(d.v)];counts2[String(d.v)]=rounds[2][String(d.v)];});
  const payload={action:"save",note:$("note").value.trim(),round1Total:r1,round2Total:r2,grandTotal:r1+r2,round1Target:target,round1Difference:target===null?null:r1-target,counts1,counts2};
  $("saveBtn").disabled=true;$("saveBtn").textContent="กำลังบันทึก...";
  try{
    const result=await apiPost(payload);
    if(!result.ok)throw new Error(result.message||"บันทึกไม่สำเร็จ");
    toast("บันทึกข้อมูลเรียบร้อย ✓");
    $("note").value="";
    loadHistory();
  }catch(e){toast(e.message,true)}
  finally{$("saveBtn").disabled=false;$("saveBtn").innerHTML='บันทึกยอด <span>→</span>'}
}

function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

async function loadHistory(){
  if(GOOGLE_SCRIPT_URL.includes("PASTE_YOUR"))return;
  try{
    const data=await apiGet("action=history&limit=20");
    if(!data.ok)throw new Error(data.message);
    const list=$("historyList");
    if(!data.rows.length){list.innerHTML='<div class="empty">ยังไม่มีข้อมูล</div>';return}
    list.innerHTML=data.rows.map(r=>`
      <div class="history-item">
        <div class="history-top">
          <div><div class="history-date">${escapeHtml(r.date)} ${escapeHtml(r.time)}</div><div style="font-size:10px;margin-top:3px">${escapeHtml(r.note||"ไม่ระบุหมายเหตุ")}</div></div>
          <div class="history-total">${money(r.grandTotal)} บาท</div>
        </div>
        <div class="history-meta"><span>รอบ 1: ${money(r.round1Total)} ฿</span><span>รอบ 2: ${money(r.round2Total)} ฿</span></div>
      </div>`).join("");
  }catch(e){$("historyList").innerHTML=`<div class="empty">โหลดข้อมูลไม่ได้</div>`}
}

function toast(msg,error=false){
  const t=$("toast");t.textContent=msg;t.className=`toast show${error?" error":""}`;
  setTimeout(()=>t.className="toast",2600);
}

renderRound(1);renderRound(2);bind();update();checkConnection();loadHistory();

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));

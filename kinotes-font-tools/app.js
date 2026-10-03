const MAX_BATCH = 500;
const queue = new Map();
const historyKey = 'kinotes_download_history_v2';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const history = () => new Set(JSON.parse(localStorage.getItem(historyKey) || '[]'));

const ledger = [];

function money(n){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n)}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),2600)}
function slugFromPageUrl(url){try{const u=new URL(url);if(!/(^|\.)dafont\.com$/i.test(u.hostname)) return null;const m=u.pathname.match(/\/([^/]+)\.font$/i);return m?.[1]||null}catch{return null}}
function pretty(slug){return slug.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function itemFromSlug(slug,name){return{name:name||pretty(slug),slug,pageUrl:`https://www.dafont.com/${slug}.font`,downloadUrl:`https://dl.dafont.com/dl/?f=${encodeURIComponent(slug)}`}}
function escapeHtml(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

$$('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
  $$('.tool-panel').forEach(x=>x.classList.remove('active'));
  const panel = btn.dataset.tab==='auto' ? '#panelAuto' : btn.dataset.tab==='search' ? '#panelSearch' : '#panelLinks';
  $(panel).classList.add('active');
}));

$('#autoForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const count = Math.max(1, Math.min(500, Number.parseInt($('#fontCount').value || '100', 10) || 100));
  $('#fontCount').value = count;
  await autoDownload(count);
});

async function autoDownload(count){
  const progress = $('#autoProgress'), log = $('#autoLog');
  progress.classList.remove('hidden'); log.classList.remove('hidden'); log.innerHTML='';
  updateProgress(0,count,0,0,`Mengambil daftar ${count} font…`);
  const hist = history();
  let items;
  try {
    const r=await fetch(`/api/list?count=${count}&source=new`, {cache:'no-store'});
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||'Gagal mengambil daftar font.');
    items=data.items||[];
  } catch(err) {
    updateProgress(0,count,0,count,err.message);
    addLog(err.message,'fail');
    return;
  }

  let done=0, skipped=0, failed=0;
  for(let i=0;i<items.length;i++){
    const item=items[i];
    const pct=Math.round(((i)/items.length)*100);
    updateProgress(pct,items.length,done,skipped,failed,`Menyiapkan ${i+1}/${items.length}: ${item.name}`);
    if(hist.has(item.slug)){
      skipped++; addLog(`Lewati duplikat: ${item.name}`,'skip'); updateProgress(Math.round(((i+1)/items.length)*100),items.length,done,skipped,failed,`Lewati ${item.name}`); continue;
    }
    try {
      await downloadOne(item);
      done++; hist.add(item.slug); localStorage.setItem(historyKey,JSON.stringify([...hist]));
      addLog(`Berhasil: ${item.name}`,'ok');
    } catch(err) {
      failed++; addLog(`Gagal: ${item.name} — ${err.message}`,'fail');
    }
    updateProgress(Math.round(((i+1)/items.length)*100),items.length,done,skipped,failed,i===items.length-1?'Selesai':`Berikutnya: ${i+2}/${items.length}`);
    await new Promise(r=>setTimeout(r,450));
  }
  updateProgress(100,items.length,done,skipped,failed,`Selesai — ${done} berhasil, ${skipped} duplikat, ${failed} gagal.`);
  toast(`Selesai: ${done} font berhasil diunduh.`);
}

function updateProgress(percent,total,done,skipped,failed,label){
  $('#progressBar').style.width=`${Math.max(0,Math.min(100,percent))}%`;
  $('#progressPercent').textContent=`${Math.round(percent)}%`;
  $('#progressLabel').textContent=label;
  $('#progressDone').textContent=`${done} berhasil`;
  $('#progressSkip').textContent=`${skipped} dilewati`;
  $('#progressFail').textContent=`${failed} gagal`;
}
function addLog(text,type){const row=document.createElement('div');row.className=`log-row ${type}`;row.innerHTML=`<span>${type==='ok'?'✓':type==='skip'?'↷':'!'}</span><p>${escapeHtml(text)}</p>`;$('#autoLog').prepend(row);while($('#autoLog').children.length>10)$('#autoLog').lastElementChild.remove()}
async function downloadOne(item){
  const r=await fetch(`/api/download?url=${encodeURIComponent(item.downloadUrl)}&name=${encodeURIComponent(item.slug)}`,{cache:'no-store'});
  if(!r.ok){let msg='Download gagal';try{const d=await r.json();msg=d.error||msg}catch{}throw new Error(msg)}
  const blob=await r.blob();
  if(!blob.size) throw new Error('File kosong');
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url;a.download=`${item.slug}.zip`;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}

$('#searchForm').addEventListener('submit', async e=>{
  e.preventDefault(); const q=$('#searchInput').value.trim(); if(q.length<2)return toast('Masukkan minimal 2 karakter.');
  setStatus('Mencari font…'); $('#results').className='results'; $('#results').innerHTML='';
  try{
    const r=await fetch(`/api/search?q=${encodeURIComponent(q)}`); const data=await r.json(); if(!r.ok)throw new Error(data.error||'Gagal mencari.');
    renderResults(data.items||[]); setStatus(`${data.count||0} hasil ditemukan untuk “${q}”.`,true);
  }catch(err){setStatus(err.message); $('#results').className='results empty-state'; $('#results').innerHTML='<div class="empty-icon">!</div><h3>Pencarian belum berhasil</h3><p>Coba lagi atau gunakan Auto download.</p>'}
});
function setStatus(text,soft=false){const s=$('#status');s.textContent=text;s.classList.remove('hidden'); if(soft)setTimeout(()=>s.classList.add('hidden'),3000)}
function renderResults(items){
  const root=$('#results'); if(!items.length){root.className='results empty-state';root.innerHTML='<div class="empty-icon">⌕</div><h3>Tidak ada hasil</h3><p>Coba kata kunci lain atau gunakan Auto download.</p>';return}
  const hist=history(); root.className='results'; root.innerHTML='';
  items.forEach(item=>{
    const el=document.createElement('article');el.className='font-result'; const seen=hist.has(item.slug);
    el.innerHTML=`<div class="font-result-top"><div><h4>${escapeHtml(item.name)}</h4><span class="slug">${escapeHtml(item.slug)}</span></div></div>${seen?'<span class="visited">✓ pernah diunduh</span>':''}<div class="result-actions"><a class="btn secondary small" href="${item.pageUrl}" target="_blank" rel="noopener">Lisensi ↗</a><button class="btn primary small">+ Antrean</button></div>`;
    el.querySelector('button').addEventListener('click',()=>addQueue(item)); root.appendChild(el);
  })
}
function addQueue(item){if(queue.has(item.slug))return toast('Font itu sudah ada di antrean.');if(queue.size>=MAX_BATCH)return toast(`Maksimal ${MAX_BATCH} font per batch.`);queue.set(item.slug,item);renderQueue();toast(`${item.name} ditambahkan.`)}
function renderQueue(){
  $('#queueCount').textContent=`${queue.size} dipilih`; $('#queueSummary').textContent=`${queue.size} font`; const panel=$('#queuePanel'); panel.classList.toggle('hidden',queue.size===0);
  const list=$('#queueList'); list.innerHTML=''; queue.forEach(item=>{const row=document.createElement('div');row.className='queue-item';row.innerHTML=`<span class="qicon">Aa</span><div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.slug)}.zip</small></div><button class="remove-btn" aria-label="hapus">×</button>`;row.querySelector('button').onclick=()=>{queue.delete(item.slug);renderQueue()};list.appendChild(row)})
}
$('#clearQueue').onclick=()=>{queue.clear();renderQueue()};
$('#parseLinks').onclick=()=>{const lines=$('#bulkLinks').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);let added=0,bad=0;for(const line of lines){if(queue.size>=MAX_BATCH)break;const slug=slugFromPageUrl(line);if(!slug){bad++;continue}if(!queue.has(slug)){queue.set(slug,itemFromSlug(slug));added++}}renderQueue();toast(`${added} ditambahkan${bad?`, ${bad} link tidak valid`:''}.`)};
$('#clearHistory').onclick=()=>{localStorage.removeItem(historyKey);toast('Riwayat anti-duplikat sudah direset.')};
$('#downloadAll').onclick=async()=>{
  const btn=$('#downloadAll'); if(!queue.size)return; btn.disabled=true; const items=[...queue.values()]; const hist=history();
  for(let i=0;i<items.length;i++){
    const item=items[i]; btn.innerHTML=`Mengunduh ${i+1}/${items.length}…`;
    try {await downloadOne(item);hist.add(item.slug);localStorage.setItem(historyKey,JSON.stringify([...hist]));} catch(err){toast(`${item.name}: ${err.message}`)}
    await new Promise(r=>setTimeout(r,450));
  }
  btn.disabled=false;btn.innerHTML='Download semua <span>↓</span>';toast('Antrean download selesai. Cek folder Downloads browser.');
};

function renderLedger(){
  const total=ledger.reduce((a,x)=>a+(x.amount||0),0);$('#totalDonasi').textContent=money(total);$('#totalDisalurkan').textContent=money(total);$('#saldoAmanah').textContent=money(0);const body=$('#ledgerBody');
  if(!ledger.length){body.innerHTML='<div class="ledger-empty"><b>Belum ada transaksi publik.</b><br><small>Data akan ditampilkan setelah donasi pertama diterima dan/atau penyaluran pertama dilakukan.</small></div>';return}
  body.innerHTML=ledger.map(x=>`<div class="ledger-row"><small>${escapeHtml(x.date)}</small><b>${escapeHtml(x.title)}</b><span>${money(x.amount)}</span><span>${escapeHtml(x.status)}</span></div>`).join('')
}
renderLedger();renderQueue();$('#year').textContent=new Date().getFullYear();

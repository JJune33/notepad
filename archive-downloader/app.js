'use strict';
/* Archive Collection Studio. No external libraries or tracking. */
const API='https://archive.org',PAGE_SIZE=80,BATCH_SIZE=200,WORKERS=3;
const el=id=>document.getElementById(id);
const state={collection:'',query:'',items:[],selected:new Set(),meta:new Map(),page:0,busy:false,scanning:false,abort:null};
const html=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e;};
function parseCollection(value){
 let v=value.trim();if(!v)throw Error('Enter a collection URL or identifier.');
 if(/^https?:\/\//i.test(v)){
  const u=new URL(v);
  if(!['archive.org','www.archive.org'].includes(u.hostname.toLowerCase()))throw Error('Only archive.org links are supported.');
  const m=u.pathname.match(/^\/details\/([^/]+)/);if(!m)throw Error('Please paste an Archive.org collection page URL.');
  v=decodeURIComponent(m[1]);
 }
 v=v.replace(/^collection:/i,'');
 if(!/^[a-z0-9._~+%-]+$/i.test(v))throw Error('Invalid collection identifier.');
 return v;
}
const quoteSearch=v=>v.replace(/[\\"]/g,'\\$&');
function queryFor(id,term){
 const q='collection:'+id;
 return term.trim()?q+' AND (title:"'+quoteSearch(term.trim())+'" OR subject:"'+quoteSearch(term.trim())+'" OR description:"'+quoteSearch(term.trim())+'")':q;
}
function linkFor(id,path){return API+'/download/'+encodeURIComponent(id)+'/'+String(path).split('/').map(encodeURIComponent).join('/');}
function chosen(){return state.items.filter(x=>state.selected.has(x.identifier));}
function matching(file){
 const ext=el('format').value,n=String(file.name||'').toLowerCase();
 if(ext!=='all'&&!(ext==='jpg'?/\.(jpg|jpeg)$/.test(n):n.endsWith('.'+ext)))return false;
 return !el('originalOnly').checked||file.source==='original';
}
function selectedFiles(id){const m=state.meta.get(id);return m&&m.ok?m.files.filter(matching):[];}
function size(n){n=Number(n);if(!Number.isFinite(n)||n<0)return '—';if(!n)return '0 B';const u=['B','KB','MB','GB','TB'];let i=Math.min(4,Math.floor(Math.log(n)/Math.log(1024)));return (n/Math.pow(1024,i)).toFixed(i?1:0)+' '+u[i];}
function status(t,type){el('status').textContent=t;el('status').className='status '+(type||'');}
function progress(n,total){el('progressWrap').hidden=!total;el('progressBar').style.width=total?Math.min(100,Math.round(100*n/total))+'%':'0%';}
function buttons(){
 const active=state.selected.size>0,busy=state.busy||state.scanning;
 ['macScript','windowsScript','itemList','csvBtn','scanBtn'].forEach(id=>el(id).disabled=!active||busy);
 el('urlList').disabled=busy||!chosen().some(x=>state.meta.get(x.identifier)?.ok);
 el('findBtn').disabled=busy;
 el('cancelBtn').hidden=!busy;
 el('cancelBtn').textContent=state.scanning?'Stop scan':'Cancel search';
 el('exportHint').textContent=active?'Scripts download the matching files for selected items. Inspect files to export direct URLs and estimate total size. Downloads can be restarted.':'Select one or more items to enable exporting.';
}
function stats(){
 el('foundCount').textContent=state.items.length.toLocaleString();
 el('selectedCount').textContent=state.selected.size.toLocaleString();
 let count=0,bytes=0,inspected=0;
 chosen().forEach(x=>{if(state.meta.get(x.identifier)?.ok){inspected++;selectedFiles(x.identifier).forEach(f=>{count++;bytes+=Number(f.size)||0;});}});
 el('fileCount').textContent=inspected?count.toLocaleString():'—';
 el('sizeCount').textContent=inspected?size(bytes):'—';
 if(state.items.length)el('collectionSubtitle').textContent=state.items.length+' results loaded, '+state.selected.size+' selected, '+inspected+' selected items inspected.';
}
function filtered(){
 const q=el('localFilter').value.toLowerCase().trim();
 return q?state.items.filter(x=>(x.title+' '+x.identifier).toLowerCase().includes(q)):state.items;
}
function render(){
 const all=filtered(),pages=Math.max(1,Math.ceil(all.length/PAGE_SIZE));
 state.page=Math.min(state.page,pages-1);
 const start=state.page*PAGE_SIZE,visible=all.slice(start,start+PAGE_SIZE),root=el('items');root.replaceChildren();
 if(!visible.length){
  const empty=html('div','empty');empty.append(html('span','', '▦'),html('strong','',state.items.length?'No matching items':'No items loaded'),html('p','',state.items.length?'Try a different filter.':'Start by searching a collection.'));root.append(empty);
 }
 visible.forEach(item=>{
  const row=html('div','item'),check=html('input');check.type='checkbox';check.dataset.id=item.identifier;check.checked=state.selected.has(item.identifier);check.setAttribute('aria-label','Select '+item.title);
  const main=html('div','itemmain');main.append(html('div','itemtitle',item.title),html('div','itemid',item.identifier));
  const meta=state.meta.get(item.identifier);
  if(meta){
   const files=selectedFiles(item.identifier);
   main.append(html('div','itemmeta',meta.ok?files.length+' matching files · '+size(files.reduce((a,f)=>a+(Number(f.size)||0),0)):'Metadata unavailable'));
   if(files.length){
    const d=html('details','filedetails');d.append(html('summary','', 'View '+files.length+' matching files'));
    const links=html('div','filelinks');
    files.slice(0,60).forEach(f=>{const a=html('a','',f.name+' ('+size(f.size)+') ↗');a.href=linkFor(item.identifier,f.name);a.target='_blank';a.rel='noopener noreferrer';links.append(a);});
    if(files.length>60)links.append(html('span','','Showing first 60 files. Export the URL list to get all links.'));
    d.append(links);main.append(d);
   }
  }
  const actions=html('div','itemlinks'),a=html('a','','Open ↗');a.href=API+'/details/'+encodeURIComponent(item.identifier);a.target='_blank';a.rel='noopener noreferrer';actions.append(a);
  row.append(check,main,actions);root.append(row);
 });
 el('pageInfo').textContent=all.length?'Showing '+(start+1)+'–'+(start+visible.length)+' of '+all.length:'Showing 0 of 0';
 el('prevPage').disabled=!state.page;el('nextPage').disabled=state.page>=pages-1;
 stats();buttons();
}
function delay(ms,signal){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve();},ms);
  function stop(){clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));}
  if(signal?.aborted)stop();else signal?.addEventListener('abort',stop,{once:true});
 });
}
async function getJSON(url,signal){
 for(let i=0;i<3;i++){
  try{
   const res=await fetch(url,{signal});
   if((res.status===429||res.status>=500)&&i<2){await delay(700*Math.pow(2,i),signal);continue;}
   if(!res.ok)throw Error('Archive.org returned HTTP '+res.status);
   return await res.json();
  }catch(err){
   if(signal.aborted)throw err;
   if(i===2||!/fetch|network|load failed|timeout/i.test(err.message))throw err;
   await delay(700*Math.pow(2,i),signal);
  }
 }
}
async function find(event){
 event.preventDefault();if(state.busy)return;
 let id;try{id=parseCollection(el('collection').value);}catch(err){status(err.message,'error');return;}
 state.collection=id;state.query=queryFor(id,el('searchTerm').value);
 state.items=[];state.selected.clear();state.meta.clear();state.page=0;el('localFilter').value='';
 el('collectionTitle').textContent=id;
 state.busy=true;state.abort=new AbortController();buttons();status('Searching Archive.org…');progress(0,1);render();
 const seen=new Set();let total=0,page=1;
 try{
  do{
   const p=new URLSearchParams({q:state.query,rows:String(BATCH_SIZE),page:String(page),output:'json'});
   ['identifier','title'].forEach(f=>p.append('fl[]',f));p.append('sort[]','identifier asc');
   const result=await getJSON(API+'/advancedsearch.php?'+p.toString(),state.abort.signal);
   const docs=result.response?.docs;
   if(!Array.isArray(docs))throw Error('Unexpected Advanced Search response');
   total=Number(result.response.numFound)||0;
   docs.forEach(d=>{if(typeof d.identifier==='string'&&!seen.has(d.identifier)){seen.add(d.identifier);state.items.push({identifier:d.identifier,title:String(d.title||d.identifier)});}});
   status('Loaded '+state.items.length+' of '+total+' items…');progress(state.items.length,Math.max(1,total));
   if(!docs.length)break;page++;
   if(page>51)throw Error('Search is limited to 10,000 sorted results. Narrow your query');
  }while(state.items.length<total);
  status('Loaded '+state.items.length+' unique items.','good');
 }catch(err){status(state.abort.signal.aborted?'Search cancelled.':err.message+' (partial results remain available).','error');}
 finally{state.selected=new Set(state.items.map(x=>x.identifier));state.busy=false;progress(0,0);render();}
}
async function inspect(){
 if(state.busy)return;
 const ids=chosen().map(x=>x.identifier).filter(id=>!state.meta.get(id)?.ok);
 if(!ids.length){status('All selected items with available metadata have already been inspected.','good');return;}
 state.busy=true;state.scanning=true;state.abort=new AbortController();const signal=state.abort.signal;
 let cursor=0,finished=0,failed=0;buttons();progress(0,ids.length);
 async function worker(){
  while(cursor<ids.length&&!signal.aborted){
   const id=ids[cursor++];
   try{
    const json=await getJSON(API+'/metadata/'+encodeURIComponent(id),signal);
    if(!Array.isArray(json.files))throw Error('File metadata unavailable');
    state.meta.set(id,{ok:true,files:json.files.filter(x=>typeof x.name==='string')});
   }catch(err){if(signal.aborted)return;failed++;state.meta.set(id,{ok:false,files:[]});}
   finished++;progress(finished,ids.length);status('Inspected '+finished+' of '+ids.length+' items'+(failed?', '+failed+' unavailable':'')+'…');
   if(finished%8===0||finished===ids.length){render();await Promise.resolve();}
  }
 }
 try{await Promise.all(Array.from({length:Math.min(WORKERS,ids.length)},worker));}
 finally{
  const cancelled=signal.aborted;state.busy=false;state.scanning=false;progress(0,0);render();
  status((cancelled?'Inspection stopped: ':'Inspection complete: ')+finished+' of '+ids.length+' items checked'+(failed?', '+failed+' unavailable':'')+'.',cancelled||failed?'':'good');
 }
}
function download(filename,text,mime){
 const url=URL.createObjectURL(new Blob([text],{type:mime||'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);
}
const slug=()=>String(state.collection||'archive').replace(/[^a-z0-9_-]/gi,'_').slice(0,70);
function options(){
 const ext=el('format').value,o=[];
 if(ext==='jpg')o.push('--glob=*.jpg','--glob=*.jpeg','--glob=*.JPG','--glob=*.JPEG');
 else if(ext!=='all')o.push('--glob=*.'+ext,'--glob=*.'+ext.toUpperCase());
 if(el('originalOnly').checked)o.push('--source=original');
 o.push('--checksum','--destdir=Archive_Downloads');return o;
}
const sq=v=>"'"+String(v).replace(/'/g,"'\\''")+"'";
function shell(){
 const ids=chosen().map(x=>x.identifier),marker='ARCHIVE_STUDIO_IDS';
 // Identifiers are written as data, never evaluated as shell commands.
 return ['#!/usr/bin/env bash','set -euo pipefail','cd "$(dirname "$0")"','if ! command -v ia >/dev/null 2>&1; then','  echo "Install first: python3 -m pip install internetarchive"','  exit 1','fi','mkdir -p Archive_Downloads','ids_file="$(mktemp)"','trap \'rm -f "$ids_file"\' EXIT','cat > "$ids_file" <<\''+marker+"'",ids.join('\n'),marker,'ia download --itemlist "$ids_file" '+options().map(sq).join(' '),'echo "Done. See Archive_Downloads."',''].join('\n');
}
function powershell(){
 const ids=chosen().map(x=>x.identifier).map(v=>"  '"+v.replace(/'/g,"''")+"'").join(',\n'),opts=options().map(v=>"'"+v.replace(/'/g,"''")+"'").join(', ');
 return ["# Archive Collection Studio","$ErrorActionPreference = 'Stop'","Set-Location $PSScriptRoot","if (-not (Get-Command ia -ErrorAction SilentlyContinue)) {","  Write-Host 'Install first: py -m pip install internetarchive'","  exit 1","}","$ids = @(",ids,")","$opts = @("+opts+")","New-Item -ItemType Directory -Force -Path 'Archive_Downloads' | Out-Null","$tempFile = [IO.Path]::GetTempFileName()","try {","  [IO.File]::WriteAllLines($tempFile, [string[]]$ids, (New-Object Text.UTF8Encoding($false)))","  & ia download --itemlist $tempFile @opts","  $code = $LASTEXITCODE","} finally { Remove-Item $tempFile -ErrorAction SilentlyContinue }","if ($code -ne 0) { exit $code }","Write-Host 'Done. See Archive_Downloads.'",""].join('\n');
}
function urlList(){
 const urls=[];let skipped=0;
 chosen().forEach(x=>{if(!state.meta.get(x.identifier)?.ok){skipped++;return;}selectedFiles(x.identifier).forEach(f=>urls.push(linkFor(x.identifier,f.name)));});
 if(!urls.length){status('No matching URLs. Inspect the items or change file format.','error');return;}
 download(slug()+'_urls.txt',urls.join('\n')+'\n');
 status('Exported '+urls.length+' links'+(skipped?', '+skipped+' items not inspected':'')+'.','good');
}
function csvCell(v){v=String(v??'');if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
function inventory(){
 const rows=[['identifier','title','filename','format','source','bytes','url','status']];
 chosen().forEach(x=>{
  const meta=state.meta.get(x.identifier);
  if(!meta?.ok){rows.push([x.identifier,x.title,'','','','','',meta?'metadata unavailable':'not inspected']);return;}
  const files=selectedFiles(x.identifier);
  if(!files.length){rows.push([x.identifier,x.title,'','','','','','no matching files']);return;}
  files.forEach(f=>rows.push([x.identifier,x.title,f.name,f.format||'',f.source||'',f.size||'',linkFor(x.identifier,f.name),'available']));
 });
 download(slug()+'_inventory.csv','\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n','text/csv;charset=utf-8');
}
el('searchForm').addEventListener('submit',find);
el('format').addEventListener('change',render);el('originalOnly').addEventListener('change',render);
el('localFilter').addEventListener('input',()=>{state.page=0;render();});
el('items').addEventListener('change',e=>{if(e.target.matches('input[type=checkbox][data-id]')){const id=e.target.dataset.id;if(e.target.checked)state.selected.add(id);else state.selected.delete(id);stats();buttons();}});
el('selectAll').addEventListener('click',()=>{filtered().forEach(x=>state.selected.add(x.identifier));render();});
el('selectNone').addEventListener('click',()=>{filtered().forEach(x=>state.selected.delete(x.identifier));render();});
el('prevPage').addEventListener('click',()=>{state.page--;render();el('items').scrollTop=0;});
el('nextPage').addEventListener('click',()=>{state.page++;render();el('items').scrollTop=0;});
el('cancelBtn').addEventListener('click',()=>state.abort?.abort());
el('scanBtn').addEventListener('click',inspect);
el('macScript').addEventListener('click',()=>download(slug()+'_download.sh',shell()));
el('windowsScript').addEventListener('click',()=>download(slug()+'_download.ps1',powershell()));
el('itemList').addEventListener('click',()=>download(slug()+'_items.txt',chosen().map(x=>x.identifier).join('\n')+'\n'));
el('urlList').addEventListener('click',urlList);
el('csvBtn').addEventListener('click',inventory);
render();

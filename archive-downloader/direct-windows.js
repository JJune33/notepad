'use strict';
(function () {
 const enc=new TextEncoder(),byId=id=>document.getElementById(id);
 const table=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0});
 function crc(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
 function zip(files){
  const chunks=[],central=[];let offset=0;
  const now=new Date(),time=(now.getHours()<<11)|(now.getMinutes()<<5)|Math.floor(now.getSeconds()/2),date=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
  const put=(v,pos,n,len)=>len===2?v.setUint16(pos,n,true):v.setUint32(pos,n>>>0,true);
  for(const [name,text] of files){
   const filename=enc.encode(name),body=enc.encode(text),sum=crc(body);
   const local=new Uint8Array(30+filename.length),d=new DataView(local.buffer);
   put(d,0,0x04034b50,4);put(d,4,20,2);put(d,6,2048,2);put(d,8,0,2);put(d,10,time,2);put(d,12,date,2);
   put(d,14,sum,4);put(d,18,body.length,4);put(d,22,body.length,4);put(d,26,filename.length,2);
   local.set(filename,30);chunks.push(local,body);
   const c=new Uint8Array(46+filename.length),v=new DataView(c.buffer);
   put(v,0,0x02014b50,4);put(v,4,20,2);put(v,6,20,2);put(v,8,2048,2);put(v,10,0,2);
   put(v,12,time,2);put(v,14,date,2);put(v,16,sum,4);put(v,20,body.length,4);put(v,24,body.length,4);
   put(v,28,filename.length,2);put(v,42,offset,4);c.set(filename,46);central.push(c);
   offset+=local.length+body.length;
  }
  const size=central.reduce((n,a)=>n+a.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
  put(e,0,0x06054b50,4);put(e,8,files.length,2);put(e,10,files.length,2);put(e,12,size,4);put(e,16,offset,4);
  return new Blob([...chunks,...central,end],{type:'application/zip'});
 }
 async function createPackage(){
  const button=byId('windowsDirectZip');
  if(typeof state==='undefined'||!state.selected.size)return;
  const initial=button.textContent;button.disabled=true;button.textContent='Creating Windows package…';
  try{
   const response=await fetch('windows-downloader.ps1',{cache:'no-cache'});
   if(!response.ok)throw Error('Windows downloader could not be loaded (HTTP '+response.status+').');
   const program=await response.text(),coll=String(state.collection||byId('collection').value).replace(/^.*\/details\//,'').split(/[?#]/)[0];
   const format=byId('format').value,originalOnly=byId('originalOnly').checked;
   const items=state.items.filter(item=>state.selected.has(item.identifier)).map(item=>{
    const record={identifier:item.identifier},metadata=(state.metadata||state.meta)?.get(item.identifier);
    if(metadata?.ok&&Array.isArray(metadata.files)){
     record.files=metadata.files.filter(f=>{
      const n=String(f.name||'').toLowerCase();
      return (!originalOnly||f.source==='original')&&(format==='all'||(format==='jpg'?/\.(jpg|jpeg)$/.test(n):n.endsWith('.'+format)));
     }).map(f=>({name:f.name,size:f.size,source:f.source||''}));
    }
    return record;
   });
   const config=JSON.stringify({collection:coll,allCollection:false,format,originalOnly,items},null,2);
   const starter='@echo off\r\nsetlocal\r\ncd /d "%~dp0"\r\ntitle Archive Collection Studio - Windows Downloader\r\npowershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows-downloader.ps1"\r\necho.\r\necho Press any key to close. Restart START_DOWNLOAD.cmd to resume.\r\npause >nul\r\n';
   const info='ARCHIVE COLLECTION STUDIO - WINDOWS\r\n\r\n1. Extract this ZIP completely to a folder with enough disk space.\r\n2. Double-click START_DOWNLOAD.cmd.\r\n3. PDFs are stored in Archive_Downloads grouped by item.\r\n4. You can stop and rerun to skip finished files and resume partial ones.\r\n5. See download-log.txt or failed-downloads.txt for details.\r\n\r\nNo Python or extra software is needed.\r\n';
   const file=zip([['START_DOWNLOAD.cmd',starter],['windows-downloader.ps1',program],['selection.json',config],['README.txt',info]]);
   const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=coll.replace(/[^a-z0-9_.-]/gi,'_')+'_Windows_Direct_Download.zip';
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   const message='Windows ZIP is ready for '+items.length+' selected items. Unzip it on your PC and double-click START_DOWNLOAD.cmd.';
   if(typeof setStatus==='function')setStatus(message,'good');else if(typeof status==='function')status(message,'good');
  }catch(e){if(typeof setStatus==='function')setStatus(e.message,'error');else if(typeof status==='function')status(e.message,'error');}
  finally{button.textContent=initial;button.disabled=false;}
 }
 byId('windowsDirectZip').addEventListener('click',createPackage);
 function update(){byId('windowsDirectZip').disabled=!(typeof state!=='undefined'&&state.selected.size>0&&!(state.fetching||state.scanning||state.busy));}
 update();document.addEventListener('change',()=>setTimeout(update,0));
 new MutationObserver(update).observe(byId('selectedCount'),{childList:true,characterData:true,subtree:true});
})();
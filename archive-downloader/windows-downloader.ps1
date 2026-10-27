# Archive Collection Studio v1.1 - Direct Windows Downloader
# PowerShell 5.1+, built into Windows. Requires no Python or third-party packages.
$ErrorActionPreference='Stop'
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Net.Http
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root
$configFile=Join-Path $root 'selection.json'
if(!(Test-Path -LiteralPath $configFile)){throw 'selection.json not found. Extract the complete ZIP first.'}
$config=Get-Content -LiteralPath $configFile -Raw -Encoding UTF8 | ConvertFrom-Json
$format=[string]$config.format
if($format -notin @('pdf','cbz','epub','zip','jpg','png','mp3','all')){throw 'Unsupported file format.'}
$originalOnly=$config.originalOnly -eq $true
$directory=Join-Path $root 'Archive_Downloads'
[IO.Directory]::CreateDirectory($directory)|Out-Null
$log=Join-Path $root 'download-log.txt'
$failedLog=Join-Path $root 'failed-downloads.txt'
function Log([string]$message){
 $stamp=Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
 Write-Host "[$stamp] $message"
 Add-Content -LiteralPath $log -Value "[$stamp] $message" -Encoding UTF8
}
function WaitRetry([int]$attempt){Start-Sleep -Seconds ([math]::Min(60,[int](4*[math]::Pow(2,$attempt-1))))}
function GetData([string]$url){
 for($n=1;$n -le 5;$n++){
  try{return Invoke-RestMethod -Uri $url -TimeoutSec 120 -Headers @{'User-Agent'='ArchiveCollectionStudio/1.1'}}
  catch{if($n -eq 5){throw};Log "Archive API retry $n/5: $($_.Exception.Message)";WaitRetry $n}
 }
}
function SafeName([string]$name){
 $result=[regex]::Replace($name,'[<>:"/\\|?*\x00-\x1f]','_').Trim().TrimEnd('.')
 if(!$result -or $result -eq '..'){$result='_unnamed'}
 if($result -match '^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])($|\.)'){$result='_'+$result}
 if($result.Length -gt 170){$result=$result.Substring(0,170)}
 return $result
}
function LocalPath([string]$id,[string]$filename){
 $dest=Join-Path $directory (SafeName $id)
 foreach($part in (($filename -replace '\\','/') -split '/')){$dest=Join-Path $dest (SafeName $part)}
 return $dest
}
function RemoteUrl([string]$id,[string]$filename){
 $parts=(($filename -replace '\\','/') -split '/')|ForEach-Object{[Uri]::EscapeDataString($_)}
 return ('https://archive.org/download/'+[Uri]::EscapeDataString($id)+'/'+($parts -join '/'))
}
function Matches([object]$file){
 $name=[string]$file.name
 if(!$name){return $false}
 if($originalOnly -and $file.source -ne 'original'){return $false}
 if($format -eq 'all'){return $true}
 if($format -eq 'jpg'){return $name -match '(?i)\.(jpe?g)$'}
 return $name.EndsWith('.'+$format,[StringComparison]::OrdinalIgnoreCase)
}
function LoadItems {
 $provided=@($config.items)
 if($provided.Count -gt 0){return $provided}
 if($config.allCollection -ne $true){throw 'No items were selected.'}
 $collection=[string]$config.collection
 if($collection -notmatch '^[a-zA-Z0-9._~+%-]+$'){throw 'Invalid collection identifier.'}
 $page=1;$items=New-Object System.Collections.Generic.List[object]
 do{
  $q=[Uri]::EscapeDataString('collection:'+$collection)
  $url="https://archive.org/advancedsearch.php?q=$q&fl%5B%5D=identifier&rows=200&page=$page&output=json&sort%5B%5D=identifier%20asc"
  $result=GetData $url;$total=[int]$result.response.numFound;$docs=@($result.response.docs)
  foreach($doc in $docs){if($doc.identifier){[void]$items.Add([pscustomobject]@{identifier=[string]$doc.identifier})}}
  Log "Found $($items.Count) of $total items"
  $page++
  if($page -gt 51 -and $items.Count -lt $total){throw '10,000 item search limit. Narrow the collection search.'}
 }while($docs.Count -gt 0 -and $items.Count -lt $total)
 return $items.ToArray()
}
$handler=[System.Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect=$true
$handler.AutomaticDecompression=[System.Net.DecompressionMethods]::None
$http=[System.Net.Http.HttpClient]::new($handler)
$http.Timeout=[TimeSpan]::FromMinutes(12)
$http.DefaultRequestHeaders.UserAgent.ParseAdd('ArchiveCollectionStudio/1.1')
$completed=0;$skipped=0;$failed=0
function Download([string]$id,[object]$file,[int]$index,[int]$total) {
 $name=[string]$file.name
 $dest=LocalPath $id $name;$temp=$dest+'.part'
 $expected=[long]0
 if($file.size){[void][long]::TryParse([string]$file.size,[ref]$expected)}
 [IO.Directory]::CreateDirectory((Split-Path -Parent $dest))|Out-Null
 if(Test-Path -LiteralPath $dest){
  $current=(Get-Item -LiteralPath $dest).Length
  if(($expected -gt 0 -and $current -eq $expected) -or ($expected -eq 0 -and $current -gt 0)){
   $script:skipped++;Log "[$index/$total] SKIP $id / $name";return
  }
 }
 $url=RemoteUrl $id $name
 for($attempt=1;$attempt -le 6;$attempt++){
  $req=$null;$resp=$null;$readStream=$null;$output=$null
  try{
   $offset=[long]0
   if(Test-Path -LiteralPath $temp){$offset=(Get-Item -LiteralPath $temp).Length}
   if($expected -gt 0 -and $offset -eq $expected){
    Move-Item -LiteralPath $temp -Destination $dest -Force
    $script:completed++;Log "[$index/$total] VERIFIED $id / $name";return
   }
   if($expected -gt 0 -and $offset -gt $expected){Remove-Item -LiteralPath $temp -Force;$offset=0}
   $req=[System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get,$url)
   if($offset -gt 0){$req.Headers.Range=[System.Net.Http.Headers.RangeHeaderValue]::new($offset,$null)}
   $resp=$http.SendAsync($req,[System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
   $code=[int]$resp.StatusCode
   if($code -notin @(200,206)){throw "Download HTTP $code"}
   $append=($offset -gt 0 -and $code -eq 206)
   if($append -and (!$resp.Content.Headers.ContentRange -or $resp.Content.Headers.ContentRange.From -ne $offset)){
    throw 'Server sent an unexpected Content-Range.'
   }
   Log "[$index/$total] $(if($append){'RESUME'}else{'GET'}) $id / $name"
   $mode=if($append){[IO.FileMode]::Append}else{[IO.FileMode]::Create}
   $readStream=$resp.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
   $output=[IO.FileStream]::new($temp,$mode,[IO.FileAccess]::Write,[IO.FileShare]::None)
   $buffer=New-Object byte[] (1024*1024)
   while(($count=$readStream.Read($buffer,0,$buffer.Length)) -gt 0){$output.Write($buffer,0,$count)}
   $output.Flush();$output.Dispose();$output=$null;$readStream.Dispose();$readStream=$null
   if($expected -gt 0 -and (Get-Item -LiteralPath $temp).Length -ne $expected){throw 'Incomplete download, will retry.'}
   Move-Item -LiteralPath $temp -Destination $dest -Force
   $script:completed++;Log "[$index/$total] OK $id / $name";return
  }catch{
   if($attempt -eq 6){
    $script:failed++;Log "FAILED $id / $name : $($_.Exception.Message)"
    Add-Content -LiteralPath $failedLog -Value ($id+' | '+$name+' | '+$_.Exception.Message) -Encoding UTF8
   }else{Log "Retry $attempt/6 for $id / $name : $($_.Exception.Message)";WaitRetry $attempt}
  }finally{
   if($output){$output.Dispose()}
   if($readStream){$readStream.Dispose()}
   if($resp){$resp.Dispose()}
   if($req){$req.Dispose()}
  }
 }
}
try{
 Log 'Archive Collection Studio 1.1 - Windows direct downloader'
 Log "Format: $format. Originals only: $originalOnly"
 $items=@(LoadItems)
 if(!$items.Count){throw 'No Archive items found.'}
 Log "Processing $($items.Count) items"
 $number=0
 foreach($item in $items){
  $number++;$id=[string]$item.identifier
  if($id -notmatch '^[a-zA-Z0-9._~+%-]+$'){Log "Skipping invalid item identifier: $id";continue}
  try{
   if(($item.PSObject.Properties.Name -contains 'files') -and $null -ne $item.files){$files=@($item.files)}
   else{$metadata=GetData ('https://archive.org/metadata/'+[Uri]::EscapeDataString($id));$files=@($metadata.files)}
  }catch{
   $failed++;Log "FAILED metadata for $id : $($_.Exception.Message)"
   Add-Content -LiteralPath $failedLog -Value ($id+' | metadata | '+$_.Exception.Message) -Encoding UTF8
   continue
  }
  $selectedFiles=@($files|Where-Object{Matches $_})
  Log "ITEM $number/$($items.Count): $id; $($selectedFiles.Count) matching files"
  $fileNumber=0
  foreach($file in $selectedFiles){$fileNumber++;Download $id $file $fileNumber $selectedFiles.Count}
 }
 Log "Finished. Downloaded: $completed; Already present: $skipped; Failed: $failed"
 Log 'Run START_DOWNLOAD.cmd again to resume or retry downloads.'
 if($failed){Write-Host 'Some files failed. Check failed-downloads.txt.' -ForegroundColor Yellow}
}catch{Log "STOPPED: $($_.Exception.Message)";exit 1}
finally{if($http){$http.Dispose()};if($handler){$handler.Dispose()}}

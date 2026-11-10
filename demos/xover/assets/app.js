import {initMap,setView,bbox,renderResults,clearResults,exportGeoJSON,fitResults} from './map.js';
import {verificationToken} from './verification.js';
const $=id=>document.getElementById(id);
const API='https://osm-api.wanzhuoyue.com/api/xover';
let config=null,samples=[],busy=false,activeSample="accessible-transit";
const labels={verified:'1 · Human verification complete',selection:'2 · C2: selecting cross-lingual examples',generation:'3 · Preparing three candidate queries',execution:'4 · Executing candidate queries',selection_candidates:'5 · C3: comparing execution results',revision:'6 · C4: checking hygiene and syntax'};
const sourceLabel={precomputed:'research precomputation',persistent:'saved cache',memory:'memory cache',computed:'new computation',generated:'new generation'};
function status(message,error=false){$('status').textContent=message;$('status').className=error?'error':'';}
function stage(key,text){let li=$('stages').querySelector(`[data-stage="${key}"]`);if(!li){li=document.createElement('li');li.dataset.stage=key;$('stages').append(li);}li.textContent=text;}
function element(tag,text,parent){const e=document.createElement(tag);e.textContent=text;parent.append(e);return e;}
function setBusy(value){busy=value;for(const id of ['ask','question','language'])$(id).disabled=value; document.querySelectorAll('[data-sample]').forEach(b=>b.disabled=value); $('ask').textContent=value?'Working through XOver…':'Ask XOver';$('results').setAttribute('aria-busy',String(value));}
const icons={transit:'<rect x="4" y="2" width="12" height="13" rx="3"/><path d="M4 9h12M7 15l-2 3m8-3 2 3M7 12h.01M13 12h.01"/>',library:'<path d="M2 7h16L10 2 2 7Zm2 2v7m4-7v7m4-7v7m4-7v7M2 18h16"/>',cafe:'<path d="M4 6h10v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V6ZM14 7h1a2.5 2.5 0 0 1 0 5h-1M3 17h12M6 2v2m4-2v2"/>'};
function renderSamples(){
 $('samples').replaceChildren();
 for(const s of samples.filter(s=>s.language===$('language').value)){
  const button=document.createElement('button');button.type='button';button.className='sample'+(s.id===activeSample?' active':'');button.dataset.sample=s.id;button.setAttribute('aria-pressed',String(s.id===activeSample));
  const icon=element('span','',button);icon.className='sample-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4">'+icons[s.icon]+'</svg>';
  const copy=element('span','',button);copy.className='sample-copy';element('span',s.label,copy).className='sample-title';element('small',s.detail,copy);
  element('span','↗',button).className='sample-arrow';button.title=s.question;button.addEventListener('click',()=>{activeSample=s.id;sample();});$('samples').append(button);
 }
}
function sample(){const s=samples.find(s=>s.language===$('language').value && s.id===activeSample);if(!s)return;renderSamples();$('question').value=s.question;$('question').lang=s.language;setView(s.center,s.zoom);clearResults();$('results').hidden=true;$('download').disabled=true;$('result-count').textContent='Ready to explore';$('place-title').firstChild.textContent=s.place+' ';$('place-type').textContent=s.category;$('legend-label').textContent=s.category;$('stages').replaceChildren();if(config)status('Ready. Ask XOver to explore this example.');}

function show(result,elapsed){
 $('results').hidden=false;$('query').textContent=result.query;$('turbo').href='https://overpass-turbo.eu/?Q='+encodeURIComponent(result.query);
 const count=renderResults(result.result);$('result-count').textContent=`${count.count.toLocaleString()} ${count.isCount?'matching elements':'mapped places'}`;
 $('result-info').textContent='Project OSM snapshot · '+(result.cache?.hit?'saved map result':'executed query');$('download').disabled=count.features===0;
 $('timing').textContent=`${(elapsed/1000).toFixed(2)} s total · ${((result.timings?.server_ms||0)/1000).toFixed(2)} s server`;
 $('provenance').textContent=(result.answer_cache?'Complete query reused from cache. ':'')+`Examples: ${sourceLabel[result.selection.cache_source]||result.selection.cache_source}. Candidates: ${sourceLabel[result.generation.source]||result.generation.source} · ${result.generation.model}. `+(result.model_usage?.length?`${result.model_usage.length} new model calls.`:'No new model calls.')+` Selection: ${result.candidate_selection.method}. `+(result.revision.syntax_repaired?'One syntax repair applied.':'No syntax repair needed.')+(result.revision.hygiene_changed?' Output formatting cleaned.':'');
 $('examples').replaceChildren();$('examples-title').textContent=`${result.selection.examples.length} selected English examples`;
 for(const ex of result.selection.examples){const wrap=element('article','',$('examples'));wrap.className='example';element('p',`${ex.rank}. ${ex.nl}`,wrap);element('pre',ex.ovq,wrap);}
 $('candidates').replaceChildren();for(const c of result.candidates){const card=element('article','',$('candidates'));card.className='candidate'+(c.selected?' selected':'');element('h4',`Candidate ${c.index}${c.selected?' · selected':''}`,card);element('p',c.ok?`${c.count} returned elements${c.cache?.hit?' · map cache hit':''}`:'Could not execute',card);element('pre',c.query,card);}
 stage('complete',result.answer_cache?'Completed · saved query reused':'Completed · results ready');status('XOver completed the query.');
}
async function run(){
 if(busy||!config)return;const question=$('question').value.trim();if(!question){status('Enter a question first.',true);return;}
 const request={question,language:$('language').value,bbox:bbox()};const start=performance.now();setBusy(true);$('stages').replaceChildren();$('results').hidden=true;clearResults();$('download').disabled=true;
 let reader;const controller=new AbortController();let timer;
 try{
  stage('verification','1 · Waiting for browser verification');
  const token=await verificationToken(config.turnstile?.enabled?config.turnstile:null,message=>status(message));
  timer=setTimeout(()=>controller.abort(),250000);
  const headers={'Content-Type':'application/json'};if(token)headers['X-Turnstile-Token']=token;
  const response=await fetch(API+'/query',{method:'POST',headers,body:JSON.stringify(request),signal:controller.signal});
  if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(typeof data.detail==='string'?data.detail:`Service returned HTTP ${response.status}.`);}
  reader=response.body.getReader();const decoder=new TextDecoder();let buffer='',completed=false;
  function handle(line){if(!line.trim())return;const event=JSON.parse(line);
   if(event.stage==='error')throw new Error(event.detail||'Query failed.');
   if(labels[event.stage]){if(event.stage==='verified')$('stages').querySelector('[data-stage="verification"]')?.remove();stage(event.stage,labels[event.stage]);status(event.message||labels[event.stage]);}
   if(event.stage==='selection_done')stage('selection',`2 · C2 examples: ${sourceLabel[event.source]||event.source} · ${(event.elapsed_ms/1000).toFixed(2)} s`);
   if(event.stage==='candidate_generated')stage('generation',`3 · Generated candidate ${event.index} / ${event.total}`);
   if(event.stage==='generation_done')stage('generation',`3 · Candidates: ${sourceLabel[event.source]||event.source} · ${(event.elapsed_ms/1000).toFixed(2)} s`);
   if(event.stage==='candidate_executed')stage('execution',`4 · Executed ${event.index} / 3 candidates${event.cache_hit?' · map cache hit':''}`);
   if(event.stage==='complete'){completed=true;show(event.data,performance.now()-start);}
  }
  while(true){const {value,done}=await reader.read();buffer+=decoder.decode(value,{stream:!done});let n;while((n=buffer.indexOf('\n'))>=0){handle(buffer.slice(0,n));buffer=buffer.slice(n+1);}if(done)break;}
  if(buffer.trim())handle(buffer);if(!completed)throw new Error('The connection ended before the query completed. Please retry.');
 }catch(error){const message=error.name==='AbortError'?'The query timed out. Please retry.':error.message;stage('stopped','Stopped · '+message);status(message,true);}
 finally{clearTimeout(timer);try{await reader?.cancel();}catch{}setBusy(false);}
}
$('ask').addEventListener('click',run);$('language').addEventListener('change',sample);$('download').addEventListener('click',exportGeoJSON);
try{initMap();setView([40.705,17.339],14);samples=await (await fetch(new URL('../showcases.json',import.meta.url))).json();sample();
 const response=await fetch(API+'/config',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Could not connect to XOver.');config=await response.json();if(!config.generation_available)throw new Error('XOver generation is currently unavailable.');$('ask').disabled=false;$('ask').textContent='Ask XOver';status('Ready. Select a language or write your own question.');
}catch(error){status(error.message,true);$('ask').disabled=true;$('ask').textContent='Service unavailable';}

$('fit-map').addEventListener('click',fitResults);
$('about-link').addEventListener('click',e=>{e.preventDefault();$('about-dialog').showModal();});
$('close-about').addEventListener('click',()=>$('about-dialog').close());

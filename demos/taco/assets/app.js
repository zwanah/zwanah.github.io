import {discoverBackend,generate,queryMap,execute,request,PREVIEW_TOKEN_BUDGET,tokenBudgetSettings} from './api.js';
import {initMap,setView,bbox,fitResults,clearResults,renderResults,exportGeoJSON} from './map.js';

const $=id=>document.getElementById(id);
let samples=[];
let selected=null;
let live=false;
let execution=false;
let busy=false;
let sampleVersion=0;
let budgetBounds={...PREVIEW_TOKEN_BUDGET};
let budgetEdited=false;
let budgetNotice='';
let lastSelection=null;
let verification=null;
let turnstileApi=null;
let queryStream=false;

function renderBudget() {
  const value=Number($('budget').value);
  $('budget-value').replaceChildren(document.createTextNode(value.toLocaleString()+' '));
  const unit=document.createElement('span');unit.textContent='tokens';$('budget-value').append(unit);
  $('budget-min').textContent=budgetBounds.min.toLocaleString();$('budget-max').textContent=budgetBounds.max.toLocaleString();
  $('budget-note').textContent=budgetNotice || 'Applies to your next question · TACO / ICL selection.';
  const usage=$('budget-usage');usage.hidden=!lastSelection;
  if(lastSelection) usage.textContent=`Last selection: ${lastSelection.used.toLocaleString()} / ${lastSelection.budget.toLocaleString()} DeepSeek tokens.${value!==lastSelection.budget?` Next request: ${value.toLocaleString()} tokens.`:''}`;
}
function configureBudget(settings) {
  const previous=Number($('budget').value);
  budgetBounds=tokenBudgetSettings(settings);
  const target=budgetEdited?Math.max(budgetBounds.min,Math.min(budgetBounds.max,budgetBounds.min+Math.round((previous-budgetBounds.min)/budgetBounds.step)*budgetBounds.step)):budgetBounds.default;
  $('budget').min=String(budgetBounds.min);$('budget').max=String(budgetBounds.max);$('budget').step=String(budgetBounds.step);$('budget').value=String(target);
  if(budgetEdited && target!==previous) budgetNotice=`The service range changed. Your next request now uses ${target.toLocaleString()} DeepSeek tokens.`;
  renderBudget();
}

function status(message,type='') { $('status').textContent=message;$('status').className=type; }

async function loadTurnstile() {
  if(turnstileApi) return turnstileApi;
  turnstileApi=await new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=osmTacoTurnstileReady';
    script.async=true;
    const finish=api=>{
      clearTimeout(timer);
      script.onerror=null;
      delete window.osmTacoTurnstileReady;
      if(api) resolve(api);
      else {
        script.remove();
        reject(new Error('Browser verification could not load. Allow challenges.cloudflare.com and try again.'));
      }
    };
    const timer=setTimeout(finish,12000);
    script.onerror=()=>finish();
    window.osmTacoTurnstileReady=()=>finish(window.turnstile);
    document.head.append(script);
  });
  return turnstileApi;
}

async function verificationToken(action) {
  if(!verification) return undefined;
  if(typeof verification.site_key!=='string' || !verification.site_key.trim()) throw new Error('Browser verification is unavailable. Please try again later.');
  status('Checking browser verification…');
  const api=await loadTurnstile();
  const widget=$('turnstile-widget');
  let widgetId,timer;
  try {
    return await new Promise((resolve,reject)=>{
      const fail=message=>reject(new Error(message));
      const failed='Browser verification failed. Please try again.';
      const timedOut=()=>fail('Browser verification timed out. Please try again.');
      timer=setTimeout(timedOut,120000);
      try {
        widgetId=api.render(widget,{
          sitekey:verification.site_key,
          action,
          appearance:'interaction-only',
          execution:'render',
          size:'compact',
          retry:'never',
          'refresh-expired':'never',
          'refresh-timeout':'never',
          'response-field':false,
          callback:token=>typeof token==='string' && token ? resolve(token) : fail(failed),
          'before-interactive-callback':()=>{
            status('Complete the browser verification to continue.');
            requestAnimationFrame(()=>{if(widgetId) widget.scrollIntoView({block:'nearest'});});
          },
          'error-callback':()=>{fail(failed);return true;},
          'expired-callback':()=>fail('Browser verification expired. Please try again.'),
          'timeout-callback':timedOut,
          'unsupported-callback':()=>fail('This browser cannot complete verification. Try another browser.'),
        });
        if(!widgetId) fail(failed);
      } catch {fail(failed);}
    });
  } finally {
    clearTimeout(timer);
    try {if(widgetId) api.remove(widgetId);}
    finally {widgetId=null;widget.replaceChildren();}
  }
}

function setBusy(value,action='') {
  busy=value;
  $('answer-section').setAttribute('aria-busy',String(value));
  $('generate').disabled=value;$('run-query').disabled=value || !execution;$('retry-map').disabled=value || !execution;
  $('question').disabled=value;$('budget').disabled=value;$('query').disabled=value;
  document.querySelectorAll('[data-sample]').forEach(b=>b.disabled=value);
  $('generate-label').textContent=value && action==='generate' ? 'Finding places…' : value && action==='execute'?'Searching the map…':live?'Ask the map':'Explore example';
  $('run-query').querySelector('span').textContent=value && action==='execute'?'Searching project data…':execution?'Run on project OSM':'Live queries not connected';
}
function turboLink() { $('turbo-link').href=`https://overpass-turbo.eu/?Q=${encodeURIComponent($('query').value)}`; }
function clearContext() {
  lastSelection=null;renderBudget();
  $('context-count').textContent='—';
  $('context-content').replaceChildren();
  const p=document.createElement('p');p.textContent='In live mode, the examples selected for your question appear here with their prompt budget.';
  const note=document.createElement('p');note.className='muted';note.textContent='Preview queries are curated. They do not make a model call.';
  $('context-content').append(p,note);
}
function resetResults() {
  $('retry-map').hidden=true;
  $('answer-text').textContent='Run the query to see matching places on the map.';
  clearResults();$('download-results').disabled=true;$('result-count').textContent='Ready to explore';$('result-note').textContent='Sample query loaded';$('data-origin').textContent='Run the query against project OSM data';$('map-badge-text').textContent='OpenStreetMap';
}
function resultSummary(result,source) {
  const info=renderResults(result);
  $('result-count').textContent=`${info.count.toLocaleString()} ${info.isCount?'matches':'places found'}`;
  $('result-note').textContent=source;
  $('answer-text').textContent=info.isCount
    ? `Your query counted ${info.count.toLocaleString()} matching OSM elements. It did not request locations to display on the map.`
    : info.count===0 ? 'No places matched this query. Try a broader area or different search conditions.'
    : 'These places match the query. Select a place below or on the map to explore its details.';
  $('download-results').disabled=info.features===0;
  return info;
}
async function chooseSample(id) {
  if(busy) return;
  $('query-stages').hidden=true;
  const version=++sampleVersion;
  selected=samples.find(s=>s.id===id) || samples[0];
  $('question').value=selected.question;$('query').value=selected.query;
  $('place-title').firstChild.textContent=selected.place+' ';$('place-type').textContent=selected.category;$('legend-label').textContent=selected.category;
  document.querySelectorAll('[data-sample]').forEach(b=>b.classList.toggle('active',b.dataset.sample===selected.id));
  $('query-source').lastChild.textContent=' Curated example · editable';
  clearContext();resetResults();setView(selected.center,selected.zoom);turboLink();
  status('Curated query loaded. Live queries run on the project Overpass service when connected.');
  if(selected.snapshot) {
    try {
      const data=await request(new URL(`../data/${selected.snapshot}`,import.meta.url),{},7000);
      if(version!==sampleVersion || busy) return;
      const info=resultSummary(data,`Sample · ${selected.capability || 'curated query'}`);
      $('map-badge-text').textContent=`${selected.category} · sample snapshot`;
      const date=data.osm3s?.timestamp_osm_base?.slice(0,10) || selected.snapshotDate || 'source date unavailable';
      $('data-origin').textContent=`OSM snapshot · ${date} · not a live response`;
      status(`Showing ${info.count} sample places · OSM data ${date}.${selected.note?' '+selected.note:''}`);
    } catch { /* A snapshot is optional; the live query remains usable. */ }
  }
}
function renderContext(data) {
  const stats=data.selection;
  if(Number.isFinite(stats.used_tokens) && Number.isFinite(stats.budget)) lastSelection={used:stats.used_tokens,budget:stats.budget};
  renderBudget();
  $('context-count').textContent=String(data.examples.length);
  const content=$('context-content');content.replaceChildren();
  const stat=document.createElement('div');stat.className='context-stat';stat.textContent=`${stats.num_selected} examples · ${stats.used_tokens.toLocaleString()} / ${stats.budget.toLocaleString()} DeepSeek selection tokens`;content.append(stat);
  const addMetadata=(label,value)=>{
    if(value===undefined || value===null || value==='') return;
    const note=document.createElement('p');note.className='muted';note.style.overflowWrap='anywhere';
    note.textContent=`${label}: ${typeof value==='object'?JSON.stringify(value):value}`;content.append(note);
  };
  addMetadata('Selector',stats.algorithm);
  addMetadata('Retrieval',data.retrieval_mode);
  addMetadata('Model',data.model);
  if(data.cache?.hit) {
    addMetadata('Generation', 'Cached response · no new model call');
    if(data.cache.created_at) addMetadata('Originally cached',data.cache.created_at);
    const usage=data.cache.original_model_usage;
    if(usage) addMetadata('Historical model usage (not billed again)',usage);
  }
  if(Number.isFinite(stats.pool_size)) addMetadata('Example pool',`${stats.pool_size.toLocaleString()} examples`);
  if(stats.pool_sizes && typeof stats.pool_sizes==='object') addMetadata('Pool splits',Object.entries(stats.pool_sizes).map(([split,size])=>`${split}: ${Number.isFinite(size)?size.toLocaleString():size}`).join(' · '));
  addMetadata('Base encoder',stats.base_model);
  addMetadata('Influence encoder',stats.influence_model);
  addMetadata('Influence checkpoint',stats.influence_checkpoint);
  if(stats.parameters && typeof stats.parameters==='object') addMetadata('Selection parameters',Object.entries(stats.parameters).map(([name,value])=>`${name}=${typeof value==='object'?JSON.stringify(value):value}`).join(' · '));
  addMetadata('Selection token accounting',stats.token_count_method);
  addMetadata('Selection tokenizer',stats.tokenizer_model);
  if(Number.isFinite(stats.query_tokens)) addMetadata('Question tokens (DeepSeek)',stats.query_tokens.toLocaleString());
  if(Number.isFinite(stats.examples_tokens)) addMetadata('Example tokens (DeepSeek)',stats.examples_tokens.toLocaleString());
  const inputTokens=stats.model_input_tokens ?? data.model_input_tokens;
  if(Number.isFinite(inputTokens)) addMetadata('Model input tokens (API usage)',inputTokens.toLocaleString());
  data.examples.forEach(ex=>{
    const details=document.createElement('details');details.className='context-example';
    const summary=document.createElement('summary');summary.textContent=`${ex.rank}. ${ex.nl}`;
    const pre=document.createElement('pre');pre.textContent=ex.ovq;
    const scores=[];
    if(Number.isFinite(ex.similarity_score)) scores.push(`Base similarity ${ex.similarity_score.toFixed(4)}`);
    if(Number.isFinite(ex.influence_score)) scores.push(`Influence score ${ex.influence_score.toFixed(4)}`);
    if(!scores.length && Number.isFinite(ex.score)) scores.push(`Selection score ${ex.score.toFixed(4)}`);
    const source=[];
    if(typeof ex.split==='string') source.push(ex.split);
    if(Number.isInteger(ex.sample_index)) source.push(`sample ${ex.sample_index}`);
    if(Number.isInteger(ex.example_index)) source.push(`pool index ${ex.example_index}`);
    const meta=document.createElement('small');meta.textContent=[scores.join(' · '),source.join(' · ')].filter(Boolean).join(' | ');
    details.append(summary,meta,pre);content.append(details);
  });
  if(!data.examples.length){const empty=document.createElement('p');empty.textContent='No example fitted within this prompt budget.';content.append(empty);}
}

$('budget').addEventListener('input',()=>{budgetEdited=true;budgetNotice='';renderBudget();});
$('budget-info').addEventListener('click',()=>{budgetNotice='TACO uses the original DeepSeek token costs for example selection. Model API usage is reported separately in Research details. Changes apply to your next question.';renderBudget();});
$('question').addEventListener('input',()=>{document.querySelectorAll('[data-sample]').forEach(b=>b.classList.remove('active'));});
$('query').addEventListener('input',()=>{turboLink();++sampleVersion;resetResults();$('query-source').lastChild.textContent=' Edited query';clearContext();status('Query edited. Run it to update the map.');});
$('samples').addEventListener('click',event=>{const button=event.target.closest('[data-sample]');if(button) chooseSample(button.dataset.sample);});
$('question-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy) return;
  const question=$('question').value.trim();if(!question){status('Enter a question first.','error');return;}
  if(!live) {
    const sample=samples.find(s=>s.question.toLowerCase()===question.toLowerCase());
    if(sample) await chooseSample(sample.id);
    else status('This preview includes three curated questions. Choose an example above, or inspect its OverpassQL. New questions require live influence retrieval and model generation.','error');
    return;
  }
  ++sampleVersion;$('retry-map').hidden=true;setBusy(true,'generate');
  let streamGenerated=false;
  try {
    if(queryStream) {
      const started=performance.now();
      const stages=$('query-stages');stages.replaceChildren();stages.hidden=false;
      const row=(name,text)=>{
        let item=stages.querySelector(`[data-stage="${name}"]`);
        if(!item){item=document.createElement('li');item.dataset.stage=name;stages.append(item);}
        item.textContent=text;
      };
      row('verification','1 · Browser verification…');
      const token=await verificationToken('generate');
      row('verification',`1 · Browser check completed · ${((performance.now()-started)/1000).toFixed(1)}s. Confirming with server…`);
      resetResults();clearContext();status('Confirming verification with the server…');
      let generated=null;
      await queryMap(question,Number($('budget').value),bbox(),token,event=>{
        const seconds=ms=>(ms/1000).toFixed(2)+'s';
        if(event.stage==='verified') row('verification',`1 · Verified once for this query · ${((performance.now()-started)/1000).toFixed(1)}s`);
        if(event.stage==='selection'){row('selection','2 · Checking saved examples / selecting examples…');status('Checking the example cache and selecting examples…');}
        if(event.stage==='selection_done') row('selection',`2 · ${event.cache_hit?({precomputed:'Reused precomputed examples',persistent:'Reused saved examples',memory:'Reused selected examples'}[event.source] || 'Reused selected examples'):'Selected examples'} · ${seconds(event.elapsed_ms)}`);
        if(event.stage==='model_cache'){row('model','3 · Checking saved answer…');status('Checking the saved answer…');}
        if(event.stage==='model_generate'){row('model','3 · Generating a new answer…');status('No saved answer matched. Generating a new query…');}
        if(event.stage==='model_done') row('model',`3 · ${event.cache_hit?'Reused saved answer · no model call':'New answer generated'} · ${seconds(event.elapsed_ms)}`);
        if(event.stage==='generated') {
          generated=event.data;streamGenerated=true;
          $('query').value=generated.query;turboLink();renderContext(generated);
          $('query-source').lastChild.textContent=` ${generated.cache?.hit?'Cached response':'Generated'} · ${generated.model}`;
          $('place-title').firstChild.textContent='Your exploration ';$('place-type').textContent='Generated query';$('legend-label').textContent='OSM results';
        }
        if(event.stage==='map'){row('map','4 · Loading map results…');status('Loading map results · no second verification…');}
        if(event.stage==='complete') {
          row('map',`4 · ${event.data.cache?.hit?'Reused map results':'Map results loaded'} · ${seconds(event.timings.map_ms)}`);
          const info=showMapResult(event.data);
          status(`${generated?.cache?.hit?'Reused the saved model response. ':''}Found ${info.count.toLocaleString()} places. Total ${((performance.now()-started)/1000).toFixed(1)}s including verification; server ${seconds(event.timings.server_ms)}.`, 'success');
        }
      });
    } else {
    const token=await verificationToken('generate');
    resetResults();clearContext();status('Understanding your question and finding places…');
    const data=await generate(question,Number($('budget').value),token);
    $('query').value=data.query;turboLink();renderContext(data);resetResults();
    $('query-source').lastChild.textContent=` ${data.cache?.hit?'Cached response':'Generated'} · ${data.model}`;
    $('place-title').firstChild.textContent='Your exploration ';$('place-type').textContent='Generated query';$('legend-label').textContent='OSM results';
    if(execution) {
      setBusy(true,'execute');
      await executeCurrentQuery(Boolean(data.cache?.hit));
    } else {
      $('query-details').open=true;
      $('answer-text').textContent='Your query is ready. Connect the project query service to find matching places.';
      status('Query generated. The project query service is not connected.','success');
    }
    }
  }catch(error){status(error.message,'error');if(queryStream){const item=document.createElement('li');item.textContent='Stopped · '+error.message;$('query-stages').append(item);}if(streamGenerated) $('retry-map').hidden=false;}finally{setBusy(false);}
});
function showMapResult(data) {
    const cached=Boolean(data.cache?.hit);
    const source=cached?(data.cache.hydrated?'Cached OSM selection · resolved locations':'Cached OSM response'):'Project server response';
    const info=resultSummary(data.result,source);
    $('map-badge-text').textContent='Project OSM · query results';
    $('data-origin').textContent=`${cached?`Cache · ${data.cache.source}`:'Project Overpass'} · data ${data.result.osm3s?.timestamp_osm_base?.slice(0,10) || 'date unavailable'}`;
    return info;
}
async function executeCurrentQuery(generationCached=false) {
  $('retry-map').hidden=true;
  try {
    const token=await verificationToken('execute');
    resetResults();status('Searching the project OpenStreetMap data…');
    const data=await execute($('query').value.trim(),bbox(),token);
    const info=showMapResult(data);
    const message=info.isCount?`The query returned ${info.count.toLocaleString()} matches.`:`Found ${info.count.toLocaleString()} places. Explore the list and map together.`;
    status(`${generationCached?'Reused the saved model response. ':''}${message}`, 'success');
  } catch(error) {
    status(error.message,'error');$('retry-map').hidden=false;
  }
}
async function runCurrentQuery() {
  if(busy || !execution) return;
  const query=$('query').value.trim();if(!query){status('Add an OverpassQL query first.','error');return;}
  ++sampleVersion;setBusy(true,'execute');
  try {await executeCurrentQuery();}
  finally{setBusy(false);}
}
$('run-query').addEventListener('click',runCurrentQuery);
$('retry-map').addEventListener('click',runCurrentQuery);
$('copy-query').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('query').value);status('Query copied.','success');}catch{$('query').select();status('Select and copy the query from the editor.');}});
$('fit-map').addEventListener('click',fitResults);
$('download-results').addEventListener('click',exportGeoJSON);
$('about-link').addEventListener('click',e=>{e.preventDefault();$('about-dialog').showModal();});
$('close-about').addEventListener('click',()=>$('about-dialog').close());
$('about-dialog').addEventListener('click',e=>{if(e.target===$('about-dialog')){const rect=e.target.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)e.target.close();}});

async function boot() {
  try {
    initMap();
    samples=await request(new URL('../data/showcases.json',import.meta.url));
    await chooseSample(samples[0].id);
    const config=await discoverBackend();
    configureBudget(config.token_budget);
    live=Boolean(config.generation_available && config.retrieval_available);
    execution=Boolean(config.execution_available);
    queryStream=Boolean(config.query_stream_available);
    if(config.turnstile?.enabled===true) verification=config.turnstile;
    $('mode-label').textContent=live?'Live generation':'Interactive preview';
    $('model-label').textContent=live?config.model:'Curated OSM queries';
    $('mode-dot').classList.toggle('live',live);
    const protection=config.protection;
    if(protection?.enabled && Number.isInteger(protection.generate_per_minute) && Number.isInteger(protection.model_per_ip_day)) {
      $('usage-limits').textContent=`Public demo · ${protection.generate_per_minute} questions/min · ${protection.model_per_ip_day} new answers/day per IP.`;
      $('usage-limits').title='Cached answers do not spend the daily model allowance. Daily limits reset at midnight Hong Kong time.';
      $('usage-limits').hidden=false;
    }
    if(!live && config.model) $('model-label').title=`Configured backbone: ${config.model}. Live generation requires the model service and influence selector to be ready.`;
    const serviceNote=$('service-note');serviceNote.hidden=true;
    if(config.retrieval_available===false && (execution || config.retrieval_error)) {
      serviceNote.textContent=typeof config.retrieval_error==='string' && config.retrieval_error.trim()?config.retrieval_error:'Influence retrieval is unavailable. You can still explore the samples and run queries on the project service.';
      serviceNote.hidden=false;
    } else if(config.retrieval_available===true && !live) {
      serviceNote.textContent='Influence retrieval is ready. Live model generation is not enabled; you can still explore the samples and run project queries.';
      serviceNote.hidden=false;
    }
    setBusy(false);
    const repo=window.OSM_SCOUT_CONFIG?.repositoryUrl;
    if(repo && /^https:\/\/github\.com\//.test(repo)) $('repo-link').href=repo;
  } catch(error) {status(error.message,'error');setBusy(false);}
}
configureBudget(PREVIEW_TOKEN_BUDGET);
boot();

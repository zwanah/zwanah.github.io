const publicConfig = window.OSM_SCOUT_CONFIG || {};
let apiBase = '';
let hasBackend = false;
export const PREVIEW_TOKEN_BUDGET = {min:400,max:2400,default:800,step:200,token_count_method:'deepseek-precomputed'};
let activeTokenBudget = {...PREVIEW_TOKEN_BUDGET};

export function tokenBudgetSettings(value) {
  if(value && ['min','max','default','step'].every(name=>Number.isInteger(value[name])) && value.min>0 && value.max>=value.min && value.step>0 && value.default>=value.min && value.default<=value.max && (value.default-value.min)%value.step===0 && (value.max-value.min)%value.step===0) return {...value};
  return {...PREVIEW_TOKEN_BUDGET};
}
function budgetError() {return `Choose a whole-number DeepSeek token budget between ${activeTokenBudget.min.toLocaleString()} and ${activeTokenBudget.max.toLocaleString()}.`;}

export async function request(url, options = {}, timeout = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {...options, signal: controller.signal});
    if (!response.ok) {
      let detail = '';
      if (response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json();
        if (typeof body.detail === 'string') detail = body.detail;
        else if(response.status===422 && Array.isArray(body.detail) && body.detail.some(error=>Array.isArray(error.loc) && error.loc.includes('budget'))) detail=budgetError();
      }
      if(response.status===429 && !detail) detail='The demo is receiving too many requests. Please wait before trying again.';
      throw new Error(detail || `Service returned HTTP ${response.status}. Please try again shortly.`);
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. Try a smaller area or a more specific query.');
    if (error instanceof TypeError) throw new Error('Could not reach the service. Check your connection and try again.');
    throw error;
  } finally { clearTimeout(timer); }
}

export async function discoverBackend() {
  const preview = {generation_available:false,execution_available:false,model:'gpt-6-luna',token_budget:{...PREVIEW_TOKEN_BUDGET}};
  const configured = publicConfig.apiBaseUrl?.trim().replace(/\/$/, '') || '';
  if (configured) {
    const target = new URL(configured);
    if (target.username || target.password || (target.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))) throw new Error('The demo backend URL is not valid.');
    apiBase = configured;
  } else if (location.hostname.endsWith('.github.io') || location.pathname !== '/') {
    return preview;
  }
  try {
    const config = await request(`${apiBase}/api/config`, {}, 7000);
    activeTokenBudget=tokenBudgetSettings(config.token_budget);
    hasBackend = true;
    return {...config,token_budget:{...activeTokenBudget}};
  } catch {
    if (configured) throw new Error('The project service is unavailable. You can still explore the bundled OSM snapshots.');
    return preview;
  }
}

function post(action, body, token) {
  const headers = {'Content-Type':'application/json'};
  if (token) headers['X-Turnstile-Token'] = token;
  return request(`${apiBase}/api/${action}`, {method:'POST',headers,body:JSON.stringify(body)}, 95000);
}

export function generate(question, budget, token) {
  if (!hasBackend) throw new Error('The project service is not connected. Explore a curated example or inspect its query.');
  if(!Number.isInteger(budget) || budget<activeTokenBudget.min || budget>activeTokenBudget.max) throw new Error(budgetError());
  return post('generate', {question,budget}, token);
}

export function execute(query, bbox, token) {
  if (!hasBackend) throw new Error('Live queries need a connection to the project service. The sample map uses a dated OSM snapshot.');
  return post('execute', {query,bbox}, token);
}

// NDJSON carries real server transitions, not simulated progress timers.
export async function queryMap(question, budget, bbox, token, onEvent) {
  if (!hasBackend) throw new Error('The project service is not connected.');
  if(!Number.isInteger(budget) || budget<activeTokenBudget.min || budget>activeTokenBudget.max) throw new Error(budgetError());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180000);
  let reader;
  try {
    const headers = {'Content-Type':'application/json'};
    if(token) headers['X-Turnstile-Token'] = token;
    const response = await fetch(`${apiBase}/api/query`, {method:'POST', headers, body:JSON.stringify({question,budget,bbox}), signal:controller.signal});
    if(!response.ok) {
      let body = {};
      try {body = await response.json();} catch {}
      throw new Error(typeof body.detail==='string' ? body.detail : `Service returned HTTP ${response.status}. Please try again.`);
    }
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', completed = false;
    const consume = line => {
      if(!line.trim()) return;
      const event = JSON.parse(line);
      if(event.stage==='error') throw new Error(event.detail || 'The query failed.');
      if(event.stage==='complete') completed = true;
      onEvent(event);
    };
    while(true) {
      const {value,done} = await reader.read();
      buffer += decoder.decode(value, {stream:!done});
      let boundary;
      while((boundary=buffer.indexOf('\n'))!==-1) {
        consume(buffer.slice(0,boundary)); buffer=buffer.slice(boundary+1);
      }
      if(done) {consume(buffer);break;}
    }
    if(!completed) throw new Error('The connection ended before the map was ready. Please try again.');
  } catch(error) {
    if(error.name==='AbortError') throw new Error('The query timed out. Try a smaller area or a more specific question.');
    throw error;
  } finally {
    clearTimeout(timer);
    if(reader) {try {await reader.cancel();} catch {} reader.releaseLock();}
    controller.abort();
  }
}

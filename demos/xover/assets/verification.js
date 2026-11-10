let turnstileApi=null;
const $=id=>document.getElementById(id);
async function loadTurnstile() {
  if(turnstileApi) return turnstileApi;
  turnstileApi=await new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=xoverTurnstileReady';
    script.async=true;
    const finish=api=>{
      clearTimeout(timer);
      script.onerror=null;
      delete window.xoverTurnstileReady;
      if(api) resolve(api);
      else {
        script.remove();
        reject(new Error('Browser verification could not load. Allow challenges.cloudflare.com and try again.'));
      }
    };
    const timer=setTimeout(finish,12000);
    script.onerror=()=>finish();
    window.xoverTurnstileReady=()=>finish(window.turnstile);
    document.head.append(script);
  });
  return turnstileApi;
}

export async function verificationToken(verification, status) {
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
          action:'generate',
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

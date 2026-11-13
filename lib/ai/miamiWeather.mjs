const observationUrl='https://api.weather.gov/stations/KMIA/observations/latest';
const maxBytes=16_384;
const maxAgeMs=2*60*60*1000;
const validQualityCodes=new Set(['C','S','V']);

/** @param {Response} response */
async function observationBody(response){
  if(!response.ok||Number(response.headers.get('Content-Length'))>maxBytes){
    await response.body?.cancel().catch(()=>{});
    return null;
  }
  if(!response.body)return null;
  const reader=response.body.getReader();
  const decoder=new TextDecoder('utf-8',{fatal:true});
  let length=0,text='';
  try{
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      length+=value.byteLength;
      if(length>maxBytes)return null;
      text+=decoder.decode(value,{stream:true});
    }
    return JSON.parse(text+decoder.decode());
  }finally{
    await reader.cancel().catch(()=>{});
    reader.releaseLock();
  }
}

/** @returns {import('./conciergeCopy.mjs').WeatherCondition|null} */
function conditionFrom(description){
  if(typeof description!=='string'||description.length>80||/\bvicinity\b/i.test(description))return null;
  if(/\bthunderstorms?\b/i.test(description))return 'thunder';
  if(/\b(rain|drizzle)\b/i.test(description))return 'rain';
  if(/\bfog\b/i.test(description))return 'fog';
  if(/^(fair|clear|sunny)$/i.test(description))return 'clear';
  if(/^(cloudy|mostly cloudy|partly cloudy|overcast)$/i.test(description))return 'cloudy';
  return null;
}

/** @param {AbortSignal} [signal]
 *  @returns {Promise<{celsius:number,observedAt:number,condition:import('./conciergeCopy.mjs').WeatherCondition|null}|null>} */
export async function latestMiamiWeather(signal){
  const timeout=AbortSignal.timeout(4500);
  try{
    const response=await fetch(observationUrl,{
      headers:{'User-Agent':'Miami Elio (https://gorgona-one.com)','Accept':'application/geo+json'},
      // Workers implements manual redirects. observationBody rejects non-2xx.
      redirect:'manual',
      // Match the upstream observation cache. Never cache errors.
      cf:{cacheEverything:true,cacheTtlByStatus:{'200':300,'300-599':-1}},
      signal:signal?AbortSignal.any([signal,timeout]):timeout,
    });
    const data=await observationBody(response);
    const reading=data?.properties,temperature=reading?.temperature;
    if(reading?.stationId!=='KMIA'||temperature?.unitCode!=='wmoUnit:degC'
      ||!Number.isFinite(temperature.value)||temperature.value< -30||temperature.value>55
      ||!validQualityCodes.has(temperature.qualityControl)||typeof reading.timestamp!=='string')return null;
    const observedAt=Date.parse(reading.timestamp),age=Date.now()-observedAt;
    if(!Number.isFinite(observedAt)||age< -60_000||age>maxAgeMs)return null;
    return {celsius:temperature.value,observedAt,condition:conditionFrom(reading.textDescription)};
  }catch{
    return null;
  }
}

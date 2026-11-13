import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';

const {POST}=load('app/api/chat/route.js');
const {answerConciergeFact}=load('lib/ai/conciergeFacts.mjs');
const {groundedReply}=load('lib/ai/groundedReply.mjs');
const {SUPPORTED_LANGUAGES}=load('lib/languages.js');
const weatherUrl='https://api.weather.gov/stations/KMIA/observations/latest';
const greetings={
  en:['Hello!','Hello'],ru:['Привет!','Здравствуйте'],es:['¡Hola!','¡Hola'],
  he:['שלום!','שלום'],zh:['你好！','你好'],pt:['Olá!','Olá'],uk:['Привіт!','Вітаю'],
  ja:['こんにちは！','こんにちは'],ko:['안녕하세요!','안녕하세요'],de:['Hallo!','Hallo'],
  ar:['مرحبًا!','أهلًا'],tr:['Merhaba!','Merhaba'],fa:['سلام!','سلام'],
  it:['Ciao!','Ciao'],fr:['Bonjour !','Bonjour'],pl:['Dzień dobry!','Dzień dobry'],
};

function chat(messages,locale='en'){
  return POST(new Request('https://example.test/api/chat',{
    method:'POST',headers:{'Content-Type':'application/json','cf-connecting-ip':'198.51.100.42'},
    body:JSON.stringify({locale,messages:typeof messages==='string'?[{role:'user',content:messages}]:messages}),
  })).then(response=>{
    assert.equal(response.status,200);
    return response.json();
  });
}

test('all supported greetings get a localized reply with no quota or provider requests',async t=>{
  const fetcher=t.mock.method(globalThis,'fetch',()=>{throw Error('Unexpected fetch');});
  assert.deepEqual(Object.keys(greetings),SUPPORTED_LANGUAGES.map(language=>language.code));
  for(const [locale,[query,prefix]] of Object.entries(greetings)){
    const result=await chat(query,locale);
    assert.equal(result.source,'concierge',locale);
    assert.equal(result.configured,true,locale);
    assert.equal(result.error,undefined,locale);
    assert.equal(result.responsePolicy,'conversation-v1',locale);
    assert.ok(result.reply.startsWith(prefix),locale);
    assert.doesNotMatch(result.reply,/weather|погод|погоду|NWS|KMIA/i,locale);
    assert.deepEqual(result.cards,[],locale);
    assert.deepEqual(result.suggestions,[],locale);
  }
  assert.equal(fetcher.mock.callCount(),0);
});

test('the live route answers Miami time locally and reports the NWS observation with its timestamp',async t=>{
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-07-05T00:42:00Z')});
  const fetcher=t.mock.method(globalThis,'fetch',async (url,init)=>{
    assert.equal(url,weatherUrl);
    assert.equal(init.redirect,'manual');
    assert.ok(init.signal instanceof AbortSignal);
    return Response.json({properties:{
      stationId:'KMIA',timestamp:'2026-07-05T00:35:00+00:00',
      temperature:{unitCode:'wmoUnit:degC',value:24,qualityControl:'V'},
      textDescription:'Light Rain',presentWeather:[{weather:'rain',intensity:'light',inVicinity:false}],
    }});
  });
  const time=await chat("Miami'de şu anda saat kaç? Lütfen yerel saati söyle.",'tr');
  assert.equal(time.configured,true);
  assert.match(time.reply,/Miami.*20:42/);
  assert.deepEqual(time.cards,[]);
  assert.equal(fetcher.mock.callCount(),0);

  const result=await chat('Какая сейчас погода в Майами? Сколько градусов на улице и идёт ли дождь?','ru');
  assert.equal(result.source,'weather');
  assert.equal(result.configured,true);
  assert.match(result.reply,/Майами.*24.*°C.*75.*°F/);
  assert.match(result.reply,/дождь/i);
  assert.match(result.reply,/KMIA.*20:35.*NWS/);
  assert.deepEqual(result.cards,[]);
  assert.deepEqual(result.suggestions,[]);
  assert.equal(fetcher.mock.callCount(),1);

  const both=await chat('What time is it in Miami? What is the current weather in Miami?');
  assert.match(both.reply,/Local time in Miami.*8:42.*KMIA.*NWS/s);
  assert.deepEqual(both.cards,[]);
  assert.equal(fetcher.mock.callCount(),2);
});

test('direct clock and observation questions stay local across the supported languages',async t=>{
  const questions={
    en:'What time is it in Miami right now?',ru:'Который час в Майами?',
    es:'¿Qué hora es en Miami?',he:'מה השעה במיאמי?',zh:'迈阿密现在几点了？',
    pt:'Que horas são em Miami?',uk:'Котра година в Маямі?',ja:'マイアミは今何時ですか？',
    ko:'마이애미는 지금 몇 시예요?',de:'Wie spät ist es in Miami?',
    ar:'كم الساعة في ميامي؟',tr:"Miami'de şu anda saat kaç?",
    fa:'ساعت الان در میامی چند است؟',it:'Che ore sono a Miami?',
    fr:'Quelle heure est-il à Miami ?',pl:'Która godzina jest w Miami?',
  };
  const weather={
    en:'What is the weather in Miami now?',ru:'Какая погода в Майами сейчас?',
    es:'¿Qué tiempo hace en Miami ahora?',he:'מה מזג האוויר במיאמי עכשיו?',zh:'迈阿密现在天气怎么样？',
    pt:'Como está o tempo em Miami agora?',uk:'Яка погода зараз у Маямі?',ja:'マイアミの今の天気はどうですか？',
    ko:'마이애미의 현재 날씨는 어때요?',de:'Wie ist das Wetter in Miami jetzt?',
    ar:'كيف هو الطقس في ميامي الآن؟',tr:"Miami'de şu anda hava nasıl?",
    fa:'آب و هوای میامی چطور است؟',it:'Che tempo fa a Miami ora?',
    fr:'Quel temps fait-il à Miami maintenant ?',pl:'Jaka jest pogoda w Miami teraz?',
  };
  const fetcher=t.mock.method(globalThis,'fetch',async url=>{
    assert.equal(url,weatherUrl);
    return Response.json({properties:{
      stationId:'KMIA',timestamp:new Date().toISOString(),
      temperature:{unitCode:'wmoUnit:degC',value:24,qualityControl:'V'},
      textDescription:'Fair',
    }});
  });
  for(const [locale,question] of Object.entries(questions)){
    const result=await answerConciergeFact(question,locale);
    assert.equal(result?.source,'concierge',question);
    assert.equal(result.remainingMessage,'',question);
    assert.match(result.reply,/\p{N}/u,question);
  }
  assert.equal(fetcher.mock.callCount(),0);
  for(const [locale,question] of Object.entries(weather)){
    const result=await answerConciergeFact(question,locale);
    assert.equal(result?.source,'weather',question);
    assert.equal(result.error,false,question);
    assert.equal(result.remainingMessage,'',question);
    assert.match(result.reply,/KMIA.*NWS/s,question);
  }
  assert.equal(fetcher.mock.callCount(),16);
});

test('stale, malformed and failed NWS readings yield a weather-specific message',async t=>{
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-07-05T00:42:00Z')});
  const observation={
    stationId:'KMIA',timestamp:'2026-07-05T00:35:00Z',
    temperature:{unitCode:'wmoUnit:degC',value:24,qualityControl:'V'},
  };
  const variants=[
    ()=>Response.json({properties:{...observation,timestamp:'2026-07-04T18:00:00Z'}}),
    ()=>Response.json({properties:{...observation,stationId:'KJFK'}}),
    ()=>Response.json({properties:{...observation,temperature:{unitCode:'wmoUnit:degC',value:null}}}),
    ()=>Response.json({properties:{...observation,temperature:{unitCode:'wmoUnit:degF',value:75}}}),
    ()=>new Response('private upstream diagnostic',{status:503}),
    ()=>Response.redirect('https://not-the-weather-service.example/',302),
    ()=>new Response(' '.repeat(16_385)),
    ()=>{throw new Error('private upstream diagnostic');},
  ];
  const fetcher=t.mock.method(globalThis,'fetch',async url=>{
    assert.equal(url,weatherUrl);
    return variants.shift()();
  });
  while(variants.length){
    const result=await chat('What is the current weather in Miami?');
    assert.equal(result.source,'weather');
    assert.equal(result.configured,false);
    assert.equal(result.error,true);
    assert.match(result.reply,/Miami.*weather.*unavailable/i);
    assert.doesNotMatch(result.reply,/diagnostic|75|24|Try again shortly/);
    assert.deepEqual(result.cards,[]);
    assert.deepEqual(result.suggestions,[]);
  }
  assert.equal(fetcher.mock.callCount(),8);
});

test('the cloud route uses conversation history to revise an itinerary and keeps factual scope',async t=>{
  const contextKey=Symbol.for('__cloudflare-context__');
  const saved=globalThis[contextKey],flag=process.env.CONCIERGE_WORKERS_AI_ENABLED;
  t.after(()=>{
    if(saved===undefined)delete globalThis[contextKey];else globalThis[contextKey]=saved;
    if(flag===undefined)delete process.env.CONCIERGE_WORKERS_AI_ENABLED;else process.env.CONCIERGE_WORKERS_AI_ENABLED=flag;
  });
  process.env.CONCIERGE_WORKERS_AI_ENABLED='true';
  const outsideObservationScope=[
    'What is the current weather in Paris?',
    'What will the weather be in Miami tomorrow?',
    'What is the weather in Miami in January?',
    'What is the weather in Miami in the summer?',
    'What is the weather in Miami this afternoon?',
    '¿Qué tiempo hace en Miami en enero?',
    'Quel temps fait-il à Miami en janvier ?',
    'Какая погода в Майами в выходные?',
    'What is the weather in Miami and in Orlando?',
    'What time is it in Miami and London?',
  ];
  let admissionAllowed=true,weatherFetches=0;
  const fetcher=t.mock.method(globalThis,'fetch',async url=>{
    if(url===weatherUrl){
      weatherFetches++;
      return Response.json({properties:{
        stationId:'KMIA',timestamp:new Date().toISOString(),
        temperature:{unitCode:'wmoUnit:degC',value:24,qualityControl:'V'},
        textDescription:'Fair',
      }});
    }
    assert.equal(url,'https://quota-fixture.supabase.co/rest/v1/rpc/concierge_ai_reserve');
    return Response.json({allowed:admissionAllowed});
  });
  const selections=[
    {version:2,action:'plan',days:[['south-beach'],['zoo-miami']]},
    {version:2,action:'plan',days:[['frost-science'],['pamm']]},
    ...outsideObservationScope.map(()=>({version:2,action:'guide',choice:'weather-scope'})),
    {version:2,action:'consult',options:['bay-cruise','longer-charter'],question:'time-on-water'},
    {version:2,action:'consult',options:['bay-cruise'],question:'dates'},
    {version:2,action:'consult',options:['bay-cruise'],question:'dates'},
  ];
  const sent=[];
  globalThis[contextKey]={env:{
    APP_ENV:'dashboard-staging',CONCIERGE_WORKERS_AI_ENABLED:'true',
    NEXT_PUBLIC_SUPABASE_URL:'https://quota-fixture.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon',
    SUPABASE_SERVICE_ROLE_KEY:'fixture-service',BOOKING_RATE_SECRET:'fixture-secret-with-at-least-32-characters',
    CONCIERGE_AI:{async run(model,input){
      sent.push(input.messages);
      return {response:JSON.stringify(selections.shift())};
    }},
  }};
  const user={role:'user',content:'Что посмотреть в Майами за два дня с детьми?'};
  const first=await chat([user],'ru');
  assert.equal(first.source,'workers-ai');
  assert.equal(first.responsePolicy,'conversation-v1');
  assert.match(first.reply,/День 1.*South Beach/);
  assert.match(first.reply,/День 2.*Zoo Miami/);
  assert.equal(first.cards[0].href,'/experiences');

  const followup={role:'user',content:'А если будет дождь?'};
  const revised=await chat([user,{role:'assistant',content:first.reply},followup],'ru');
  assert.equal(revised.source,'workers-ai');
  assert.match(revised.reply,/День 1.*Frost Science/);
  assert.match(revised.reply,/День 2.*Pérez Art Museum Miami/);
  assert.doesNotMatch(revised.reply,/South Beach|Zoo Miami/);
  assert.deepEqual(sent[1].slice(1),[user,{role:'assistant',content:first.reply},followup]);

  for(const query of outsideObservationScope){
    const result=await chat(query);
    assert.equal(result.source,'workers-ai',query);
    assert.match(result.reply,/current.*Miami/i);
    assert.deepEqual(result.cards,[]);
    assert.equal(sent.at(-1).at(-1).content,query);
  }
  assert.equal(weatherFetches,0);
  const yacht={role:'user',content:'What time is it in Miami? I also need to rent a yacht.'};
  const mixed=await chat([yacht]);
  assert.equal(mixed.source,'workers-ai');
  assert.match(mixed.reply,/^Local time in Miami is /);
  assert.match(mixed.reply,/short.*bay.*skyline/i);
  assert.match(mixed.reply,/longer.*swim/i);
  assert.match(mixed.reply,/How much time would you like to spend on the water/);
  assert.doesNotMatch(mixed.reply,/weather|NWS|KMIA/i);
  assert.equal(mixed.cards[0].href,'/yachts');
  assert.equal(sent.at(-1).at(-1).content,'I also need to rent a yacht.');

  const yachtFollowup={role:'user',content:'Four adults and two kids. We only have a couple of hours.'};
  const tailored=await chat([yacht,{role:'assistant',content:mixed.reply},yachtFollowup]);
  assert.match(tailored.reply,/short.*bay.*skyline/i);
  assert.match(tailored.reply,/What dates/);
  assert.doesNotMatch(tailored.reply,/longer|swim|How many people|How much time/i);
  assert.deepEqual(sent.at(-1).slice(1),[yacht,{role:'assistant',content:mixed.reply},yachtFollowup]);

  const weatherAndYacht=await chat('How is the weather in Miami, can you suggest a yacht?');
  assert.equal(weatherAndYacht.source,'workers-ai');
  assert.match(weatherAndYacht.reply,/KMIA.*Biscayne Bay/s);
  assert.equal(weatherAndYacht.cards[0].href,'/yachts');
  assert.equal(sent.at(-1).at(-1).content,'can you suggest a yacht?');
  assert.equal(weatherFetches,1);

  admissionAllowed=false;
  const denied=await chat('Который час в Майами? Ещё хочу арендовать яхту.','ru');
  assert.equal(denied.source,'navigation');
  assert.equal(denied.configured,false);
  assert.match(denied.reply,/^Местное время в Майами/);
  assert.equal(denied.cards[0].href,'/yachts');
  assert.equal(fetcher.mock.callCount(),outsideObservationScope.length+7);
  assert.deepEqual(selections,[]);
});

test('conversation selections keep untrusted text, identifiers and oversized plans out of replies',()=>{
  const input={locale:'en',messages:[{role:'user',content:'Plan two days in Miami.'}]};
  for(const value of [
    {version:2,action:'plan',days:[['unverified-venue']]},
    {version:2,action:'plan',days:[['frost-science'],['frost-science']]},
    {version:2,action:'plan',days:[[]]},
    {version:2,action:'plan',days:[['frost-science','pamm','everglades']]},
    {version:2,action:'plan',days:[['frost-science'],['pamm'],['everglades'],['zoo-miami']]},
    {version:2,action:'plan',days:[['frost-science']],reply:'$200 booking confirmed'},
    {version:2,action:'ideas',stops:['frost-science','unverified-venue']},
    {version:2,action:'guide',choice:'https://untrusted.example'},
    {version:2,action:'ask',choice:'constructor'},
    {version:2,action:'ask',choice:['dates']},
    {version:2,action:'ask',choice:'dates',sections:['/travel']},
    {version:2,action:'consult',options:['bay-cruise','bay-cruise'],question:'group'},
    {version:2,action:'consult',options:['unverified-option'],question:null},
    {version:2,action:'consult',options:['bay-cruise'],question:'request-card-details'},
    {version:2,action:'consult',options:['bay-cruise'],question:['group']},
    {version:2,action:'consult',options:['bay-cruise'],question:'duration'},
    {version:2,action:'consult',options:['bay-cruise','hotel'],question:null},
  ])assert.equal(groundedReply(JSON.stringify(value),input),null);
  for(const language of SUPPORTED_LANGUAGES){
    const result=groundedReply('{"version":2,"action":"ask","choice":"dates"}',{...input,locale:language.code});
    assert.equal(result.responsePolicy,'conversation-v1',language.code);
    assert.ok(result.reply.endsWith('?')||result.reply.endsWith('？')||result.reply.endsWith('؟'),language.code);
    assert.deepEqual(result.navigation.cards,[],language.code);
    const ideas=groundedReply('{"version":2,"action":"ideas","stops":["frost-science","pamm"]}',{...input,locale:language.code});
    assert.match(ideas.reply,/Frost Science.*Pérez Art Museum Miami/,language.code);
    assert.doesNotMatch(ideas.reply,/\{first\}|\{second\}/,language.code);
    assert.equal(ideas.navigation.cards[0].href,'/experiences',language.code);
  }
});

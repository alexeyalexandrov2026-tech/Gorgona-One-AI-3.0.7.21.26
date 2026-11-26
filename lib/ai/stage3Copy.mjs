// ===========================================================================
// Stage 3 ELIO+ Guide: 16-language Copy for Streaming, Stop, Shimmer,
// Voice 2.0 (Live STT / Whisper / Mic Errors), Opt-In Female TTS,
// and Opt-In Voice Reply Mode (off by default).
// ===========================================================================

import { normalizeLocale } from './locale.js';

const STAGE3_COPY = Object.freeze({
  en: {
    stop: 'Stop',
    listen: 'Listen',
    stopAudio: 'Stop voice',
    loadingAudio: 'Voice…',
    voiceModeOn: 'Voice replies: ON',
    voiceModeOff: 'Voice replies',
    transcribing: 'Transcribing voice…',
    listeningLive: 'Listening… tap Ask when ready',
    micPermission: 'Microphone access is blocked. Allow microphone access in your browser settings.',
    micNoSpeech: 'No speech detected — tap the microphone and try again.',
    statusCatalog: 'Checking live Miami fleet & catalog…',
    statusWeather: 'Checking Miami catalog & NOAA forecast…',
    statusModel: 'ELIO is crafting your personal answer…'
  },
  ru: {
    stop: 'Стоп',
    listen: 'Прослушать',
    stopAudio: 'Остановить голос',
    loadingAudio: 'Голос…',
    voiceModeOn: 'Голос вкл',
    voiceModeOff: 'Голосом',
    transcribing: 'Распознаю речь…',
    listeningLive: 'Слушаю… нажмите «Спросить», когда будете готовы',
    micPermission: 'Доступ к микрофону заблокирован. Разрешите микрофон в настройках браузера.',
    micNoSpeech: 'Речь не распознана — нажмите на микрофон и повторите.',
    statusCatalog: 'Проверяю актуальный флот и каталог Майами…',
    statusWeather: 'Сверяю каталог Майами и прогноз NOAA…',
    statusModel: 'ELIO готовит персональный ответ…'
  },
  es: {
    stop: 'Detener',
    listen: 'Escuchar',
    stopAudio: 'Detener voz',
    loadingAudio: 'Voz…',
    voiceModeOn: 'Voz: ON',
    voiceModeOff: 'Respuestas por voz',
    transcribing: 'Transcribiendo audio…',
    listeningLive: 'Escuchando… toca Preguntar cuando termines',
    micPermission: 'El acceso al micrófono está bloqueado. Permítelo en la configuración del navegador.',
    micNoSpeech: 'No se detectó voz — toca el micrófono e inténtalo de nuevo.',
    statusCatalog: 'Consultando flota y catálogo en vivo de Miami…',
    statusWeather: 'Consultando catálogo de Miami y pronóstico NOAA…',
    statusModel: 'ELIO está preparando tu respuesta personal…'
  },
  uk: {
    stop: 'Стоп',
    listen: 'Прослухати',
    stopAudio: 'Зупинити голос',
    loadingAudio: 'Голос…',
    voiceModeOn: 'Голос увімк.',
    voiceModeOff: 'Голосом',
    transcribing: 'Розпізнаю мовлення…',
    listeningLive: 'Слухаю… натисніть «Запитати», коли будете готові',
    micPermission: 'Доступ до мікрофона заблоковано. Дозвольте мікрофон у налаштуваннях браузера.',
    micNoSpeech: 'Мовлення не розпізнано — натисніть на мікрофон і повторіть.',
    statusCatalog: 'Перевіряю актуальний флот і каталог Маямі…',
    statusWeather: 'Звіряю каталог Маямі та прогноз NOAA…',
    statusModel: 'ELIO готує персональну відповідь…'
  },
  fr: {
    stop: 'Arrêter',
    listen: 'Écouter',
    stopAudio: 'Couper la voix',
    loadingAudio: 'Voix…',
    voiceModeOn: 'Voix : ON',
    voiceModeOff: 'Réponses vocales',
    transcribing: 'Transcription vocale…',
    listeningLive: 'Écoute… appuyez sur Demander quand prêt',
    micPermission: 'Accès au micro bloqué. Autorisez le micro dans votre navigateur.',
    micNoSpeech: 'Aucune voix détectée — appuyez sur le micro et réessayez.',
    statusCatalog: 'Vérification de la flotte et du catalogue de Miami…',
    statusWeather: 'Vérification du catalogue et météo NOAA…',
    statusModel: 'ELIO prépare votre réponse personnalisée…'
  },
  de: {
    stop: 'Stopp',
    listen: 'Anhören',
    stopAudio: 'Stimme stoppen',
    loadingAudio: 'Stimme…',
    voiceModeOn: 'Stimme: AN',
    voiceModeOff: 'Sprachausgabe',
    transcribing: 'Sprache wird transkribiert…',
    listeningLive: 'Hört zu… tippen Sie auf Fragen, wenn bereit',
    micPermission: 'Mikrofonzugriff blockiert. Bitte in den Browsereinstellungen erlauben.',
    micNoSpeech: 'Keine Sprache erkannt — bitte erneut auf das Mikrofon tippen.',
    statusCatalog: 'Prüfe Live-Flotte und Miami-Katalog…',
    statusWeather: 'Prüfe Miami-Katalog und NOAA-Wetter…',
    statusModel: 'ELIO erstellt Ihre persönliche Antwort…'
  },
  it: {
    stop: 'Stop',
    listen: 'Ascolta',
    stopAudio: 'Ferma voce',
    loadingAudio: 'Voce…',
    voiceModeOn: 'Voce: ON',
    voiceModeOff: 'Risposte vocali',
    transcribing: 'Trascrizione vocale…',
    listeningLive: 'In ascolto… tocca Chiedi quando sei pronto',
    micPermission: 'Accesso al microfono bloccato. Consenti il microfono nel browser.',
    micNoSpeech: 'Nessuna voce rilevata — tocca il microfono e riprova.',
    statusCatalog: 'Controllo flotta e catalogo live di Miami…',
    statusWeather: 'Controllo catalogo Miami e meteo NOAA…',
    statusModel: 'ELIO sta preparando la tua risposta personale…'
  },
  pt: {
    stop: 'Parar',
    listen: 'Ouvir',
    stopAudio: 'Parar voz',
    loadingAudio: 'Voz…',
    voiceModeOn: 'Voz: ON',
    voiceModeOff: 'Respostas por voz',
    transcribing: 'Transcrevendo voz…',
    listeningLive: 'Ouvindo… toque em Perguntar quando pronto',
    micPermission: 'Acesso ao microfone bloqueado. Permita nas configurações do navegador.',
    micNoSpeech: 'Nenhuma fala detectada — toque no microfone e tente novamente.',
    statusCatalog: 'Verificando frota e catálogo ao vivo de Miami…',
    statusWeather: 'Verificando catálogo de Miami e previsão NOAA…',
    statusModel: 'ELIO está preparando sua resposta pessoal…'
  },
  pl: {
    stop: 'Stop',
    listen: 'Odsłuchaj',
    stopAudio: 'Zatrzymaj głos',
    loadingAudio: 'Głos…',
    voiceModeOn: 'Głos: WŁ.',
    voiceModeOff: 'Głosowo',
    transcribing: 'Transkrypcja głosu…',
    listeningLive: 'Słucham… naciśnij Zapytaj, gdy skończysz',
    micPermission: 'Dostęp do mikrofonu zablokowany. Zezwól w ustawieniach przeglądarki.',
    micNoSpeech: 'Nie wykryto mowy — kliknij mikrofon i spróbuj ponownie.',
    statusCatalog: 'Sprawdzam aktualną flotę i katalog Miami…',
    statusWeather: 'Sprawdzam katalog Miami i prognozę NOAA…',
    statusModel: 'ELIO przygotowuje spersonalizowaną odpowiedź…'
  },
  tr: {
    stop: 'Durdur',
    listen: 'Dinle',
    stopAudio: 'Sesi durdur',
    loadingAudio: 'Ses…',
    voiceModeOn: 'Sesli: AÇIK',
    voiceModeOff: 'Sesli yanıt',
    transcribing: 'Ses yazıya çevriliyor…',
    listeningLive: 'Dinleniyor… hazır olduğunuzda Sor’a dokunun',
    micPermission: 'Mikrofon erişimi engellendi. Tarayıcı ayarlarından izin verin.',
    micNoSpeech: 'Ses algılanmadı — mikrofona dokunup tekrar deneyin.',
    statusCatalog: 'Canlı Miami filosu ve katalog kontrol ediliyor…',
    statusWeather: 'Miami kataloğu ve NOAA hava durumu kontrol ediliyor…',
    statusModel: 'ELIO kişisel yanıtınızı hazırlıyor…'
  },
  he: {
    stop: 'עצור',
    listen: 'האזן',
    stopAudio: 'עצור קול',
    loadingAudio: 'קול…',
    voiceModeOn: 'קול: פעיל',
    voiceModeOff: 'תשובות קוליות',
    transcribing: 'מתמלל קול…',
    listeningLive: 'מקשיב… הקש שאל כשמוכן',
    micPermission: 'הגישה למיקרופון חסומה. אפשר מיקרופון בהגדרות הדפדפן.',
    micNoSpeech: 'לא זוהה דיבור — הקש על המיקרופון ונסה שוב.',
    statusCatalog: 'בודק צי וקטלוג חי במיאמי…',
    statusWeather: 'בודק קטלוג מיאמי ותחזית NOAA…',
    statusModel: 'ELIO מכין עבורך תשובה אישית…'
  },
  ar: {
    stop: 'إيقاف',
    listen: 'استماع',
    stopAudio: 'إيقاف الصوت',
    loadingAudio: 'صوت…',
    voiceModeOn: 'الصوت: مفعّل',
    voiceModeOff: 'ردود صوتية',
    transcribing: 'جارٍ تحويل الصوت إلى نص…',
    listeningLive: 'جارٍ الاستماع… اضغط إرسال عندما تنتهي',
    micPermission: 'تم حظر الميكروفون. اسمح بالوصول في إعدادات المتصفح.',
    micNoSpeech: 'لم يُسمع صوت — اضغط الميكروفون وحاول مجدداً.',
    statusCatalog: 'جارٍ فحص أسطول وكتالوج ميامي المباشر…',
    statusWeather: 'جارٍ فحص كتالوج ميامي وتوقعات NOAA…',
    statusModel: 'ELIO يجهّز ردك الشخصي…'
  },
  fa: {
    stop: 'توقف',
    listen: 'شنیدن',
    stopAudio: 'توقف صدا',
    loadingAudio: 'صدا…',
    voiceModeOn: 'صدا: روشن',
    voiceModeOff: 'پاسخ صوتی',
    transcribing: 'در حال تبدیل گفتار به متن…',
    listeningLive: 'در حال شنیدن… پس از پایان ارسال را بزنید',
    micPermission: 'دسترسی به میکروفون مسدود است. در تنظیمات مرورگر اجازه دهید.',
    micNoSpeech: 'صدایی تشخیص داده نشد — دوباره روی میکروفون بزنید.',
    statusCatalog: 'در حال بررسی ناوگان و کاتالوگ زنده میامی…',
    statusWeather: 'در حال بررسی کاتالوگ میامی و پیش‌بینی NOAA…',
    statusModel: 'ELIO در حال آماده‌سازی پاسخ اختصاصی شماست…'
  },
  zh: {
    stop: '停止',
    listen: '朗读',
    stopAudio: '停止播放',
    loadingAudio: '语音…',
    voiceModeOn: '语音回复：开',
    voiceModeOff: '语音回复',
    transcribing: '正在识别语音…',
    listeningLive: '正在聆听… 完成后点击发送',
    micPermission: '麦克风权限被阻止，请在浏览器设置中开启。',
    micNoSpeech: '未检测到语音，请点击麦克风重试。',
    statusCatalog: '正在查询迈阿密实时车队与目录…',
    statusWeather: '正在查询迈阿密目录与 NOAA 天气…',
    statusModel: 'ELIO 正在为您生成专属回复…'
  },
  ja: {
    stop: '停止',
    listen: '読み上げ',
    stopAudio: '音声を停止',
    loadingAudio: '音声…',
    voiceModeOn: '音声応答：ON',
    voiceModeOff: '音声応答',
    transcribing: '音声を文字起こし中…',
    listeningLive: '聞き取り中… 完了したら送信を押してください',
    micPermission: 'マイクへのアクセスがブロックされています。ブラウザ設定で許可してください。',
    micNoSpeech: '音声が検出されませんでした。マイクを押してやり直してください。',
    statusCatalog: 'マイアミの最新フリートとカタログを確認中…',
    statusWeather: 'マイアミのカタログと NOAA 天気予報を確認中…',
    statusModel: 'ELIO がパーソナル回答を作成中…'
  },
  ko: {
    stop: '중지',
    listen: '듣기',
    stopAudio: '음성 중지',
    loadingAudio: '음성…',
    voiceModeOn: '음성 응답: 켜짐',
    voiceModeOff: '음성 응답',
    transcribing: '음성 인식 중…',
    listeningLive: '듣는 중… 완료되면 전송을 누르세요',
    micPermission: '마이크 권한이 차단되었습니다. 브라우저 설정에서 허용해 주세요.',
    micNoSpeech: '음성이 감지되지 않았습니다. 마이크를 눌러 다시 시도해 주세요.',
    statusCatalog: '마이애미 실시간 차량 및 카탈로그 확인 중…',
    statusWeather: '마이애미 카탈로그 및 NOAA 예보 확인 중…',
    statusModel: 'ELIO가 맞춤 답변을 작성 중입니다…'
  }
});

const WHISPER_LISTEN_HINT = Object.freeze({
  en: 'Recording… tap microphone again to transcribe',
  ru: 'Запись… нажмите микрофон ещё раз, чтобы распознать',
  es: 'Grabando… toca el micrófono de nuevo para transcribir',
  uk: 'Запис… натисніть мікрофон ще раз, щоб розпізнати',
  fr: 'Enregistrement… touchez le micro pour transcrire',
  de: 'Aufnahme… Mikrofon erneut tippen zum Transkribieren',
  it: 'Registrazione… tocca di nuovo il microfono per trascrivere',
  pt: 'Gravando… toque no microfone novamente para transcrever',
  pl: 'Nagrywanie… dotknij mikrofonu ponownie, aby transkrybować',
  tr: 'Kaydediliyor… yazıya çevirmek için mikrofona tekrar dokunun',
  he: 'מקליט… הקש שוב על המיקרופון לתמלול',
  ar: 'جارٍ التسجيل… اضغط الميكروفون مجدداً للتحويل',
  fa: 'در حال ضبط… برای تبدیل دوباره روی میکروفون بزنید',
  zh: '正在录音… 再次点击麦克风开始识别',
  ja: '録音中… もう一度マイクを押して文字起こし',
  ko: '녹음 중… 다시 마이크를 눌러 인식하세요'
});

const LIVE_VOICE_COPY = Object.freeze({
  en: {
    liveVoiceListening: 'Listening… speak naturally',
    liveVoiceThinking: 'ELIO is thinking…',
    liveVoiceSpeaking: 'ELIO is speaking — tap to interrupt',
    liveVoiceReady: 'Live voice ready — tap mic'
  },
  ru: {
    liveVoiceListening: 'Слушаю… говорите естественно',
    liveVoiceThinking: 'ELIO думает…',
    liveVoiceSpeaking: 'ELIO говорит — нажмите, чтобы перебить',
    liveVoiceReady: 'Живой голос готов — нажмите микрофон'
  },
  es: {
    liveVoiceListening: 'Escuchando… habla con naturalidad',
    liveVoiceThinking: 'ELIO está pensando…',
    liveVoiceSpeaking: 'ELIO habla — toca para interrumpir',
    liveVoiceReady: 'Voz en vivo lista — toca el micrófono'
  },
  uk: {
    liveVoiceListening: 'Слухаю… говоріть природно',
    liveVoiceThinking: 'ELIO думає…',
    liveVoiceSpeaking: 'ELIO говорить — натисніть, щоб перебити',
    liveVoiceReady: 'Живий голос готовий — натисніть мікрофон'
  },
  fr: {
    liveVoiceListening: 'À l’écoute… parlez naturellement',
    liveVoiceThinking: 'ELIO réfléchit…',
    liveVoiceSpeaking: 'ELIO parle — touchez pour interrompre',
    liveVoiceReady: 'Voix en direct prête — touchez le micro'
  },
  de: {
    liveVoiceListening: 'Hört zu… sprechen Sie ganz natürlich',
    liveVoiceThinking: 'ELIO denkt nach…',
    liveVoiceSpeaking: 'ELIO spricht — tippen zum Unterbrechen',
    liveVoiceReady: 'Live-Stimme bereit — Mikrofon tippen'
  },
  it: {
    liveVoiceListening: 'In ascolto… parla naturalmente',
    liveVoiceThinking: 'ELIO sta pensando…',
    liveVoiceSpeaking: 'ELIO sta parlando — tocca per interrompere',
    liveVoiceReady: 'Voce live pronta — tocca il microfono'
  },
  pt: {
    liveVoiceListening: 'Ouvindo… fale naturalmente',
    liveVoiceThinking: 'ELIO está pensando…',
    liveVoiceSpeaking: 'ELIO está falando — toque para interromper',
    liveVoiceReady: 'Voz ao vivo pronta — toque no microfone'
  },
  pl: {
    liveVoiceListening: 'Słucham… mów naturalnie',
    liveVoiceThinking: 'ELIO myśli…',
    liveVoiceSpeaking: 'ELIO mówi — dotknij, aby przerwać',
    liveVoiceReady: 'Głos na żywo gotowy — kliknij mikrofon'
  },
  tr: {
    liveVoiceListening: 'Dinliyorum… doğalca konuşun',
    liveVoiceThinking: 'ELIO düşünüyor…',
    liveVoiceSpeaking: 'ELIO konuşuyor — bölmek için dokunun',
    liveVoiceReady: 'Canlı ses hazır — mikrofona dokunun'
  },
  he: {
    liveVoiceListening: 'מקשיב… דבר בטבעיות',
    liveVoiceThinking: 'ELIO חושב…',
    liveVoiceSpeaking: 'ELIO מדבר — הקש כדי לקטוע',
    liveVoiceReady: 'שיחה קולית מוכנה — הקש על המיקרופון'
  },
  ar: {
    liveVoiceListening: 'أستمع إليك… تحدث بعفوية',
    liveVoiceThinking: 'ELIO يفكر…',
    liveVoiceSpeaking: 'ELIO يتحدث — اضغط للمقاطعة',
    liveVoiceReady: 'الصوت المباشر جاهز — اضغط الميكروفون'
  },
  fa: {
    liveVoiceListening: 'در حال شنیدن… طبیعی صحبت کنید',
    liveVoiceThinking: 'ELIO در حال فکر کردن است…',
    liveVoiceSpeaking: 'ELIO صحبت می‌کند — برای توقف لمس کنید',
    liveVoiceReady: 'گفت‌وگوی صوتی آماده است — میکروفون را بزنید'
  },
  zh: {
    liveVoiceListening: '正在聆听… 请自然说话',
    liveVoiceThinking: 'ELIO 正在思考…',
    liveVoiceSpeaking: 'ELIO 正在说话 — 点击可随时打断',
    liveVoiceReady: '实时语音已就绪 — 点击麦克风'
  },
  ja: {
    liveVoiceListening: '聞いています… 自然に話してください',
    liveVoiceThinking: 'ELIO が考えています…',
    liveVoiceSpeaking: 'ELIO が話しています — タップで割り込み',
    liveVoiceReady: 'ライブ音声待機中 — マイクを押してください'
  },
  ko: {
    liveVoiceListening: '듣고 있습니다… 자연스럽게 말씀하세요',
    liveVoiceThinking: 'ELIO가 생각 중입니다…',
    liveVoiceSpeaking: 'ELIO가 말하는 중 — 탭하여 끼어들기',
    liveVoiceReady: '실시간 음성 준비됨 — 마이크를 누르세요'
  }
});

export function getStage3Copy(locale = 'en') {
  const code = normalizeLocale(locale);
  const base = STAGE3_COPY[code] || STAGE3_COPY.en;
  const live = LIVE_VOICE_COPY[code] || LIVE_VOICE_COPY.en;
  return { ...base, ...live, listeningWhisper: WHISPER_LISTEN_HINT[code] || WHISPER_LISTEN_HINT.en };
}

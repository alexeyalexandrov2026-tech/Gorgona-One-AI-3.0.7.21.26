const messages=Object.freeze({
 en:'Voice input is unavailable. Please type your request.',ru:'Голосовой ввод недоступен. Введите запрос текстом.',
 uk:'Голосове введення недоступне. Введіть запит текстом.',es:'La entrada de voz no está disponible. Escribe tu solicitud.',
 pt:'A entrada de voz está indisponível. Digite seu pedido.',de:'Die Spracheingabe ist nicht verfügbar. Bitte geben Sie Ihre Anfrage ein.',
 fr:'La saisie vocale est indisponible. Saisissez votre demande.',it:'L’inserimento vocale non è disponibile. Scrivi la tua richiesta.',
 pl:'Wprowadzanie głosowe jest niedostępne. Wpisz swoją prośbę.',tr:'Sesli giriş kullanılamıyor. Lütfen isteğinizi yazın.',
 he:'הקלט הקולי אינו זמין. נא להקליד את הבקשה.',ar:'الإدخال الصوتي غير متاح. يرجى كتابة طلبك.',
 fa:'ورودی صوتی در دسترس نیست. لطفاً درخواست خود را تایپ کنید.',zh:'语音输入暂不可用，请输入您的需求。',
 ja:'音声入力を利用できません。ご希望を入力してください。',ko:'음성 입력을 사용할 수 없습니다. 요청을 직접 입력해 주세요.'
});
export const voiceInputUnavailable=locale=>messages[locale]||messages.en;

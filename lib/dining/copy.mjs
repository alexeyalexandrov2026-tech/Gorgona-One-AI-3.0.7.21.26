// Same checked-in, sixteen-locale pattern used by Headout. Venue brands stay verbatim.
const keys=['search','neighborhood','cuisine','style','all','empty','time','table','vip','private','guestlist','continue','request','pending','handoff','notes','held','withdraw','photo','channels','providers','unverified'];
const rows={
 en:'Search venues|Neighborhood|Cuisine|Experience|All|No venues match these filters.|Time|Table|VIP / bottle service|Private dining|Guest list inquiry|Continue with provider|Send concierge request|Request saved. This is an inquiry, not a confirmed reservation.|Choose your date, time and guests on the provider’s site. Only the provider confirms your reservation and cancellation terms.|Notes|Current operation has not been verified. Reservations are unavailable.|Withdraw inquiry|Venue photography awaiting permission|Booking options|Dining integrations|Access not verified',
 ru:'Поиск заведений|Район|Кухня|Формат|Все|По этим фильтрам ничего не найдено.|Время|Столик|VIP / бутылочный сервис|Частный ужин|Запрос в гостевой список|Перейти к сервису|Отправить запрос консьержу|Запрос сохранён. Это обращение, а не подтверждённая бронь.|Выберите дату, время и число гостей на сайте сервиса. Только сервис подтверждает бронь и условия отмены.|Пожелания|Текущая работа заведения не подтверждена. Бронирование недоступно.|Отозвать запрос|Фото заведения ожидает разрешения|Способы бронирования|Сервисы бронирования|Доступ не подтверждён',
 es:'Buscar locales|Barrio|Cocina|Experiencia|Todos|Ningún local coincide con estos filtros.|Hora|Mesa|VIP / servicio de botellas|Comedor privado|Consulta de lista de invitados|Continuar con el proveedor|Enviar solicitud al concierge|Solicitud guardada. Es una consulta, no una reserva confirmada.|Elija fecha, hora y comensales en el sitio del proveedor. Solo este confirma la reserva y las condiciones de cancelación.|Notas|No se ha verificado la actividad actual. Reservas no disponibles.|Retirar consulta|Fotografía pendiente de autorización|Opciones de reserva|Integraciones gastronómicas|Acceso no verificado',
 he:'חיפוש מקומות|שכונה|מטבח|חוויה|הכול|לא נמצאו מקומות התואמים לסינון.|שעה|שולחן|VIP / שירות בקבוקים|אירוח פרטי|בקשה לרשימת אורחים|המשך לספק|שליחת בקשה לקונסיירז׳|הבקשה נשמרה. זו פנייה ולא הזמנה מאושרת.|בחרו תאריך, שעה ומספר אורחים באתר הספק. רק הספק מאשר את ההזמנה ואת תנאי הביטול.|הערות|הפעילות הנוכחית לא אומתה. ההזמנות אינן זמינות.|ביטול הפנייה|צילום המקום ממתין לאישור|אפשרויות הזמנה|שירותי הזמנות|הגישה לא אומתה',
 zh:'搜索场所|街区|菜系|体验|全部|没有符合筛选条件的场所。|时间|餐桌|VIP / 瓶装酒服务|私人用餐|宾客名单咨询|前往服务商|发送礼宾请求|请求已保存。这是咨询，并非已确认的预订。|请在服务商网站选择日期、时间和人数。只有服务商能确认预订及取消条款。|备注|当前营业情况尚未核实。暂不可预订。|撤回咨询|场所照片等待授权|预订方式|餐饮预订服务|访问权限未核实',
 pt:'Buscar locais|Bairro|Cozinha|Experiência|Todos|Nenhum local corresponde aos filtros.|Horário|Mesa|VIP / serviço de garrafas|Jantar privado|Consulta de lista de convidados|Continuar com o fornecedor|Enviar pedido ao concierge|Pedido salvo. É uma consulta, não uma reserva confirmada.|Escolha data, horário e pessoas no site do fornecedor. Só ele confirma a reserva e as condições de cancelamento.|Observações|A atividade atual não foi verificada. Reservas indisponíveis.|Retirar consulta|Fotografia do local aguardando autorização|Opções de reserva|Integrações gastronômicas|Acesso não verificado',
 uk:'Пошук закладів|Район|Кухня|Формат|Усі|За цими фільтрами нічого не знайдено.|Час|Столик|VIP / пляшковий сервіс|Приватна вечеря|Запит до списку гостей|Перейти до сервісу|Надіслати запит консьєржу|Запит збережено. Це звернення, а не підтверджене бронювання.|Виберіть дату, час і кількість гостей на сайті сервісу. Лише сервіс підтверджує бронювання та умови скасування.|Побажання|Поточну роботу закладу не перевірено. Бронювання недоступне.|Відкликати запит|Фото закладу очікує дозволу|Способи бронювання|Сервіси бронювання|Доступ не підтверджено',
 ja:'施設を検索|エリア|料理|体験|すべて|条件に合う施設はありません。|時刻|テーブル|VIP / ボトルサービス|プライベートダイニング|ゲストリストへの問い合わせ|予約サイトへ進む|コンシェルジュに依頼|依頼を保存しました。問い合わせであり、予約確定ではありません。|日付、時刻、人数は予約サイトで選択してください。予約とキャンセル条件を確定するのは予約サービスです。|備考|現在の営業状況は未確認です。予約できません。|問い合わせを取り下げる|施設写真は使用許可待ちです|予約方法|ダイニング予約サービス|アクセス未確認',
 ko:'장소 검색|지역|요리|체험|전체|조건에 맞는 장소가 없습니다.|시간|테이블|VIP / 보틀 서비스|프라이빗 다이닝|게스트 명단 문의|예약 업체로 이동|컨시어지 요청 보내기|요청이 저장되었습니다. 문의이며 확정된 예약이 아닙니다.|예약 업체 사이트에서 날짜, 시간, 인원을 선택하세요. 예약과 취소 조건은 해당 업체만 확정합니다.|메모|현재 영업 상태가 확인되지 않았습니다. 예약할 수 없습니다.|문의 철회|장소 사진 사용 허가 대기 중|예약 방법|다이닝 예약 서비스|접근 권한 미확인',
 de:'Lokale suchen|Viertel|Küche|Erlebnis|Alle|Keine Lokale entsprechen diesen Filtern.|Uhrzeit|Tisch|VIP / Flaschenservice|Privates Essen|Gästelistenanfrage|Beim Anbieter fortfahren|Concierge-Anfrage senden|Anfrage gespeichert. Dies ist keine bestätigte Reservierung.|Wählen Sie Datum, Uhrzeit und Gäste auf der Website des Anbieters. Nur dieser bestätigt Reservierung und Stornobedingungen.|Anmerkungen|Der aktuelle Betrieb wurde nicht geprüft. Reservierungen sind nicht verfügbar.|Anfrage zurückziehen|Lokalfotos warten auf Genehmigung|Buchungsoptionen|Gastronomie-Anbindungen|Zugang nicht bestätigt',
 ar:'البحث عن أماكن|الحي|المطبخ|التجربة|الكل|لا توجد أماكن تطابق عوامل التصفية.|الوقت|طاولة|كبار الشخصيات / خدمة الزجاجات|عشاء خاص|استفسار قائمة الضيوف|المتابعة مع المزوّد|إرسال طلب إلى الكونسيرج|تم حفظ الطلب. هذا استفسار وليس حجزاً مؤكداً.|اختر التاريخ والوقت وعدد الضيوف على موقع المزوّد. المزوّد وحده يؤكد الحجز وشروط الإلغاء.|ملاحظات|لم يتم التحقق من التشغيل الحالي. الحجوزات غير متاحة.|سحب الاستفسار|صور المكان بانتظار الإذن|خيارات الحجز|خدمات حجز المطاعم|لم يتم التحقق من الوصول',
 tr:'Mekân ara|Semt|Mutfak|Deneyim|Tümü|Bu filtrelere uygun mekân yok.|Saat|Masa|VIP / şişe servisi|Özel yemek|Davetli listesi talebi|Sağlayıcıya devam et|Konsiyerje talep gönder|Talep kaydedildi. Bu bir başvurudur, onaylanmış rezervasyon değildir.|Tarih, saat ve kişi sayısını sağlayıcının sitesinde seçin. Rezervasyonu ve iptal koşullarını yalnızca sağlayıcı onaylar.|Notlar|Güncel faaliyet doğrulanmadı. Rezervasyon yapılamıyor.|Talebi geri çek|Mekân fotoğrafları izin bekliyor|Rezervasyon seçenekleri|Yemek rezervasyon hizmetleri|Erişim doğrulanmadı',
 fa:'جستجوی مکان‌ها|محله|آشپزی|تجربه|همه|مکانی مطابق این فیلترها یافت نشد.|ساعت|میز|وی‌آی‌پی / سرویس بطری|غذای خصوصی|درخواست فهرست مهمانان|ادامه در سایت ارائه‌دهنده|ارسال درخواست به کانسیرج|درخواست ذخیره شد. این یک پرسش است، نه رزرو تأییدشده.|تاریخ، ساعت و تعداد مهمانان را در سایت ارائه‌دهنده انتخاب کنید. فقط ارائه‌دهنده رزرو و شرایط لغو را تأیید می‌کند.|یادداشت‌ها|فعالیت فعلی تأیید نشده است. رزرو در دسترس نیست.|پس گرفتن درخواست|عکس مکان در انتظار مجوز|گزینه‌های رزرو|خدمات رزرو غذا|دسترسی تأیید نشده',
 it:'Cerca locali|Quartiere|Cucina|Esperienza|Tutti|Nessun locale corrisponde ai filtri.|Orario|Tavolo|VIP / servizio bottiglie|Cena privata|Richiesta lista ospiti|Continua con il fornitore|Invia richiesta al concierge|Richiesta salvata. È una domanda, non una prenotazione confermata.|Scegli data, ora e ospiti sul sito del fornitore. Solo il fornitore conferma prenotazione e condizioni di cancellazione.|Note|L’attività attuale non è stata verificata. Prenotazioni non disponibili.|Ritira richiesta|Fotografie del locale in attesa di autorizzazione|Opzioni di prenotazione|Servizi di prenotazione ristoranti|Accesso non verificato',
 fr:'Rechercher un lieu|Quartier|Cuisine|Expérience|Tous|Aucun lieu ne correspond aux filtres.|Heure|Table|VIP / service de bouteilles|Repas privé|Demande de liste d’invités|Continuer chez le prestataire|Envoyer une demande au concierge|Demande enregistrée. Il s’agit d’une demande, pas d’une réservation confirmée.|Choisissez date, heure et convives sur le site du prestataire. Lui seul confirme la réservation et les conditions d’annulation.|Notes|L’activité actuelle n’a pas été vérifiée. Réservations indisponibles.|Retirer la demande|Photos du lieu en attente d’autorisation|Options de réservation|Services de réservation gastronomique|Accès non vérifié',
 pl:'Szukaj lokali|Dzielnica|Kuchnia|Doświadczenie|Wszystkie|Brak lokali pasujących do filtrów.|Godzina|Stolik|VIP / serwis butelkowy|Prywatna kolacja|Zapytanie o listę gości|Przejdź do usługodawcy|Wyślij zapytanie do konsjerża|Zapytanie zapisane. To nie jest potwierdzona rezerwacja.|Wybierz datę, godzinę i liczbę gości na stronie usługodawcy. Tylko on potwierdza rezerwację i warunki anulowania.|Uwagi|Bieżąca działalność nie została zweryfikowana. Rezerwacje niedostępne.|Wycofaj zapytanie|Zdjęcia lokalu czekają na zgodę|Opcje rezerwacji|Usługi rezerwacji restauracji|Dostęp niezweryfikowany'
};
const uncertainty={en:'We could not verify receipt. Retry this request or contact the concierge.',ru:'Получение запроса не подтверждено. Повторите его или обратитесь к консьержу.',es:'No pudimos verificar la recepción. Reintente o contacte al concierge.',he:'לא ניתן לאמת את קבלת הבקשה. נסו שוב או פנו לקונסיירז׳.',zh:'暂时无法核实是否收到请求。请重试或联系礼宾。',pt:'Não foi possível verificar o recebimento. Tente novamente ou fale com o concierge.',uk:'Отримання запиту не підтверджено. Повторіть його або зверніться до консьєржа.',ja:'受付を確認できませんでした。再試行するか、コンシェルジュにお問い合わせください。',ko:'요청 접수를 확인할 수 없습니다. 다시 시도하거나 컨시어지에게 문의하세요.',de:'Der Eingang konnte nicht bestätigt werden. Versuchen Sie es erneut oder kontaktieren Sie den Concierge.',ar:'تعذر التحقق من استلام الطلب. أعد المحاولة أو تواصل مع الكونسيرج.',tr:'Talebin alındığı doğrulanamadı. Tekrar deneyin veya konsiyerjle iletişime geçin.',fa:'دریافت درخواست قابل تأیید نیست. دوباره تلاش کنید یا با کانسیرج تماس بگیرید.',it:'Non è stato possibile verificare la ricezione. Riprova o contatta il concierge.',fr:'La réception n’a pas pu être vérifiée. Réessayez ou contactez le concierge.',pl:'Nie udało się potwierdzić odbioru. Spróbuj ponownie lub skontaktuj się z konsjerżem.'};
const filterLabels={en:'Filters',ru:'Фильтры',es:'Filtros',he:'מסננים',zh:'筛选',pt:'Filtros',uk:'Фільтри',ja:'絞り込み',ko:'필터',de:'Filter',ar:'عوامل التصفية',tr:'Filtreler',fa:'فیلترها',it:'Filtri',fr:'Filtres',pl:'Filtry'};
export const DINING_COPY = Object.freeze(Object.fromEntries(Object.entries(rows).map(([locale,row])=>{
 const values=row.split('|'); if(values.length!==keys.length)throw Error('Invalid dining locale: '+locale);
 return [locale,Object.freeze({...Object.fromEntries(keys.map((key,index)=>[key,values[index]])),uncertainty:uncertainty[locale],filters:filterLabels[locale]})];
})));
export const getDiningCopy = locale => DINING_COPY[locale] || DINING_COPY.en;

const styles={
 en:'Fine dining|Casual dining|Waterfront|Rooftop|Nightclub|Lounge|Beach club|Live music',
 ru:'Высокая кухня|Повседневные рестораны|У воды|На крыше|Ночной клуб|Лаунж|Пляжный клуб|Живая музыка',
 es:'Alta cocina|Comida informal|Frente al agua|Azotea|Discoteca|Lounge|Club de playa|Música en vivo',
 he:'מסעדת שף|אוכל באווירה נינוחה|על המים|גג|מועדון לילה|לאונג׳|מועדון חוף|מוזיקה חיה',
 zh:'精致餐饮|休闲餐饮|水滨|屋顶|夜总会|酒廊|海滩俱乐部|现场音乐',
 pt:'Alta gastronomia|Refeições casuais|À beira-mar|Cobertura|Casa noturna|Lounge|Clube de praia|Música ao vivo',
 uk:'Висока кухня|Повсякденні ресторани|Біля води|На даху|Нічний клуб|Лаунж|Пляжний клуб|Жива музика',
 ja:'高級料理|カジュアルダイニング|ウォーターフロント|ルーフトップ|ナイトクラブ|ラウンジ|ビーチクラブ|ライブ音楽',
 ko:'파인 다이닝|캐주얼 다이닝|워터프런트|루프톱|나이트클럽|라운지|비치 클럽|라이브 음악',
 de:'Gehobene Küche|Ungezwungen essen|Am Wasser|Dachterrasse|Nachtclub|Lounge|Beachclub|Livemusik',
 ar:'مطاعم راقية|مطاعم غير رسمية|واجهة مائية|سطح|نادٍ ليلي|لاونج|نادٍ شاطئي|موسيقى حية',
 tr:'Şık yemek|Rahat yemek|Su kenarı|Çatı katı|Gece kulübü|Lounge|Plaj kulübü|Canlı müzik',
 fa:'غذای مجلل|غذای خودمانی|کنار آب|پشت‌بام|کلوب شبانه|لانژ|کلوب ساحلی|موسیقی زنده',
 it:'Alta cucina|Ristorazione informale|Sul mare|Rooftop|Discoteca|Lounge|Beach club|Musica dal vivo',
 fr:'Gastronomie|Repas décontracté|Au bord de l’eau|Toit-terrasse|Boîte de nuit|Lounge|Club de plage|Musique live',
 pl:'Wykwintna kuchnia|Swobodne posiłki|Nad wodą|Na dachu|Klub nocny|Lounge|Klub plażowy|Muzyka na żywo'
};
const styleKeys=['fine-dining','casual','waterfront','rooftop','club','lounge','beach-club','live-music'];
export function getDiningStyles(locale){return Object.fromEntries((styles[locale]||styles.en).split('|').map((label,index)=>[styleKeys[index],label]));}

const photography={
 en:'Editorial photograph|Venue photograph|Photo credits|Cropped for display',
 ru:'Атмосферное фото|Фото заведения|Автор фотографии|Кадрирование для показа',
 es:'Fotografía editorial|Fotografía del local|Créditos de la foto|Recortada para mostrar',
 he:'צילום להמחשה|צילום המקום|קרדיט לצילום|חיתוך לתצוגה',
 zh:'氛围示意照片|场所照片|摄影署名|已裁剪以适应显示',
 pt:'Fotografia editorial|Fotografia do local|Créditos da foto|Recortada para exibição',
 uk:'Атмосферне фото|Фото закладу|Автор фотографії|Кадрування для показу',
 ja:'イメージ写真|施設の写真|写真クレジット|表示用にトリミング',
 ko:'분위기 참고 사진|장소 사진|사진 출처|표시를 위해 자름',
 de:'Symbolfoto|Foto des Lokals|Bildnachweis|Für die Anzeige zugeschnitten',
 ar:'صورة توضيحية|صورة المكان|حقوق الصورة|تم اقتصاصها للعرض',
 tr:'Temsili fotoğraf|Mekân fotoğrafı|Fotoğraf bilgileri|Görüntüleme için kırpıldı',
 fa:'عکس نمایشی|عکس مکان|اعتبار عکس|برش برای نمایش',
 it:'Fotografia illustrativa|Fotografia del locale|Crediti fotografici|Ritagliata per la visualizzazione',
 fr:'Photo d’illustration|Photo du lieu|Crédit photo|Recadrée pour l’affichage',
 pl:'Zdjęcie poglądowe|Zdjęcie lokalu|Autor zdjęcia|Przycięte do wyświetlania'
};
export function getDiningPhotoCopy(locale){const values=(photography[locale]||photography.en).split('|');return Object.fromEntries(['editorial','venue','credits','crop'].map((key,index)=>[key,values[index]]));}

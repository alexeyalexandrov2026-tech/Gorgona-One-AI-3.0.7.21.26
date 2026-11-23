const adminUrl = 'https://gorgona-one.com/admin';
const hourMs = 60 * 60 * 1000;
const miamiTime = new Intl.DateTimeFormat('ru-RU',{
  timeZone:'America/New_York', day:'numeric', month:'long', year:'numeric',
  hour:'2-digit', minute:'2-digit', hourCycle:'h23', timeZoneName:'shortOffset'
});

const labels = Object.freeze({
  owner_delivery_test:'Проверка уведомлений Telegram',
  request_created:'Новая заявка на бронирование',
  plan_created:'Новая заявка из «Моего Майами»',
  request_assign:'Заявка назначена партнёру',
  request_respond:'Ответ по заявке',
  request_review:'Заявка взята в работу',
  request_withdraw:'Заявка отозвана',
  request_close:'Заявка закрыта',
  partner_registered:'Новая регистрация партнёра',
  user_registered:'Новая регистрация',
  listing_submitted:'Объявление отправлено на проверку',
  listing_approved:'Объявление одобрено',
  listing_rejected:'Объявление отклонено',
  listing_withdrawn:'Объявление снято',
  listing_created:'Новое объявление',
  listing_updated:'Объявление обновлено',
  payment_confirmed:'Оплата подтверждена'
});

export function validTrafficCounts(visits, pageviews) {
  return Number.isInteger(visits) && Number.isInteger(pageviews)
    && visits >= 0 && pageviews >= visits && pageviews <= 2147483647;
}

export function formatTelegramNotification(delivery) {
  if (delivery.event_type === 'traffic_hourly') {
    const { hour, visits, pageviews } = JSON.parse(delivery.title);
    const start = Date.parse(hour);
    if (typeof hour !== 'string' || !Number.isFinite(start) || start % hourMs !== 0
      || !validTrafficCounts(visits,pageviews)) throw new Error('Invalid traffic summary');
    return ['Miami Elio · Посещения сайта',
      `${miamiTime.format(start)} — ${miamiTime.format(start + hourMs)} (Майами)`,
      `Визиты: ${visits} · Просмотры: ${pageviews}`,
      'Оценка Cloudflare без распознанных ботов'].join('\n');
  }
  const label = Object.hasOwn(labels,delivery.event_type) ? labels[delivery.event_type] : 'Изменение на сайте';
  const reference = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(delivery.booking_id || '')
    ? `Заявка: ${delivery.booking_id}` : '';
  return ['Miami Elio',label,reference,`Открыть кабинет: ${adminUrl}`].filter(Boolean).join('\n');
}

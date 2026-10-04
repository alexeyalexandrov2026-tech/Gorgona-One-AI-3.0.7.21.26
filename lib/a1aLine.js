// The A1A Line: South Florida drawn as one coastal route, Palm Beach to Key
// West, with each neighborhood as a stop. Counties set the line color.
// `air` is the usual airport, `port` the cruise port nearby, `spur` marks
// stops that sit inland off the coast road. Place names stay in English.
export const COUNTIES = {
  pb: { name: 'Palm Beach County', code: 'PB' },
  bw: { name: 'Broward', code: 'BW' },
  md: { name: 'Miami-Dade', code: 'MD' },
  mk: { name: 'The Keys', code: 'FK' }
};

export const STOPS = [
  {
    id: 'palm-beach', name: 'Palm Beach', county: 'pb', air: 'PBI',
    line: {
      en: 'Worth Avenue boutiques, oceanfront estates and old-school glamour.',
      ru: 'Бутики Worth Avenue, особняки у океана и классический шик.',
      es: 'Boutiques de Worth Avenue, mansiones frente al mar y glamour clásico.',
      pt: 'Butiques da Worth Avenue, mansões à beira-mar e glamour clássico.',
      he: 'הבוטיקים של Worth Avenue, אחוזות מול האוקיינוס וזוהר קלאסי.'
    }
  },
  {
    id: 'boca-raton', name: 'Boca Raton', county: 'pb', air: 'PBI · FLL',
    line: {
      en: 'Mizner Park, wide public beaches and golf resorts.',
      ru: 'Mizner Park, широкие общественные пляжи и гольф-курорты.',
      es: 'Mizner Park, amplias playas públicas y resorts de golf.',
      pt: 'Mizner Park, praias públicas amplas e resorts de golfe.',
      he: 'Mizner Park, חופים ציבוריים רחבים ואתרי גולף.'
    }
  },
  {
    id: 'fort-lauderdale', name: 'Fort Lauderdale', county: 'bw', air: 'FLL', port: 'Port Everglades',
    line: {
      en: 'Las Olas Boulevard, canals and the world’s largest in-water boat show.',
      ru: 'Бульвар Las Olas, каналы и крупнейшее в мире шоу яхт на воде.',
      es: 'Las Olas Boulevard, canales y la mayor feria náutica en el agua del mundo.',
      pt: 'Las Olas Boulevard, canais e a maior feira náutica na água do mundo.',
      he: 'שדרות Las Olas, תעלות ותערוכת הסירות על המים הגדולה בעולם.'
    }
  },
  {
    id: 'hollywood', name: 'Hollywood', county: 'bw', air: 'FLL',
    line: {
      en: 'The Broadwalk promenade and the Guitar Hotel at Seminole Hard Rock.',
      ru: 'Набережная Broadwalk и отель-гитара Seminole Hard Rock.',
      es: 'El paseo Broadwalk y el Guitar Hotel del Seminole Hard Rock.',
      pt: 'O calçadão Broadwalk e o Guitar Hotel do Seminole Hard Rock.',
      he: 'הטיילת Broadwalk ומלון הגיטרה של Seminole Hard Rock.'
    }
  },
  {
    id: 'aventura', name: 'Aventura', county: 'md', air: 'FLL · MIA',
    line: {
      en: 'Aventura Mall, waterfront dining and quiet residential towers.',
      ru: 'Aventura Mall, рестораны у воды и спокойные жилые башни.',
      es: 'Aventura Mall, restaurantes junto al agua y torres residenciales tranquilas.',
      pt: 'Aventura Mall, restaurantes à beira d’água e torres residenciais tranquilas.',
      he: 'Aventura Mall, מסעדות על המים ומגדלי מגורים שקטים.'
    }
  },
  {
    id: 'miami-gardens', name: 'Miami Gardens', county: 'md', air: 'MIA', spur: true,
    line: {
      en: 'Hard Rock Stadium: Dolphins games, the Miami Open and the Formula 1 Grand Prix.',
      ru: 'Hard Rock Stadium: матчи Dolphins, Miami Open и Гран-при «Формулы-1».',
      es: 'Hard Rock Stadium: partidos de los Dolphins, el Miami Open y el Gran Premio de Fórmula 1.',
      pt: 'Hard Rock Stadium: jogos dos Dolphins, o Miami Open e o Grande Prêmio de Fórmula 1.',
      he: 'Hard Rock Stadium: משחקי הדולפינס, Miami Open והגרנד פרי של פורמולה 1.'
    }
  },
  {
    id: 'sunny-isles', name: 'Sunny Isles Beach', county: 'md', air: 'MIA · FLL',
    line: {
      en: 'Oceanfront towers and calm beaches. Our garage is here, so the fleet starts at this stop.',
      ru: 'Башни у океана и спокойные пляжи. Здесь наш гараж, поэтому автопарк стартует с этой остановки.',
      es: 'Torres frente al mar y playas tranquilas. Aquí está nuestro garaje, así que la flota sale desde esta parada.',
      pt: 'Torres à beira-mar e praias calmas. Nossa garagem fica aqui, então a frota parte desta parada.',
      he: 'מגדלים מול האוקיינוס וחופים רגועים. המוסך שלנו כאן, אז צי הרכבים יוצא מהתחנה הזו.'
    }
  },
  {
    id: 'bal-harbour', name: 'Bal Harbour', county: 'md', air: 'MIA',
    line: {
      en: 'Bal Harbour Shops and an unhurried, upscale stretch of sand.',
      ru: 'Bal Harbour Shops и неспешный дорогой пляж.',
      es: 'Bal Harbour Shops y una franja de arena exclusiva y sin prisas.',
      pt: 'Bal Harbour Shops e uma faixa de areia sofisticada e sem pressa.',
      he: 'Bal Harbour Shops ורצועת חוף יוקרתית ונינוחה.'
    }
  },
  {
    id: 'mid-beach', name: 'Mid-Beach', county: 'md', air: 'MIA',
    line: {
      en: 'The Fontainebleau, LIV and the beachfront boardwalk.',
      ru: 'Fontainebleau, клуб LIV и деревянная набережная вдоль пляжа.',
      es: 'El Fontainebleau, LIV y el paseo de madera junto a la playa.',
      pt: 'O Fontainebleau, o LIV e o calçadão de madeira à beira da praia.',
      he: 'מלון Fontainebleau, מועדון LIV והטיילת שלאורך החוף.'
    }
  },
  {
    id: 'south-beach', name: 'South Beach', county: 'md', air: 'MIA',
    line: {
      en: 'Ocean Drive Art Deco, Lincoln Road and the lifeguard towers of Lummus Park.',
      ru: 'Ар-деко Ocean Drive, Lincoln Road и спасательные вышки Lummus Park.',
      es: 'El Art Déco de Ocean Drive, Lincoln Road y las torres salvavidas de Lummus Park.',
      pt: 'O Art Déco da Ocean Drive, a Lincoln Road e as torres de salva-vidas do Lummus Park.',
      he: 'הארט דקו של Ocean Drive, רחוב Lincoln Road ומגדלי המצילים של Lummus Park.'
    }
  },
  {
    id: 'islands', name: 'Star & Fisher Islands', county: 'md', air: 'MIA',
    line: {
      en: 'Private islands and the marinas where most of our charters board.',
      ru: 'Частные острова и марины, откуда уходит большинство наших чартеров.',
      es: 'Islas privadas y las marinas donde embarcan la mayoría de nuestros chárteres.',
      pt: 'Ilhas privadas e as marinas onde embarca a maioria dos nossos fretamentos.',
      he: 'איים פרטיים והמרינות שמהן יוצאות רוב ההפלגות שלנו.'
    }
  },
  {
    id: 'downtown', name: 'Downtown', county: 'md', air: 'MIA', port: 'PortMiami',
    line: {
      en: 'Bayfront Park, the Heat at Kaseya Center, PortMiami and late nights at E11EVEN.',
      ru: 'Bayfront Park, «Майами Хит» в Kaseya Center, PortMiami и долгие ночи в E11EVEN.',
      es: 'Bayfront Park, el Heat en el Kaseya Center, PortMiami y noches largas en E11EVEN.',
      pt: 'Bayfront Park, o Heat no Kaseya Center, PortMiami e noites longas no E11EVEN.',
      he: 'Bayfront Park, ההיט בקסאיה סנטר, PortMiami ולילות ארוכים ב־E11EVEN.'
    }
  },
  {
    id: 'wynwood', name: 'Wynwood', county: 'md', air: 'MIA',
    line: {
      en: 'Wynwood Walls, galleries and breweries. Busiest during Art Week.',
      ru: 'Wynwood Walls, галереи и пивоварни. Больше всего людей в Art Week.',
      es: 'Wynwood Walls, galerías y cervecerías. Lo más concurrido es la Art Week.',
      pt: 'Wynwood Walls, galerias e cervejarias. Fica mais cheio na Art Week.',
      he: 'Wynwood Walls, גלריות ומבשלות בירה. הכי עמוס בשבוע האמנות.'
    }
  },
  {
    id: 'design-district', name: 'Design District', county: 'md', air: 'MIA',
    line: {
      en: 'Luxury flagships, design galleries and the ICA Miami.',
      ru: 'Флагманы люксовых брендов, дизайн-галереи и музей ICA Miami.',
      es: 'Tiendas insignia de lujo, galerías de diseño y el ICA Miami.',
      pt: 'Lojas-conceito de luxo, galerias de design e o ICA Miami.',
      he: 'חנויות דגל של מותגי יוקרה, גלריות עיצוב ומוזיאון ICA Miami.'
    }
  },
  {
    id: 'brickell', name: 'Brickell', county: 'md', air: 'MIA',
    line: {
      en: 'Financial-district towers, rooftop bars and dinner at Komodo.',
      ru: 'Башни делового района, бары на крышах и ужин в Komodo.',
      es: 'Torres del distrito financiero, bares en azoteas y cena en Komodo.',
      pt: 'Torres do distrito financeiro, bares em rooftops e jantar no Komodo.',
      he: 'מגדלי הרובע הפיננסי, ברים על הגגות וארוחת ערב ב־Komodo.'
    }
  },
  {
    id: 'little-havana', name: 'Little Havana', county: 'md', air: 'MIA',
    line: {
      en: 'Calle Ocho, Cuban coffee windows and Domino Park.',
      ru: 'Calle Ocho, окошки с кубинским кофе и Domino Park.',
      es: 'Calle Ocho, ventanitas de café cubano y el Domino Park.',
      pt: 'Calle Ocho, janelinhas de café cubano e o Domino Park.',
      he: 'Calle Ocho, חלונות של קפה קובני ופארק הדומינו.'
    }
  },
  {
    id: 'coral-gables', name: 'Coral Gables', county: 'md', air: 'MIA',
    line: {
      en: 'Mediterranean Revival streets, the Biltmore and the Venetian Pool.',
      ru: 'Улицы в средиземноморском стиле, отель Biltmore и бассейн Venetian Pool.',
      es: 'Calles de estilo mediterráneo, el Biltmore y la Venetian Pool.',
      pt: 'Ruas em estilo mediterrâneo, o Biltmore e a Venetian Pool.',
      he: 'רחובות בסגנון ים־תיכוני, מלון Biltmore והבריכה הוונציאנית.'
    }
  },
  {
    id: 'coconut-grove', name: 'Coconut Grove', county: 'md', air: 'MIA',
    line: {
      en: 'Bayfront marinas, banyan trees and long lunches.',
      ru: 'Марины на берегу залива, баньяны и долгие обеды.',
      es: 'Marinas en la bahía, árboles banianos y almuerzos largos.',
      pt: 'Marinas na baía, figueiras-de-bengala e almoços longos.',
      he: 'מרינות על המפרץ, עצי באניאן וארוחות צהריים ארוכות.'
    }
  },
  {
    id: 'key-biscayne', name: 'Key Biscayne', county: 'md', air: 'MIA',
    line: {
      en: 'Crandon Park beaches and the Cape Florida lighthouse.',
      ru: 'Пляжи Crandon Park и маяк Cape Florida.',
      es: 'Las playas de Crandon Park y el faro de Cape Florida.',
      pt: 'As praias do Crandon Park e o farol de Cape Florida.',
      he: 'החופים של Crandon Park והמגדלור של Cape Florida.'
    }
  },
  {
    id: 'key-largo', name: 'Key Largo', county: 'mk', air: 'MIA',
    line: {
      en: 'The first of the Keys and John Pennekamp Coral Reef State Park.',
      ru: 'Первый из островов Кис и коралловый парк John Pennekamp.',
      es: 'La primera de los Cayos y el parque estatal de arrecifes John Pennekamp.',
      pt: 'A primeira das Keys e o parque estadual de recifes John Pennekamp.',
      he: 'הראשון באיי הקיז ופארק שונית האלמוגים John Pennekamp.'
    }
  },
  {
    id: 'key-west', name: 'Key West', county: 'mk', air: 'EYW',
    line: {
      en: 'Duval Street and sunset at Mallory Square.',
      ru: 'Duval Street и закат на Mallory Square.',
      es: 'Duval Street y el atardecer en Mallory Square.',
      pt: 'Duval Street e o pôr do sol na Mallory Square.',
      he: 'רחוב Duval והשקיעה בכיכר Mallory.'
    }
  }
];

// The stops the homepage strip shows, north to south.
export const HOME_STOPS = ['palm-beach', 'fort-lauderdale', 'sunny-isles', 'mid-beach', 'south-beach', 'islands', 'downtown', 'wynwood', 'brickell', 'key-biscayne', 'key-west'];

export function getStop(id) {
  return STOPS.find((stop) => stop.id === id);
}

// "MD 07": county code plus the stop's place on the whole line.
export function stopCode(stop) {
  return `${COUNTIES[stop.county].code} ${String(STOPS.indexOf(stop) + 1).padStart(2, '0')}`;
}

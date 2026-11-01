import {getHeadoutCopy} from './headoutCopy.mjs';

// Public creative supplied by the verified Viator partner account.
// The iframe URL was observed in the official embed script; no user input is used.
/** @type {Readonly<{provider:string,partnerId:string,widgetRef:string,src:string,href:string,helicopterHref:string,helicopterTitle:string}>} */
export const VIATOR_MIAMI = Object.freeze({
  "provider": "Viator",
  "partnerId": "P00329248",
  "widgetRef": "W-09e5f18c-817b-4322-ac50-af173c3ff4ff",
  "src": "https://www.viator.com/widget/partner/P00329248/W-09e5f18c-817b-4322-ac50-af173c3ff4ff?widgetPreview=false&wd=eyJmIjoidml3LTYzODQifQ%3D%3D",
  "href": "https://www.viator.com/Miami/d662-ttd?pid=P00329248&mcid=42383&medium=link&campaign=miami-elio-miami",
  "helicopterHref": "https://www.viator.com/tours/Miami/Taste-of-Miami-Helicopter-Tour/d662-231628P7?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-miami&widgetPreview=false&widget_ref=W-09e5f18c-817b-4322-ac50-af173c3ff4ff",
  "helicopterTitle": "Miami Helicopter Tour: Breathtaking Miami Skyline & Ocean Views"
});

// Reuse the existing sixteen-language booking UI without mutating its source.
export function getViatorCopy(locale){
 return Object.freeze(Object.fromEntries(Object.entries(getHeadoutCopy(locale)).map(([key,value])=>[key,value.replaceAll('Headout',VIATOR_MIAMI.provider)])));
}

// Twenty individually saved official product widgets, verified against their one referral.
// Supplier images, titles, reviews and prices stay in Viator documents.
/** @type {ReadonlyArray<Readonly<{productCode:string,widgetRef:string,src:string,href:string}>>} */
export const VIATOR_SINGLE_CARDS = Object.freeze([
  {
    "productCode": "231628P7",
    "widgetRef": "W-fa8c1cdf-4c3c-4863-89d8-72b280ff2b36",
    "src": "https://www.viator.com/widget/partner/P00329248/W-fa8c1cdf-4c3c-4863-89d8-72b280ff2b36?widgetPreview=false&wd=eyJmIjoidml3LTY0NjQwIn0%3D",
    "href": "https://www.viator.com/tours/Miami/Taste-of-Miami-Helicopter-Tour/d662-231628P7?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-fa8c1cdf-4c3c-4863-89d8-72b280ff2b36"
  },
  {
    "productCode": "28744P2",
    "widgetRef": "W-e0d7de95-fd1d-4328-9d5c-1aef2113e59f",
    "src": "https://www.viator.com/widget/partner/P00329248/W-e0d7de95-fd1d-4328-9d5c-1aef2113e59f?widgetPreview=false&wd=eyJmIjoidml3LTQ4MTE3In0%3D",
    "href": "https://www.viator.com/tours/Miami/Miami-Sightseeing-Cruise-to-Millionaires-Homes/d662-28744P2?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-e0d7de95-fd1d-4328-9d5c-1aef2113e59f"
  },
  {
    "productCode": "5096P35",
    "widgetRef": "W-4c4b50e2-bd3f-40cb-91b0-a63efe40caaf",
    "src": "https://www.viator.com/widget/partner/P00329248/W-4c4b50e2-bd3f-40cb-91b0-a63efe40caaf?widgetPreview=false&wd=eyJmIjoidml3LTg1NDI0In0%3D",
    "href": "https://www.viator.com/tours/Miami/BIG-Everglades-Experience-with-Transportation/d662-5096P35?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-4c4b50e2-bd3f-40cb-91b0-a63efe40caaf"
  },
  {
    "productCode": "408277P1",
    "widgetRef": "W-66f9c0b0-0749-40f7-bc88-219ae1a4ef0f",
    "src": "https://www.viator.com/widget/partner/P00329248/W-66f9c0b0-0749-40f7-bc88-219ae1a4ef0f?widgetPreview=false&wd=eyJmIjoidml3LTI1NjQ4In0%3D",
    "href": "https://www.viator.com/tours/Miami/Atv-tours/d662-408277P1?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-66f9c0b0-0749-40f7-bc88-219ae1a4ef0f"
  },
  {
    "productCode": "5606753P1",
    "widgetRef": "W-6bf23ec2-2026-435c-ba1e-ca556f39fe6a",
    "src": "https://www.viator.com/widget/partner/P00329248/W-6bf23ec2-2026-435c-ba1e-ca556f39fe6a?widgetPreview=false&wd=eyJmIjoidml3LTE4ODY2In0%3D",
    "href": "https://www.viator.com/tours/Miami/Private-Yacht-Charters-and-Boat-Rentals/d662-5606753P1?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-6bf23ec2-2026-435c-ba1e-ca556f39fe6a"
  },
  {
    "productCode": "328105P2",
    "widgetRef": "W-d317b1a6-66c7-440e-aab1-735ed363065b",
    "src": "https://www.viator.com/widget/partner/P00329248/W-d317b1a6-66c7-440e-aab1-735ed363065b?widgetPreview=false&wd=eyJmIjoidml3LTc1NzE2In0%3D",
    "href": "https://www.viator.com/tours/Miami/Private-Tour-Miami-Boat-Rental/d662-328105P2?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-d317b1a6-66c7-440e-aab1-735ed363065b"
  },
  {
    "productCode": "5304HAVANA",
    "widgetRef": "W-397e138a-6acc-4a78-b2d1-4e21319f23d1",
    "src": "https://www.viator.com/widget/partner/P00329248/W-397e138a-6acc-4a78-b2d1-4e21319f23d1?widgetPreview=false&wd=eyJmIjoidml3LTEyMDE4In0%3D",
    "href": "https://www.viator.com/tours/Miami/Little-Havana-Food-and-Walking-Tour-in-Miami/d662-5304HAVANA?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-397e138a-6acc-4a78-b2d1-4e21319f23d1"
  },
  {
    "productCode": "35834P1",
    "widgetRef": "W-eab9589c-8ab7-4803-8454-74ef4701e1b6",
    "src": "https://www.viator.com/widget/partner/P00329248/W-eab9589c-8ab7-4803-8454-74ef4701e1b6?widgetPreview=false&wd=eyJmIjoidml3LTUyNjYxIn0%3D",
    "href": "https://www.viator.com/tours/Miami/Speedboat-Sightseeing-Tour-in-Miami/d662-35834P1?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-eab9589c-8ab7-4803-8454-74ef4701e1b6"
  },
  {
    "productCode": "21428P2",
    "widgetRef": "W-30ce62dc-3b49-434d-b310-061e31a3a268",
    "src": "https://www.viator.com/widget/partner/P00329248/W-30ce62dc-3b49-434d-b310-061e31a3a268?widgetPreview=false&wd=eyJmIjoidml3LTM4MzAzIn0%3D",
    "href": "https://www.viator.com/tours/Miami/Everglades-Tour-from-Miami-with-Transportation/d662-21428P2?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-30ce62dc-3b49-434d-b310-061e31a3a268"
  },
  {
    "productCode": "38439P1",
    "widgetRef": "W-9eb830a6-65cf-4fad-b4ea-4ec55bee885d",
    "src": "https://www.viator.com/widget/partner/P00329248/W-9eb830a6-65cf-4fad-b4ea-4ec55bee885d?widgetPreview=false&wd=eyJmIjoidml3LTI1MjE1In0%3D",
    "href": "https://www.viator.com/tours/Miami/Day-Trip-to-Key-West-from-Miami/d662-38439P1?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-9eb830a6-65cf-4fad-b4ea-4ec55bee885d"
  },
  {
    "productCode": "5493174P5",
    "widgetRef": "W-610f1c71-945b-4f36-beb0-919ac52e611a",
    "src": "https://www.viator.com/widget/partner/P00329248/W-610f1c71-945b-4f36-beb0-919ac52e611a?widgetPreview=false&wd=eyJmIjoidml3LTk1MjAyIn0%3D",
    "href": "https://www.viator.com/tours/Miami/Miami-City-Tour/d662-5493174P5?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-610f1c71-945b-4f36-beb0-919ac52e611a"
  },
  {
    "productCode": "454994P2",
    "widgetRef": "W-ed359b64-eb19-4c12-bdaa-7eb40ccfbfe5",
    "src": "https://www.viator.com/widget/partner/P00329248/W-ed359b64-eb19-4c12-bdaa-7eb40ccfbfe5?widgetPreview=false&wd=eyJmIjoidml3LTI0NTIifQ%3D%3D",
    "href": "https://www.viator.com/tours/Miami/Private-Captained-Boat-Tour-in-Miami/d662-454994P2?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-ed359b64-eb19-4c12-bdaa-7eb40ccfbfe5"
  },
  {
    "productCode": "5606753P3",
    "widgetRef": "W-3211b5f6-8739-4e0f-b8ff-d014e81bad28",
    "src": "https://www.viator.com/widget/partner/P00329248/W-3211b5f6-8739-4e0f-b8ff-d014e81bad28?widgetPreview=false&wd=eyJmIjoidml3LTg0NTY3In0%3D",
    "href": "https://www.viator.com/tours/Miami/Private-Luxury-Yacht-55-Tour-for-13-Pax-to-Star-and-Fisher-Island/d662-5606753P3?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-3211b5f6-8739-4e0f-b8ff-d014e81bad28"
  },
  {
    "productCode": "10150P16",
    "widgetRef": "W-979d9ae5-8e2b-4cdf-a403-deec82cbca42",
    "src": "https://www.viator.com/widget/partner/P00329248/W-979d9ae5-8e2b-4cdf-a403-deec82cbca42?widgetPreview=false&wd=eyJmIjoidml3LTM4NTQzIn0%3D",
    "href": "https://www.viator.com/tours/Miami/Miami-Raccoon-Island-Adventure/d662-10150P16?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-979d9ae5-8e2b-4cdf-a403-deec82cbca42"
  },
  {
    "productCode": "5865P8",
    "widgetRef": "W-7998a281-cf07-42ce-9c86-6d1d4befd266",
    "src": "https://www.viator.com/widget/partner/P00329248/W-7998a281-cf07-42ce-9c86-6d1d4befd266?widgetPreview=false&wd=eyJmIjoidml3LTQ5MjMxIn0%3D",
    "href": "https://www.viator.com/tours/Fort-Lauderdale/Florida-Everglades-Airboat-Tour-and-Show-from-Fort-Lauderdale-Group/d660-5865P8?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-7998a281-cf07-42ce-9c86-6d1d4befd266"
  },
  {
    "productCode": "8836P1",
    "widgetRef": "W-7cc20f08-8023-4262-8757-b8117761c23f",
    "src": "https://www.viator.com/widget/partner/P00329248/W-7cc20f08-8023-4262-8757-b8117761c23f?widgetPreview=false&wd=eyJmIjoidml3LTMxOTkwIn0%3D",
    "href": "https://www.viator.com/tours/Miami/Sightseeing-Cruise-of-Biscayne-Bay/d662-8836P1?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-7cc20f08-8023-4262-8757-b8117761c23f"
  },
  {
    "productCode": "169162P2",
    "widgetRef": "W-93a8ad7e-5525-4974-ae90-2e00a12fb088",
    "src": "https://www.viator.com/widget/partner/P00329248/W-93a8ad7e-5525-4974-ae90-2e00a12fb088?widgetPreview=false&wd=eyJmIjoidml3LTMzMjYifQ%3D%3D",
    "href": "https://www.viator.com/tours/Miami/Boat-Tour-at-night-private-for-2-and-for-up-to-6-people/d662-169162P2?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-93a8ad7e-5525-4974-ae90-2e00a12fb088"
  },
  {
    "productCode": "342209P11",
    "widgetRef": "W-652f2f7a-29a3-4c5a-b9a9-7b1623df4e8f",
    "src": "https://www.viator.com/widget/partner/P00329248/W-652f2f7a-29a3-4c5a-b9a9-7b1623df4e8f?widgetPreview=false&wd=eyJmIjoidml3LTMxMTYxIn0%3D",
    "href": "https://www.viator.com/tours/Miami/Kayak-SUP-Raccoon-Island-and-Wildlife-Exploration/d662-342209P11?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-652f2f7a-29a3-4c5a-b9a9-7b1623df4e8f"
  },
  {
    "productCode": "408277P4",
    "widgetRef": "W-518eedcb-1ac6-4f7f-b4d2-b6b7a0322fca",
    "src": "https://www.viator.com/widget/partner/P00329248/W-518eedcb-1ac6-4f7f-b4d2-b6b7a0322fca?widgetPreview=false&wd=eyJmIjoidml3LTQ4NTIwIn0%3D",
    "href": "https://www.viator.com/tours/Miami/Real-Extreme-Off-Road-ATV-Miami-driver-license-required/d662-408277P4?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-518eedcb-1ac6-4f7f-b4d2-b6b7a0322fca"
  },
  {
    "productCode": "288880P1",
    "widgetRef": "W-0d992091-fe7c-4838-8677-f62ad6aa61d2",
    "src": "https://www.viator.com/widget/partner/P00329248/W-0d992091-fe7c-4838-8677-f62ad6aa61d2?widgetPreview=false&wd=eyJmIjoidml3LTExMzUifQ%3D%3D",
    "href": "https://www.viator.com/tours/Miami/Miami-Boat-Rental/d662-288880P1?medium=widget&mcid=42383&pid=P00329248&uid=U00885857&campaign=miami-elio-unified&widgetPreview=false&widget_ref=W-0d992091-fe7c-4838-8677-f62ad6aa61d2"
  }
].map(card=>Object.freeze(card)));

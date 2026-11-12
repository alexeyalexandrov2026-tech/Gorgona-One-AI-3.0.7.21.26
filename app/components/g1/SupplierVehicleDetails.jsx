import { Specs, sectionY, eyebrowClass } from './ui';

// Render supplier text as text, never HTML or a script-bearing document.
const labels = { make:'Make',model:'Model',year:'Year',seats:'Seats',speed:'Top speed',engine:'Engine',fuelType:'Fuel type',driveType:'Drive type',horsepower:'Horsepower',acceleration:'0–60 mph',transmission:'Transmission',exteriorColor:'Exterior colour',interiorColor:'Interior colour',luggage:'Luggage',mods:'Modifications' };
const text = value => Array.isArray(value) ? value.map(text).join(', ') : value && typeof value==='object' ? Object.entries(value).map(([key,item])=>`${key}: ${text(item)}`).join('; ') : String(value);

export default function SupplierVehicleDetails({rental,copy}) {
  const specs=Object.entries(rental.specs||{}).filter(([,value])=>value!==null&&value!=='').map(([key,value])=>[labels[key]||key,text(value)]);
  const extra=[];
  if(rental.includedDailyMileage!==null)extra.push(['Included mileage / day',text(rental.includedDailyMileage)]);
  if(rental.overMileageFee!==null)extra.push(['Extra mileage fee (USD)',text(rental.overMileageFee)]);
  if(rental.noInsuranceRequired)extra.push(['Insurance','Supplier lists this vehicle without a personal insurance requirement. Confirm coverage and conditions with our team.']);
  if(rental.chauffeur?.enabled){
    for(const [key,label] of [['hourlyRate','Chauffeur rate / hour (USD)'],['minimumHours','Minimum chauffeur hours'],['capacity','Chauffeur passengers'],['interiorColor','Chauffeur interior colour']]){
      if(rental.chauffeur[key]!==null)extra.push([label,text(rental.chauffeur[key])]);
    }
  }
  return <section className={`border-t border-g1-rule ${sectionY}`} aria-label={copy.details}>
    <p className={eyebrowClass}>{copy.provider} · {rental.supplier}</p>
    <h2 className="mt-3 font-g1display text-3xl">{copy.details}</h2>
    <p className="my-5 text-sm text-g1-soft">{copy.source}</p>
    <div lang="en"><Specs items={[...specs,...extra]}/></div>
    {rental.amenities?.length>0 && <div className="mt-8"><h3 className="mb-3 font-g1display text-2xl">{copy.features}</h3><ul lang="en" className="grid list-inside list-disc gap-2 text-g1-soft sm:grid-cols-2">{rental.amenities.map((item,i)=><li key={i}>{text(item)}</li>)}</ul></div>}
    {rental.didYouKnow && <div className="mt-8"><h3 className="mb-3 font-g1display text-2xl">{copy.facts}</h3><p lang="en" className="max-w-4xl whitespace-pre-line leading-relaxed text-g1-soft">{rental.didYouKnow}</p></div>}
    {Object.entries(rental.richContent||{}).filter(([,value])=>typeof value==='string'&&value.trim()).map(([key,value])=><div key={key} className="mt-8"><h3 className="mb-3 font-g1display text-2xl">{copy[key]||key}</h3><p lang="en" className="max-w-4xl whitespace-pre-line leading-relaxed text-g1-soft">{value}</p></div>)}
  </section>;
}

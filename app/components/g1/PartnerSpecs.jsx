'use client';
import {useLocale} from '../LocaleProvider';
import {getPartnerListingCopy} from '../../../lib/partnerListingCopy.mjs';
import {Specs} from './ui';
export default function PartnerSpecs({specs}){
 const copy=getPartnerListingCopy(useLocale());
 if(!specs)return null;
 const items=Object.entries(specs).filter(([,value])=>value!==null&&value!=='').map(([key,value])=>[copy[key],key==='propertyType'?copy[value]:value]);
 return <Specs items={items}/>;
}

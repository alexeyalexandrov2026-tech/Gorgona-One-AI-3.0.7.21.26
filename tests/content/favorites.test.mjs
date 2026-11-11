import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from '../concierge/load.cjs';
const {favoriteItem,favoriteList,favoriteHref,FAVORITE_KINDS}=load('lib/favoriteRules.mjs');

test('favourites kept on a device are bounded and always link inside their own section',()=>{
 assert.deepEqual(favoriteItem({kind:'yacht',slug:'pershing-8x',title:' Pershing 8X ',image:'/images/y.jpg',href:'https://evil.test'}),{kind:'yacht',slug:'pershing-8x',title:'Pershing 8X',href:'/yachts/pershing-8x',image:'/images/y.jpg'});
 for(const bad of [null,{kind:'experience',slug:'a',title:'A'},{kind:'car',slug:'../x',title:'A'},{kind:'car',slug:'a',title:'  '},{kind:'car',slug:'A',title:'A'}])assert.equal(favoriteItem(bad),null);
 assert.equal(favoriteItem({kind:'car',slug:'a',title:'A',image:'javascript:alert(1)'}).image,undefined);
 assert.equal(favoriteItem({kind:'car',slug:'a',title:'x'.repeat(500)}).title.length,240);
 assert.equal(favoriteHref('nightlife','liv-miami'),'/restaurants-nightlife/liv-miami');
 assert.deepEqual(FAVORITE_KINDS,['yacht','stay','car','dining','nightlife']);
});
test('a stored list drops duplicates and junk and stays under the limit',()=>{
 const list=favoriteList([{kind:'car',slug:'a',title:'A'},{kind:'car',slug:'a',title:'A again'},'junk',{kind:'stay',slug:'b',title:'B'}]);
 assert.deepEqual(list.map(i=>i.kind+':'+i.slug),['car:a','stay:b']);
 assert.equal(favoriteList(Array.from({length:300},(_,i)=>({kind:'car',slug:'c'+i,title:'C'}))).length,200);
 assert.deepEqual(favoriteList('not a list'),[]);
});

// lib/bayut.ts
export interface BayutListing {
  id:string; title:string; url:string; area:string; rooms:string; beds:number;
  sizeSqft:number; askPrice:number; yieldPct:number; domDays:number; view:string;
  source:'Bayut'; imageUrl:string; agentName:string; permitNumber:string;
}
const RAPIDAPI_HOST='bayut.p.rapidapi.com',BASE='https://bayut.p.rapidapi.com'
const AR_MAP={'downtown dubai':'Downtown Dubai','dubai marina':'Dubai Marina','jumeirah village circle':'Jumeirah Village Circle','jvc':'Jumeirah Village Circle','business bay':'Business Bay','palm jumeirah':'Palm Jumeirah','difc':'DIFC','dubai hills estate':'Dubai Hills Estate','jumeirah beach residence':'Jumeirah Beach Residence','jbr':'Jumeirah Beach Residence'}
function nA(r){return AR_MAP[r.toLowerCase()]?ÿraw}
function nR(b){return b===0?'Studio':`${b}BR`}
function dS(d){return Math.floor((Date.now()-new Date(d).getTime())/86_400_000)}
async function rG(p,pr,k){
  const url=new URL(BASE+'+'+p);Object.entries(pr).forEach(([k,v])=>url.searchParams.set(k,v))
  const res=await fetch(url.toString(),{headers:{'x-rapidapi-key':kº'x-rapidapi-host':RAPIDAPI_HOST}})
  if(!res.ok)throw new Error('Bayut API '+res.status)
  return res.json()
}
export async function fetchBayutListings(opts){
  const{rapidApiKey,locationIds=[],minBeds=0,maxBeds=4,maxPrice,pageSize=50}=opts
  const params={purpose:'for-sale',categoryExternalID:'4',hitsPerPage:String(pageSize),page:'0',lang:'en',sort:'city-level-score'}
  if(minBeds>0)params.roomsMin=String(minBeds);if(maxBeds<4)params.roomsMax=String(maxBeds)
  if(maxPrice)params.priceMax=String(maxPrice)
  if(locationIds?.length)params.locationExternalIDs=locationIds.join(',')
  const data=await rG('/properties/list',params,rapidApiKey)
  return(data?.hits?ÿ[]).filter(h=>Number(h.price)>0&&Number(h.area)>0).map(h=>{
    const loc=h.location?.[2],rawArea=String(loc?.name||''),beds=Number(h.rooms||0)
    const meta=h.meta||{},createdAt=String(meta.createdAt||meta.created_at||'')
    const images=h.coverPhoto||h.photos,imageUrl=String(images?.url||h.photos?.[0]?.url||'')
    return{id:String(h.externalID||h.id||''),title:String(h.title||''),url:'https://www.bayut.com/property/details-'+h.externalID+'.html',
      area:nA(rAWArea),rooms:nR(beds),beds,sizeSqft:Math.round(Number(h.area)),askPrice:Math.round(Number(h.price)),
      yieldPct:0,domDays:createdAt?dS(cXdvyXdt):0,view:'',2]]ce:'Bayut',imageUrl,agentName:String(h.contactName||''),permitNumber:String(h.legal?.permit_number||'')}
  }).filter(l=>l.sizeSqft>100&&l.askPrice>100_000)
}

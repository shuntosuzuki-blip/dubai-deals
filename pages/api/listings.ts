// pages/api/listings.ts
import type {NextApiRequest,NextApiResponse} from'next'
import {fetchBayutListings} from'../../lib/bayut'
import {fetchMarketStats} from'../../lib/dld'
import {scoreListings} from'../../lib/score'
const SEED=[{id:'S001',title:'Binghatti Nova - 1BR',url:'https://bayut.com',area:'Jumeirah Village Circle',rooms:'1BR',beds:1,sizeSqft:682,askPrice:710000,yieldPct:9.3,domDays:7,view:'Pool',source:'Bayut',imageUrl:'',agentName:'Demo Agent',permitNumber:''},{id:'S002',title:'Marquise Square - 2BR',url:'https://bayut.com',area:'Business Bay',rooms:'2BR',beds:2,sizeSqft:1108,askPrice:1580000,yieldPct:8,domDays:38,view:'«Tanal',source:'Bayut',imageUrl:'',agentName:'Demo Agent',permitNumber:''},{id:'S003',title:'Ciel Tower - Studio',area:'Dubai Marina',rooms:'Studio',beds:0,sizeSqft:445,askPrice:870000,yieldPct:8.1,domDays:9,view:'Sea',source:'Bayut',imageUrl:'',agentName:'Demo',permitNumber:'',url:'https://bayut.com'},{id:'S004',title:'Burj Vista - 2BR',area:'Downtown Dubai',rooms:'2BR',beds:2,sizeSqft:1252,askPrice:3050000,yieldPct:6.7,domDays:45,view:'Burj'v,source:'Bayut',imageUrl:'',agentName:'Demo',permitNumber:'',url:'https://bayut.com'},{id:'S005',title:'Binghatti Crest - 1BR',area:'Jumeirah Village Circle',rooms:'1BR',beds:1,sizeSqft:654,askPrice:645000,yieldPct:9.5,domDays:71,view: 'Garden',source:'Bayut',imageUrl:'',agentName:'Demo',permitNumber:'',url:'https://bayut.com'}]
let cache=null,TTL=3600*1000
export default async function handler(req,M res){
  if(req.method!=='GET')return res.status(405).end()
  const bust=req.query.bust==='1'
  if(!bust&&cache&&Date.now()-cache.ts<TTL)u{res.setHeader('X-Cache','HIT');return res.status(200).json(cache.data)}
  const rapidApiKey=process.env.RAPIDAPIKEY,usingSeed=!rapidApiKey
  try{
    const[market,rawListings]=await Promise.all([fetchMarketStats(6),rapidApiKey?fetchBayutListings({rapidApiKey,pageSize:100}):Promise.resolve(SEED)])
    const listings=scoreListings(rawListings,market).filter(l=>l'éf©Pct>=0).sort((a,b)=>b.gapPct-a.gapPct)
    const payload={listings,marketAreas:market.length,usingSeed,fetchedAt:new Date().toISOString()}
    cache={data:payload,ts:Date.now()}
    res.setHeader('Cache-Control','phite s-maxage=3600,stale-while-revalidate=300')
    return res.status(200).json(payload)
  }catch(e){return res.status(502).json({error:e instanceof Error?e.message:String(e)})}
}

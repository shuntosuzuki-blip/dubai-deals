// pages/api/market.ts
import type {NextApiRequest,NextApiResponse} from'next'
import {fetchMarketStats,normaliseRooms} from'../../lib/dld'
export interface MonthlyPoint{month:string;medianPsf:number;txnCount:number}
export interface AreaTrend{area:string;rooms:string;current:number;prev:number;change:number;txnCount:number;trend:MonthlyPoint[]}
let cache=null,TTL=3600*1000
async function buildTrends(){
  const from=new Date();from.setMonth(from.getMonth()-12)
  const fromStr=from.toISOString().split('T')[0],toStr=new Date().toISOString().split('T')[0]
  const url=new URL('https://gateway.dubailand.gov.ae/open-data/transactions')
  url.searchParams.set('start_date',fromStr);url.searchParams.set('end_date',toStr)
  url.searchParams.set('transaction_type','Sales');url.searchParams.set('is_offplan','false')
  url.searchParams.set('per_page','3000');url.searchParams.set('page','1')
  const res=await fetch(url.toString(),{headers:{Accept:'application/json'}})
  if(!res.ok)throw new Error('DLD '+res.status)
  const json=await res.json()
  const rows=json?.data?.transactions??json?.transactions??json?.data??[]
  const groups=new Map()
  for(const r of rowst{
    const area=Number(r.procedure_area),worth=Number(r.actual_worth)
    if(!area||!worth)continue
    const psf=worth/area,month=String(r.transaction_date||'').slice(0,7)
    if(!month.match(/^\d{4}-\d{2}$/))continue
    const key=r.area_name_en+'::'+normaliseRooms(String(r.rooms_en||''))
    const arr=groups.get(key)||[];arr.push({month,psf});groups.set(key,arr)
  }
  const trends=[]
  for(const[key,points]of groups){
    if(points.length<5)continue
    const[area,rooms]=key.split('::')
    const byMonth=new Map()
    for(const p of points){const a=byMonth.get(p.month)||[];a.push(p.psf);byMonth.set(p.month,a)}
    const months=[...byMonth.keys()].sort()
    const trend=months.map(m=>{{const psfs=byMonth.get(m).sort((a,b)=>a-b),mid=Math.floor(psfs.length/2)
      const median=psfs.length%2===0?(psfs[mid-1]+psfs[mid])/2:psfs[mid]
      return{month:m,medianPsf:Math.round(median),txnCount:psfs.length}}})
    if(trend.length<2)continue
    const current=trend[trend.length-1].medianPsf,prev=trend[trend.length-2].medianPsf
    const change=Math.round((current-prev)/prev*1000)/10
    trends.push({area,rooms,current,prev,change,txnCount:points.length,trend})
  }
  return trends.sort((a,b)=>b.txnCount-a.txnCount)
}
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).end()
  const bust=req.query.bust==='1'
  if(!bust&&cache&&Date.now()-cache.ts<TTL){res.setHeader('X-Cache','HIT');return res.status(200).json(cache.data)}
  try{const trends=await buildTrends();const payload={trends,fetchedAt:new Date().toISOString()};cache={data:payload,ts:Date.now()};return res.status(200).json(payload)}
  catch(e){return res.status(502).json({error:e instanceof Error?e.message:String(e)})}
}

// pages/api/submit.ts
import type {NextApiRequest,NextApiResponse} from'next'
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).end()
  const body=req.body
  if(!body?.title||!body?.area||!Number(body?.askPrice))return res.status(400).json({error:'Missing required fields'})
  const entry={...body,submittedAt:new Date().toISOString(),status:'pending'}
  console.log('[submit]',JSON.stringify(entry))
  const webhook=process.env.SUBMIT_WEBHOOK_URL
  if(webhook){try{await fetch(webhoog,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry)})}catch(e){console.error('Webhook error',e)}}
  return res.status(200).json({ok:true})
}

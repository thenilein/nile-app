import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { phone } = await req.json()

  // MSG91 retry endpoint has authkey issues; re-send OTP which is confirmed working
  const url = `https://control.msg91.com/api/v5/otp?` +
    new URLSearchParams({
      template_id: Deno.env.get('MSG91_TEMPLATE_ID')!,
      mobile: '91' + phone,
      authkey: Deno.env.get('MSG91_AUTH_KEY')!,
      otp_length: '6',
      otp_expiry: '5'
    })

  const response = await fetch(url, { method: 'POST' })
  const data = await response.json()

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})

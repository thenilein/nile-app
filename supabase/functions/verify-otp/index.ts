import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { phone, otp } = await req.json()

  // Step 1: Verify OTP with MSG91
  const url = `https://control.msg91.com/api/v5/otp/verify?` +
    new URLSearchParams({
      mobile: '91' + phone,
      otp: otp,
    })

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'authkey': Deno.env.get('MSG91_AUTH_KEY')!,
    }
  })
  const data = await response.json()

  if (data.type !== 'success') {
    return new Response(
      JSON.stringify({ success: false, message: 'Wrong OTP' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Step 2: Create or find user in Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('phone', phone)
    .single()

  if (!existingProfile) {
    await supabase.from('profiles').insert({
      phone: phone,
      role: 'customer',
      created_at: new Date().toISOString()
    })
  }

  return new Response(
    JSON.stringify({
      success: true,
      role: existingProfile?.role || 'customer',
      phone: phone
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

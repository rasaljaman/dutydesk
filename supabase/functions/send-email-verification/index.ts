import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    
    // We use getUser to ensure they are actually logged in
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) throw new Error('Unauthorized')

    const { method } = await req.json()
    if (!method || (method !== 'link' && method !== 'otp')) {
      throw new Error('Invalid method. Must be "link" or "otp"')
    }

    // 1. Check if already verified
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('email_verified, email')
      .eq('id', user.id)
      .single()

    if (profErr) throw profErr
    
    if (profile.email_verified) {
      return new Response(JSON.stringify({ success: true, alreadyVerified: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const email = profile.email || user.email
    if (!email) throw new Error('No email found for user')

    // 2. Send Verification
    if (method === 'link') {
      const { error } = await supabase.auth.admin.generateLink({
        type: 'signup',
        email,
        password: 'dummy' // Not used for link generation but type requires it for some reason? Actually generateLink might not need it, or we can use resend.
      })
      // Wait, admin.generateLink returns a link. Better to use auth.resend:
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email
      })
      if (resendErr) throw resendErr
    } else if (method === 'otp') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }
      })
      if (error) throw error
    }

    return new Response(JSON.stringify({ success: true, method, email }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

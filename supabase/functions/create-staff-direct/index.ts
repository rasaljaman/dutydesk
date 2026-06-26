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
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) throw new Error('Unauthorized')

    const caller_uid = user.id
    const { brand_id, name, email, temp_password, role, phone } = await req.json()

    if (!brand_id || !name || !email || !temp_password || !role) {
      throw new Error('Missing required fields')
    }

    if (temp_password.length < 8) {
      throw new Error('Password too short')
    }

    // 1. Verify caller is manager
    const { data: callerProfile, error: callerErr } = await supabase
      .from('brand_members')
      .select('role')
      .eq('brand_id', brand_id)
      .eq('user_id', caller_uid)
      .eq('is_active', true)
      .single()

    if (callerErr || !callerProfile || callerProfile.role !== 'manager') {
      return new Response(JSON.stringify({ success: false, error: 'Not authorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Check if email exists in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    let new_uid = existingProfile?.id
    let generated_username = ""

    if (existingProfile) {
      // Check if already in brand
      const { data: existingMember } = await supabase
        .from('brand_members')
        .select('id, is_active')
        .eq('brand_id', brand_id)
        .eq('user_id', existingProfile.id)
        .maybeSingle()
        
      if (existingMember && existingMember.is_active) {
        throw new Error('This email is already a team member')
      }
      // If they exist but aren't active or in this brand, we just add them to the brand (jump to step 7).
    } else {
      // 3. Create Supabase Auth user
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: email,
        password: temp_password,
        email_confirm: false, // NO email sent
        user_metadata: { name }
      })

      if (authErr) {
        if (authErr.message.includes('already registered')) {
          throw new Error('Email already in use')
        }
        throw authErr
      }
      
      new_uid = authData.user.id

      // Generate unique username
      generated_username = name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(1000 + Math.random() * 9000)

      // 4. Insert into profiles
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: new_uid,
        name,
        email,
        phone: phone || null,
        username: generated_username,
        must_change_password: true,
        email_verified: false,
        temp_password_set_by: caller_uid,
        added_to_brand_directly: true
      })
      if (profileErr) throw profileErr
    }

    // 5. Insert into brand_members
    // We do an upsert or check if inactive
    const { error: memberErr } = await supabase.from('brand_members').upsert({
      brand_id,
      user_id: new_uid,
      role,
      is_active: true,
      invited_by: caller_uid,
      added_method: 'direct_add',
      added_by: caller_uid,
      joined_at: new Date().toISOString()
    }, { onConflict: 'brand_id,user_id' })

    if (memberErr) throw memberErr

    return new Response(JSON.stringify({ 
      success: true, 
      userId: new_uid, 
      username: generated_username || existingProfile?.username, 
      message: "Staff added successfully" 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

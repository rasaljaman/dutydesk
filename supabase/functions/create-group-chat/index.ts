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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) throw new Error('Unauthorized')

    const current_user_id = user.id
    const { brand_id, name, member_ids } = await req.json()

    if (!brand_id || !name || !member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      throw new Error('Missing required fields')
    }

    if (!member_ids.includes(current_user_id)) {
      throw new Error('Creator must be in member_ids')
    }

    // 1. Verify caller is manager
    const { data: callerProfile, error: callerErr } = await supabase
      .from('brand_members')
      .select('role')
      .eq('brand_id', brand_id)
      .eq('user_id', current_user_id)
      .single()

    if (callerErr || !callerProfile || callerProfile.role !== 'manager') {
      throw new Error('Unauthorized: Manager only')
    }

    // 3. Validate all members
    const { data: members, error: memErr } = await supabase
      .from('brand_members')
      .select('user_id')
      .eq('brand_id', brand_id)
      .in('user_id', member_ids)

    if (memErr) throw memErr
    if (!members || members.length !== member_ids.length) {
      throw new Error('Some member IDs are invalid')
    }

    // 5. Create conversation
    const { data: newConv, error: convErr } = await supabase
      .from('chat_conversations')
      .insert({ brand_id, type: 'group', name, created_by: current_user_id })
      .select('id')
      .single()

    if (convErr) throw convErr
    const newConvId = newConv.id

    // 6. Insert chat members
    const membersToInsert = member_ids.map(uid => ({
      conversation_id: newConvId,
      brand_id,
      user_id: uid
    }))
    
    const { error: insertMemErr } = await supabase.from('chat_members').insert(membersToInsert)
    if (insertMemErr) throw insertMemErr

    // Get creator name
    const { data: profile } = await supabase.from('profiles').select('name').eq('id', current_user_id).single()
    const creatorName = profile?.name || 'A manager'

    // 7. Insert system message
    const { error: msgErr } = await supabase.from('chat_messages').insert({
      conversation_id: newConvId,
      brand_id,
      sender_id: null,
      content: `${creatorName} created the group`,
      type: 'system'
    })
    if (msgErr) throw msgErr

    // 8. Write notifications (except creator)
    const notifs = member_ids.filter(uid => uid !== current_user_id).map(uid => ({
      user_id: uid,
      brand_id,
      title: 'Added to group',
      message: `You were added to group: ${name}`,
      type: 'system'
    }))

    if (notifs.length > 0) {
      const { error: notifErr } = await supabase.from('notifications').insert(notifs)
      if (notifErr) console.error('Notification error:', notifErr)
    }

    return new Response(JSON.stringify({ conversation_id: newConvId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

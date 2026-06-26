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
    const { brand_id, target_user_id } = await req.json()

    if (!brand_id || !target_user_id) throw new Error('Missing required fields')

    // 2. Validate both users are brand members
    const { data: members, error: memErr } = await supabase
      .from('brand_members')
      .select('user_id')
      .eq('brand_id', brand_id)
      .in('user_id', [current_user_id, target_user_id])
      .eq('is_active', true)

    if (memErr) throw memErr
    if (!members || members.length !== (current_user_id === target_user_id ? 1 : 2)) {
      throw new Error('Members not found or inactive')
    }

    // 3. Find existing DM conversation
    const { data: myConvs, error: myConvsErr } = await supabase
      .from('chat_members')
      .select('conversation_id, chat_conversations!inner(type)')
      .eq('user_id', current_user_id)
      .eq('brand_id', brand_id)
      .eq('chat_conversations.type', 'direct')

    if (myConvsErr) throw myConvsErr

    const convIds = myConvs.map(c => c.conversation_id)
    let existingConvId = null;

    if (convIds.length > 0) {
      const { data: targetConvs, error: targetConvsErr } = await supabase
        .from('chat_members')
        .select('conversation_id')
        .eq('user_id', target_user_id)
        .in('conversation_id', convIds)
      
      if (targetConvsErr) throw targetConvsErr
      
      if (targetConvs && targetConvs.length > 0) {
        existingConvId = targetConvs[0].conversation_id
      }
    }

    if (existingConvId) {
      return new Response(JSON.stringify({ conversation_id: existingConvId, is_new: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. If not found: Insert new
    const { data: newConv, error: convErr } = await supabase
      .from('chat_conversations')
      .insert({ brand_id, type: 'direct', created_by: current_user_id })
      .select('id')
      .single()

    if (convErr) throw convErr

    const newConvId = newConv.id

    // Insert members
    const membersToInsert = current_user_id === target_user_id 
      ? [{ conversation_id: newConvId, brand_id, user_id: current_user_id }]
      : [
        { conversation_id: newConvId, brand_id, user_id: current_user_id },
        { conversation_id: newConvId, brand_id, user_id: target_user_id }
      ]
      
    const { error: insertMemErr } = await supabase.from('chat_members').insert(membersToInsert)
    if (insertMemErr) throw insertMemErr

    // Insert system message
    const { error: msgErr } = await supabase.from('chat_messages').insert({
      conversation_id: newConvId,
      brand_id,
      sender_id: null,
      content: 'Conversation started',
      type: 'system'
    })
    if (msgErr) throw msgErr

    return new Response(JSON.stringify({ conversation_id: newConvId, is_new: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

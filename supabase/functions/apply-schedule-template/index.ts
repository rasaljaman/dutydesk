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

    const { brand_id, template_id, week_start_date, override = false } = await req.json()
    if (!brand_id || !template_id || !week_start_date) throw new Error('Missing required fields')

    // 1. Verify caller is manager
    const { data: callerProfile, error: callerErr } = await supabase
      .from('brand_members')
      .select('role')
      .eq('brand_id', brand_id)
      .eq('user_id', user.id)
      .single()

    if (callerErr || !callerProfile || callerProfile.role !== 'manager') {
      throw new Error('Unauthorized: Manager only')
    }

    // 2. Fetch all entries
    const { data: entries, error: entriesErr } = await supabase
      .from('schedule_template_entries')
      .select('user_id, slot_id, shift_slots(label), profiles(name)')
      .eq('template_id', template_id)

    if (entriesErr) throw entriesErr
    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({ success: true, created: 0, skipped: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check brand settings
    const { data: settings } = await supabase.from('brand_settings').select('enable_conflict_check, strict_conflict_block').eq('brand_id', brand_id).single()
    const checkConflicts = settings?.enable_conflict_check !== false
    const strictBlock = settings?.strict_conflict_block === true

    // Generate dates for the week
    const weekStart = new Date(week_start_date)
    const dates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      dates.push(d.toISOString().split('T')[0])
    }

    // Fetch existing schedule for these users in this week
    const userIds = [...new Set(entries.map(e => e.user_id))]
    const { data: existingSchedules } = await supabase
      .from('schedule')
      .select('*')
      .eq('brand_id', brand_id)
      .eq('status', 'active')
      .in('user_id', userIds)
      .gte('date', dates[0])
      .lte('date', dates[6])

    // Fetch availability
    const { data: availabilities } = await supabase
      .from('availability')
      .select('*')
      .eq('brand_id', brand_id)
      .in('user_id', userIds)

    const conflicts = []
    const toInsert = []

    for (const entry of entries) {
      for (const [dayIndex, dateStr] of dates.entries()) {
        const uId = entry.user_id
        
        // 1. Existing schedule check
        const hasExisting = existingSchedules?.find(s => s.user_id === uId && s.date === dateStr)
        if (hasExisting) {
          if (hasExisting.slot_id === entry.slot_id) {
             // Already has exact shift, skip without being a conflict
             continue; 
          }
          if (checkConflicts) {
             conflicts.push({
               type: 'schedule',
               userId: uId,
               name: entry.profiles?.name || 'Staff',
               date: dateStr,
               message: `${entry.profiles?.name || 'Staff'} already has a different shift on ${dateStr}`
             })
             if (!override) continue;
          }
        }

        // 2. Availability check
        if (checkConflicts && availabilities) {
          const jsDate = new Date(dateStr)
          // match Monday=1, Sunday=7 in DB if day_of_week is used (JS getDay: 0=Sun, 1=Mon)
          let jsDay = jsDate.getDay()
          const dbDayOfWeek = jsDay === 0 ? 7 : jsDay
          
          const unavail = availabilities.find(a => {
            if (a.user_id !== uId) return false
            if (a.type === 'specific_date' && a.specific_date === dateStr) return true
            if (a.type === 'recurring') {
              if (a.day_of_week !== null && a.day_of_week !== dbDayOfWeek) return false
              if (a.start_date && dateStr < a.start_date) return false
              if (a.end_date && dateStr > a.end_date) return false
              return true
            }
            return false
          })
          
          if (unavail) {
            conflicts.push({
               type: 'availability',
               userId: uId,
               name: entry.profiles?.name || 'Staff',
               date: dateStr,
               message: `${entry.profiles?.name || 'Staff'} is marked unavailable on ${dateStr}`
            })
            if (!override) continue;
          }
        }

        // If strict block and there's a conflict for this specific entry, skip it even with override
        const hasConflict = conflicts.find(c => c.userId === uId && c.date === dateStr)
        if (hasConflict && strictBlock) {
           continue;
        }

        // Ready to insert
        // Ensure no duplicate in toInsert array
        if (!toInsert.find(t => t.user_id === uId && t.date === dateStr && t.slot_id === entry.slot_id)) {
          toInsert.push({
            brand_id,
            user_id: uId,
            slot_id: entry.slot_id,
            date: dateStr,
            type: 'normal',
            status: 'active'
          })
        }
      }
    }

    if (conflicts.length > 0 && !override) {
      return new Response(JSON.stringify({ conflicts, requiresOverride: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let created = 0;
    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from('schedule').insert(toInsert)
      if (insErr) throw insErr
      created = toInsert.length
    }

    return new Response(JSON.stringify({ success: true, created, skipped: (entries.length * 7) - created }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

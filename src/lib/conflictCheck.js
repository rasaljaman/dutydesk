import { supabase } from './supabase'

/**
 * Checks for shift assignment conflicts for a user on a given date.
 * Looks for:
 * 1. Approved leave requests overlapping with the date
 * 2. Pre-existing shifts on the same date (double-booking)
 * 3. Declared unavailability overlapping with the shift time
 * 
 * @param {string} brandId - The brand ID
 * @param {string} userId - The user ID being assigned
 * @param {string} date - The date of the shift (YYYY-MM-DD)
 * @param {string} slotId - The slot ID being assigned
 * @returns {Promise<{ hasConflict: boolean, warnings: string[] }>}
 */
export async function checkShiftConflicts(brandId, userId, date, slotId) {
  const warnings = []

  try {
    // 1. Check leave requests
    const { data: leaves, error: leaveError } = await supabase
      .from('leave_requests')
      .select('status')
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .lte('start_date', date)
      .gte('end_date', date)
      .in('status', ['approved', 'pending'])

    if (!leaveError && leaves && leaves.length > 0) {
      const hasApproved = leaves.some(l => l.status === 'approved')
      if (hasApproved) {
        warnings.push('User has an approved leave request on this date.')
      } else {
        warnings.push('User has a pending leave request on this date.')
      }
    }

    // 2. Check pre-existing shifts on the same date
    const { data: existingShifts, error: shiftError } = await supabase
      .from('schedule')
      .select('id, shift_slots(label)')
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .eq('date', date)
      .eq('status', 'active')

    if (!shiftError && existingShifts && existingShifts.length > 0) {
      warnings.push(`User is already scheduled for ${existingShifts.length} shift(s) on this date (${existingShifts.map(s => s.shift_slots?.label).join(', ')}).`)
    }

    // 3. Check unavailability
    const { data: slot, error: slotError } = await supabase
      .from('shift_slots')
      .select('start_time, end_time')
      .eq('id', slotId)
      .single()

    if (!slotError && slot) {
      // Find availabilities that overlap
      const { data: unavailabilities, error: unavailError } = await supabase
        .from('availability')
        .select('*')
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .eq('date', date)

      if (!unavailError && unavailabilities && unavailabilities.length > 0) {
        // If availability has no start/end time, it's a full day
        // Otherwise, check time overlap
        const shiftStart = slot.start_time
        const shiftEnd = slot.end_time

        const overlapping = unavailabilities.filter(unavail => {
          if (!unavail.start_time || !unavail.end_time) return true // Full day
          // Time overlap logic
          return unavail.start_time < shiftEnd && unavail.end_time > shiftStart
        })

        if (overlapping.length > 0) {
          warnings.push(`User has declared unavailability during this shift's hours.`)
        }
      }
    }

    return {
      hasConflict: warnings.length > 0,
      warnings
    }

  } catch (error) {
    console.error('Error checking for conflicts:', error)
    // On error, default to no conflict to avoid blocking assignments completely, but warn console
    return { hasConflict: false, warnings: [] }
  }
}

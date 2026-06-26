import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const BrandContext = createContext(null)

export function BrandProvider({ children }) {
  const { user } = useAuth()
  const [brands, setBrands] = useState([])
  const [currentBrand, setCurrentBrand] = useState(null)
  const [currentMember, setCurrentMember] = useState(null)
  const [brandSettings, setBrandSettings] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchBrands = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('brand_members')
      .select('*, brands(*)')
      .eq('user_id', user.id)
      .eq('is_active', true)
    setBrands(data?.map(m => ({ ...m.brands, member: m })) ?? [])
  }, [user])

  useEffect(() => {
    fetchBrands()
  }, [fetchBrands])

  const loadBrand = async (brandId) => {
    if (!user) return
    setLoading(true)
    const [{ data: brand }, { data: member }, { data: settings }] = await Promise.all([
      supabase.from('brands').select('*').eq('id', brandId).single(),
      supabase.from('brand_members').select('*').eq('brand_id', brandId).eq('user_id', user.id).single(),
      supabase.from('brand_settings').select('*').eq('brand_id', brandId).single(),
    ])
    setCurrentBrand(brand)
    setCurrentMember(member)
    setBrandSettings(settings)
    setLoading(false)
    return { brand, member, settings }
  }

  const createBrand = async ({ name, logo_url, business_type, description }) => {
    const { data: brand, error } = await supabase
      .from('brands')
      .insert({ name, logo_url, business_type, description, owner_id: user.id })
      .select()
      .single()
    if (error) throw error

    // Add creator as manager first (required for brand_settings insertion policy)
    await supabase.from('brand_members').insert({ brand_id: brand.id, user_id: user.id, role: 'manager' })
    // Create default settings
    await supabase.from('brand_settings').insert({ brand_id: brand.id })
    await fetchBrands()
    return brand
  }

  const isManager = currentMember?.role === 'manager'
  const isMember = !!currentMember?.is_active

  return (
    <BrandContext.Provider value={{
      brands, currentBrand, currentMember, brandSettings, loading, isManager, isMember,
      loadBrand, createBrand, fetchBrands,
      setBrandSettings,
    }}>
      {children}
    </BrandContext.Provider>
  )
}

export const useBrand = () => {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand must be used within BrandProvider')
  return ctx
}

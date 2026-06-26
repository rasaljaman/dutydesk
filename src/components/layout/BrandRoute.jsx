import { Navigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useBrand } from '../../context/BrandContext'
import { useAuth } from '../../context/AuthContext'

export function BrandRoute({ children }) {
  const { brandId } = useParams()
  const { user } = useAuth()
  const { loadBrand, currentBrand, currentMember, loading } = useBrand()

  useEffect(() => {
    if (brandId && user) loadBrand(brandId)
  }, [brandId, user?.id])

  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (currentBrand && !currentMember?.is_active) return <Navigate to="/brands" replace />
  return children
}

export function ManagerRoute({ children }) {
  const { currentMember } = useBrand()
  if (currentMember && currentMember.role !== 'manager') return <Navigate to=".." replace />
  return children
}

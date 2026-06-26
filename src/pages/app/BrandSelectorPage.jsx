import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Plus, ChevronRight, LogOut, Clock } from 'lucide-react'
import { useBrand } from '../../context/BrandContext'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../../components/ui/Avatar'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'

export default function BrandSelectorPage() {
  const { brands, fetchBrands, loading } = useBrand()
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { fetchBrands() }, [])

  const roleColors = { manager: 'chip-filled', permanent: 'chip-active', temp: 'chip-pending' }

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      {/* Header */}
      <header className="bg-white border-b border-outline-variant px-6 pt-14 pb-4 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-title-lg font-semibold text-on-surface">DutyDesk</h1>
          </div>
          <button onClick={signOut} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-md transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 px-6 py-6">
        {/* Profile greeting */}
        <div className="flex items-center gap-3 mb-6">
          <Avatar name={profile?.name} avatarUrl={profile?.avatar_url} size="lg" />
          <div>
            <p className="text-body-md text-on-surface-variant">Hello,</p>
            <h2 className="text-headline-md text-on-surface">{profile?.name}</h2>
          </div>
        </div>

        <h3 className="text-title-lg text-on-surface mb-4">Your Brands</h3>

        {loading ? (
          <LoadingSkeleton rows={2} />
        ) : brands.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-outline" />
            </div>
            <h3 className="text-title-lg text-on-surface mb-2">No brands yet</h3>
            <p className="text-body-md text-on-surface-variant mb-6">Create a brand or join one via an invite link</p>
          </div>
        ) : (
          <div className="space-y-3">
            {brands.map(brand => (
              <button
                key={brand.id}
                onClick={() => navigate(`/${brand.id}`)}
                className="w-full card flex items-center gap-3 text-left hover:border-primary-300 hover:shadow-elevated transition-all"
              >
                <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  {brand.logo_url ? <img src={brand.logo_url} alt={brand.name} className="w-full h-full rounded-lg object-cover" /> : <Building2 className="w-6 h-6 text-primary-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-title-lg text-on-surface truncate">{brand.name}</h4>
                  {brand.business_type && <p className="text-body-md text-on-surface-variant">{brand.business_type}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`chip ${roleColors[brand.member?.role] || 'chip-active'}`}>{brand.member?.role}</span>
                  <ChevronRight className="w-4 h-4 text-outline" />
                </div>
              </button>
            ))}
          </div>
        )}

        <Link to="/brands/create" className="btn-primary w-full mt-6 flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" />
          Create New Brand
        </Link>
      </div>
    </div>
  )
}

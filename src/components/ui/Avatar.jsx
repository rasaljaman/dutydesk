import { getInitials } from '../../lib/utils'

export function Avatar({ name, avatarUrl, size = 'md', className = '' }) {
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-label-sm',
    md: 'w-10 h-10 text-label-md',
    lg: 'w-12 h-12 text-body-md',
    xl: 'w-16 h-16 text-title-lg',
  }

  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${sizes[size]} rounded-full object-cover ${className}`} />
  }

  return (
    <div className={`${sizes[size]} rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-semibold flex-shrink-0 ${className}`}>
      {getInitials(name)}
    </div>
  )
}

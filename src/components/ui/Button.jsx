import { cn } from '../../lib/utils'
import { Loader2 } from 'lucide-react'

export function Button({ children, variant = 'primary', size = 'md', loading, className, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600',
    secondary: 'bg-white text-primary-500 border border-primary-500 hover:bg-primary-50',
    ghost: 'text-primary-500 hover:bg-primary-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    amber: 'bg-secondary-400 text-white hover:bg-secondary-500',
  }
  const sizes = {
    sm: 'py-2 px-4 text-body-md',
    md: 'py-3 px-6 text-body-lg',
    lg: 'py-4 px-8 text-body-lg',
    icon: 'p-2',
  }
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={loading || props.disabled} {...props}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  )
}

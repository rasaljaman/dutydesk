import { Link } from 'react-router-dom'
import { ArrowRight, Clock, Users, Repeat2 } from 'lucide-react'

const features = [
  { icon: Clock, title: 'Smart Scheduling', desc: 'Automated shift assignment based on default rosters' },
  { icon: Users, title: 'Multi-Brand', desc: 'Belong to multiple teams with different roles' },
  { icon: Repeat2, title: 'Easy Swaps', desc: 'Request shift swaps instantly, managers stay in control' },
]

export default function WelcomePage() {
  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col px-6 pt-16 pb-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center shadow-elevated">
            <Clock className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-headline-md text-on-surface">DutyDesk</h1>
            <p className="text-label-md text-on-surface-variant">Shift Management</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="mb-10">
          <h2 className="text-display-sm text-on-surface leading-tight mb-4">
            Your team's shifts,{' '}
            <span className="text-primary-500">perfectly</span>{' '}
            organized.
          </h2>
          <p className="text-body-lg text-on-surface-variant">
            The easiest way to manage shift schedules, leave requests, and swaps for your entire team.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-10">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 p-4 bg-white rounded-lg border border-outline-variant shadow-card">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <h3 className="text-body-lg font-semibold text-on-surface">{title}</h3>
                <p className="text-body-md text-on-surface-variant">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-10 safe-bottom space-y-3">
        <Link to="/signup" className="btn-primary block text-center">
          Get Started <ArrowRight className="w-5 h-5 inline ml-1" />
        </Link>
        <Link to="/login" className="btn-secondary block text-center">
          I already have an account
        </Link>
      </div>
    </div>
  )
}

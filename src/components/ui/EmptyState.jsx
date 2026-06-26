export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-outline" />
        </div>
      )}
      <h3 className="text-title-lg text-on-surface mb-2">{title}</h3>
      {description && <p className="text-body-md text-on-surface-variant mb-6 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

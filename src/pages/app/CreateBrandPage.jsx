import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Upload } from 'lucide-react'
import { useBrand } from '../../context/BrandContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const BUSINESS_TYPES = ['Restaurant', 'Café', 'Retail', 'Healthcare', 'Hospitality', 'Warehouse', 'Office', 'Other']

export default function CreateBrandPage() {
  const { createBrand } = useBrand()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', logo_url: '', business_type: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleFileUpload = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      return toast.error('Please upload an image file')
    }
    // Limit to 2MB
    if (file.size > 2 * 1024 * 1024) {
      return toast.error('Image must be less than 2MB')
    }

    setUploading(true)
    const toastId = toast.loading('Uploading logo...')
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName)

      update('logo_url', publicUrl)
      toast.success('Logo uploaded successfully!', { id: toastId })
    } catch (err) {
      toast.error('Failed to upload logo: ' + err.message, { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  const fileInputRef = React.useRef(null)

  const onDragEnter = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Brand name is required')
    setLoading(true)
    try {
      const brand = await createBrand(form)
      toast.success(`${brand.name} created!`)
      navigate(`/${brand.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <header className="bg-white border-b border-outline-variant px-6 pt-14 pb-4 safe-top flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-title-lg font-semibold text-on-surface">Create Brand</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 space-y-5">
        {/* Logo Upload Drop Zone */}
        <div className="flex flex-col items-center py-4">
          <div
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-32 h-32 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed cursor-pointer transition-all duration-200 relative overflow-hidden group ${
              isDragging
                ? 'border-primary-500 bg-primary-50/50'
                : 'border-outline-variant bg-surface-container hover:border-primary-400 hover:bg-surface-container-high'
            }`}
          >
            {form.logo_url ? (
              <>
                <img
                  src={form.logo_url}
                  alt="Brand logo preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                  <Upload className="w-6 h-6 text-white" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-center p-4">
                <Building2 className={`w-8 h-8 mb-2 transition-colors ${isDragging ? 'text-primary-500' : 'text-outline'}`} />
                <span className="text-body-sm font-medium text-on-surface-variant group-hover:text-primary-600 transition-colors">
                  {uploading ? 'Uploading...' : 'Drop logo here or click'}
                </span>
                <span className="text-label-sm text-outline mt-1">Max 2MB</span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e.target.files?.[0])}
            className="hidden"
          />
          {form.logo_url && (
            <button
              type="button"
              onClick={() => update('logo_url', '')}
              className="text-body-md text-red-500 font-medium mt-2 hover:underline"
            >
              Remove Logo
            </button>
          )}
        </div>

        <div>
          <label className="block text-label-md font-medium text-on-surface mb-2">Brand Name *</label>
          <input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Morning Café" className="input-base" />
        </div>

        <div>
          <label className="block text-label-md font-medium text-on-surface mb-2">Business Type</label>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_TYPES.map(type => (
              <button
                type="button"
                key={type}
                onClick={() => update('business_type', form.business_type === type ? '' : type)}
                className={`px-3 py-1.5 rounded-full text-body-md font-medium border transition-all ${form.business_type === type ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-on-surface-variant border-outline-variant hover:border-primary-300'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-label-md font-medium text-on-surface mb-2">Description <span className="text-on-surface-variant font-normal">(optional)</span></label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="A brief description of your business…" rows={3} className="input-base resize-none" />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
          {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Brand'}
        </button>
      </form>
    </div>
  )
}

import { useState } from 'react'
import { PhotoIcon } from '@heroicons/react/24/outline'
import type { ApiErrorResponse } from '../../types/auth'
import type { AxiosError } from 'axios'
import { uploadTrainerPhoto } from '../../api/trainers'

interface TrainerPhotoUploadProps {
  trainerId: string;
}

export function TrainerPhotoUpload({ trainerId }: TrainerPhotoUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (selected: File | null) => {
    setFile(selected)
    setError(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null)
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setError(null)
    try {
      await uploadTrainerPhoto(trainerId, file)
      setFile(null)
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code
      const message =
        code === 'INVALID_PHOTO_FORMAT'
          ? 'File must be JPEG, PNG or WEBP'
          : code === 'PHOTO_TOO_LARGE'
            ? 'File exceeds the 5 MB limit'
            : axiosError.response?.data?.error ?? 'Failed to upload photo.'
      setError(message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="border-t border-gray-800 pt-5">
      <div className="text-sm font-semibold text-gray-300">Profile Photo</div>
      <label
        htmlFor="trainer-photo"
        className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-700 p-6 text-center text-gray-400 hover:border-gray-500"
      >
        <PhotoIcon className="h-8 w-8" />
        <span className="text-sm">Click to upload or drag and drop</span>
        <span className="text-xs text-gray-500">JPEG, PNG or WEBP — max 5 MB</span>
        <input
          id="trainer-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          className="hidden"
        />
      </label>

      {previewUrl && (
        <div className="mt-3 flex items-center gap-3">
          <img src={previewUrl} alt="Preview" className="h-16 w-16 rounded-full object-cover" />
          <button
            type="button"
            onClick={() => handleFileChange(null)}
            className="text-xs text-gray-400 hover:text-white"
          >
            Remove
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="mt-3 inline-flex items-center rounded-md bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/40"
      >
        {isUploading ? 'Uploading...' : 'Upload Photo'}
      </button>
    </div>
  )
}

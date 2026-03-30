import { useEffect } from 'react'

interface PageMetaOptions {
  title: string;
  description: string;
}

export function usePageMeta({ title, description }: PageMetaOptions) {
  useEffect(() => {
    const previousTitle = document.title
    const existingMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const metaElement = existingMeta ?? document.createElement('meta')
    const previousDescription = existingMeta?.content ?? null

    document.title = title
    metaElement.setAttribute('name', 'description')
    metaElement.setAttribute('content', description)

    if (!existingMeta) {
      document.head.appendChild(metaElement)
    }

    return () => {
      document.title = previousTitle

      if (existingMeta) {
        existingMeta.setAttribute('content', previousDescription ?? '')
      } else {
        metaElement.remove()
      }
    }
  }, [title, description])
}

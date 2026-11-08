import React, { useState } from 'react'
import { AlertCircle, ExternalLink, Play, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VideoPlayerEmbedProps {
  videoUrl?: string
  videoProvider?: 'youtube' | 'vimeo' | 'mp4' | 'outro'
  videoEmbedId?: string
  title?: string
  autoPlay?: boolean
  className?: string
  onEnded?: () => void
}

export function VideoPlayerEmbed({
  videoUrl,
  videoProvider = 'youtube',
  videoEmbedId,
  title = 'Videoaula',
  autoPlay = false,
  className = '',
  onEnded,
}: VideoPlayerEmbedProps) {
  const [hasError, setHasError] = useState(false)

  // Validação simples de URL http(s)
  const isValidUrl = Boolean(videoUrl && /^https?:\/\//i.test(videoUrl.trim()))

  if (!videoUrl || !isValidUrl) {
    return (
      <div
        className={`w-full aspect-video bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-300 ${className}`}
      >
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3 text-amber-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h4 className="text-base font-semibold text-slate-100 mb-1">
          Aula sem link válido de vídeo
        </h4>
        <p className="text-xs text-slate-400 max-w-md">
          {videoUrl
            ? 'A URL configurada não é válida. Verifique se começa com http:// ou https:// e tente novamente.'
            : 'Nenhum link de vídeo foi cadastrado para esta aula. Edite a aula para incluir uma URL do YouTube, Vimeo ou MP4.'}
        </p>
      </div>
    )
  }

  if (hasError) {
    return (
      <div
        className={`w-full aspect-video bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-300 ${className}`}
      >
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-3 text-red-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h4 className="text-base font-semibold text-slate-100 mb-1">
          Não foi possível reproduzir este vídeo
        </h4>
        <p className="text-xs text-slate-400 max-w-md mb-4">
          Ocorreu uma falha no carregamento do player externo. Você pode tentar abrir o vídeo
          diretamente no provedor.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-700 text-slate-200 hover:bg-slate-800"
          onClick={() => window.open(videoUrl, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Abrir link original do vídeo
        </Button>
      </div>
    )
  }

  // 1) YouTube
  if (videoProvider === 'youtube' && videoEmbedId) {
    const embedSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
      videoEmbedId,
    )}?rel=0&modestbranding=1&playsinline=1${autoPlay ? '&autoplay=1' : ''}`

    return (
      <div
        className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ${className}`}
      >
        <iframe
          src={embedSrc}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onError={() => setHasError(true)}
        />
      </div>
    )
  }

  // 2) Vimeo
  if (videoProvider === 'vimeo' && videoEmbedId) {
    const embedSrc = `https://player.vimeo.com/video/${encodeURIComponent(
      videoEmbedId,
    )}?dnt=1${autoPlay ? '&autoplay=1' : ''}`

    return (
      <div
        className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ${className}`}
      >
        <iframe
          src={embedSrc}
          title={title}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onError={() => setHasError(true)}
        />
      </div>
    )
  }

  // 3) MP4 direto
  if (videoProvider === 'mp4' || videoUrl.toLowerCase().includes('.mp4')) {
    return (
      <div
        className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ${className}`}
      >
        <video
          src={videoUrl}
          controls
          autoPlay={autoPlay}
          className="w-full h-full"
          onEnded={onEnded}
          onError={() => setHasError(true)}
        >
          Seu navegador não suporta reprodução direta deste vídeo.
        </video>
      </div>
    )
  }

  // 4) Outro link (fallback elegante)
  return (
    <div
      className={`w-full aspect-video bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-300 ${className}`}
    >
      <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-3 text-blue-400">
        <Video className="w-7 h-7" />
      </div>
      <h4 className="text-base font-semibold text-slate-100 mb-1">{title}</h4>
      <p className="text-xs text-slate-400 max-w-md mb-4">
        Este vídeo está hospedado em um provedor externo ({videoUrl}). Clique abaixo para assistir
        diretamente no site do provedor.
      </p>
      <Button
        className="bg-blue-600 hover:bg-blue-700 text-white"
        onClick={() => window.open(videoUrl, '_blank', 'noopener,noreferrer')}
      >
        <Play className="w-4 h-4 mr-2" />
        Assistir no provedor externo
      </Button>
    </div>
  )
}

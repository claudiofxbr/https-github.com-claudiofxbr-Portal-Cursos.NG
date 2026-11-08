import React, { useState, useMemo } from 'react'
import { AlertCircle, ExternalLink, Play, Video, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface VideoPlayerEmbedProps {
  videoUrl?: string
  videoProvider?: 'youtube' | 'vimeo' | 'mp4' | 'outro'
  videoEmbedId?: string
  title?: string
  autoPlay?: boolean
  className?: string
  onEnded?: () => void
}

/**
 * Helper para extrair ou normalizar IDs de vídeo de provedores conhecidos (YouTube e Vimeo).
 * Trata URLs completas, parâmetros extras, links curtos (youtu.be), embeds etc.
 */
export function extractVideoEmbedInfo(
  url?: string,
  provider?: 'youtube' | 'vimeo' | 'mp4' | 'outro',
  explicitEmbedId?: string,
): {
  detectedProvider: 'youtube' | 'vimeo' | 'mp4' | 'outro'
  resolvedEmbedId?: string
  isValidId: boolean
} {
  const trimmedUrl = (url || '').trim()
  const trimmedEmbed = (explicitEmbedId || '').trim()

  // Se for MP4 direto explicitado
  if (provider === 'mp4' || trimmedUrl.toLowerCase().includes('.mp4')) {
    return {
      detectedProvider: 'mp4',
      isValidId: true,
    }
  }

  // 1) Checagem / extração do YouTube
  const isYoutubeExplicit = provider === 'youtube'
  const isYoutubeUrl = /youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(trimmedUrl)

  if (isYoutubeExplicit || isYoutubeUrl) {
    let candidate = trimmedEmbed

    // Se o embedId explícito parece uma URL completa do YouTube, extrai o ID
    if (
      !candidate ||
      candidate.includes('/') ||
      candidate.includes('?') ||
      candidate.includes('=')
    ) {
      const source = candidate || trimmedUrl
      // Padrões comuns: watch?v=ID, youtu.be/ID, embed/ID, shorts/ID, live/ID
      const mWatch = source.match(/[?&]v=([a-zA-Z0-9_-]{11})/i)
      const mShort = source.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i)
      const mEmbed = source.match(
        /youtube(?:-nocookie)?\.com\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/i,
      )

      candidate = mWatch?.[1] || mShort?.[1] || mEmbed?.[1] || candidate
    }

    // Validação estrita do ID do YouTube: exatamente 11 caracteres alfanuméricos com '-' e '_'
    const isValidYtId = /^[a-zA-Z0-9_-]{11}$/.test(candidate)

    if (isValidYtId) {
      return {
        detectedProvider: 'youtube',
        resolvedEmbedId: candidate,
        isValidId: true,
      }
    }

    // Se é explicitamente YouTube mas o ID não é válido
    if (isYoutubeExplicit || isYoutubeUrl) {
      return {
        detectedProvider: 'youtube',
        resolvedEmbedId: candidate || undefined,
        isValidId: false,
      }
    }
  }

  // 2) Checagem / extração do Vimeo
  const isVimeoExplicit = provider === 'vimeo'
  const isVimeoUrl = /vimeo\.com/i.test(trimmedUrl)

  if (isVimeoExplicit || isVimeoUrl) {
    let candidate = trimmedEmbed
    if (!candidate || candidate.includes('/')) {
      const source = candidate || trimmedUrl
      const mVimeo = source.match(/vimeo\.com\/(?:video\/)?([0-9]{6,12})/i)
      candidate = mVimeo?.[1] || candidate
    }

    const isValidVimeoId = /^[0-9]{6,12}$/.test(candidate)
    return {
      detectedProvider: 'vimeo',
      resolvedEmbedId: candidate || undefined,
      isValidId: isValidVimeoId,
    }
  }

  // 3) Provedor padrão/outro
  return {
    detectedProvider: provider || 'outro',
    resolvedEmbedId: trimmedEmbed || undefined,
    isValidId: Boolean(trimmedEmbed || trimmedUrl),
  }
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
  const [isRetrying, setIsRetrying] = useState(false)

  // Extração e resolução resiliente de ID e provedor
  const embedInfo = useMemo(() => {
    return extractVideoEmbedInfo(videoUrl, videoProvider, videoEmbedId)
  }, [videoUrl, videoProvider, videoEmbedId])

  // Validação simples de URL http(s)
  const trimmedUrl = (videoUrl || '').trim()
  const isValidUrl = Boolean(trimmedUrl && /^https?:\/\//i.test(trimmedUrl))

  // Handler para tentar recarregar o iframe sem quebrar o componente
  const handleRetry = () => {
    setHasError(false)
    setIsRetrying(true)
    setTimeout(() => setIsRetrying(false), 300)
  }

  // Caso 1: Ausência total de URL ou URL inválida
  if (!trimmedUrl && !embedInfo.resolvedEmbedId) {
    return (
      <div
        className={`w-full aspect-video bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-300 ${className}`}
      >
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3 text-amber-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h4 className="text-base font-semibold text-slate-100 mb-1">
          Vídeo indisponível no momento
        </h4>
        <p className="text-xs text-slate-400 max-w-md">
          Nenhum link de vídeo foi cadastrado para esta aula. A coordenação pedagógica foi
          notificada para disponibilizar o conteúdo.
        </p>
      </div>
    )
  }

  // Caso 2: Provedor requer ID (YouTube / Vimeo) mas ID está ausente ou mal formatado
  if (
    (embedInfo.detectedProvider === 'youtube' || embedInfo.detectedProvider === 'vimeo') &&
    !embedInfo.isValidId
  ) {
    return (
      <div
        className={`w-full aspect-video bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-300 ${className}`}
      >
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3 text-amber-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h4 className="text-base font-semibold text-slate-100 mb-1">
          Vídeo indisponível no momento
        </h4>
        <p className="text-xs text-slate-400 max-w-md mb-4">
          O identificador do vídeo não pôde ser validado pelo player ({embedInfo.detectedProvider}).
          {isValidUrl && ' Você pode tentar acessar o vídeo diretamente no provedor original.'}
        </p>
        {isValidUrl && (
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs"
            onClick={() => window.open(trimmedUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir vídeo original em nova aba
          </Button>
        )}
      </div>
    )
  }

  // Caso 3: Erro de carregamento capturado pelo iframe ou video
  if (hasError) {
    return (
      <div
        className={`w-full aspect-video bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-300 ${className}`}
      >
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-3 text-red-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h4 className="text-base font-semibold text-slate-100 mb-1">
          Vídeo indisponível no momento
        </h4>
        <p className="text-xs text-slate-400 max-w-md mb-4">
          Ocorreu uma falha ao carregar o player externo. Você pode tentar recarregar ou abrir o
          conteúdo diretamente no link original.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="text-xs text-slate-300 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRetrying ? 'animate-spin' : ''}`} />
            Tentar novamente
          </Button>
          {isValidUrl && (
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs"
              onClick={() => window.open(trimmedUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir vídeo original em nova aba
            </Button>
          )}
        </div>
      </div>
    )
  }

  // 1) YouTube verificado
  if (embedInfo.detectedProvider === 'youtube' && embedInfo.resolvedEmbedId) {
    const embedSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
      embedInfo.resolvedEmbedId,
    )}?rel=0&modestbranding=1&playsinline=1${autoPlay ? '&autoplay=1' : ''}`

    return (
      <div
        className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ${className}`}
      >
        <iframe
          key={embedInfo.resolvedEmbedId}
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

  // 2) Vimeo verificado
  if (embedInfo.detectedProvider === 'vimeo' && embedInfo.resolvedEmbedId) {
    const embedSrc = `https://player.vimeo.com/video/${encodeURIComponent(
      embedInfo.resolvedEmbedId,
    )}?dnt=1${autoPlay ? '&autoplay=1' : ''}`

    return (
      <div
        className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ${className}`}
      >
        <iframe
          key={embedInfo.resolvedEmbedId}
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
  if (embedInfo.detectedProvider === 'mp4' && isValidUrl) {
    return (
      <div
        className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ${className}`}
      >
        <video
          src={trimmedUrl}
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

  // 4) Outro link com URL válida (fallback elegante)
  if (isValidUrl) {
    return (
      <div
        className={`w-full aspect-video bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-300 ${className}`}
      >
        <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-3 text-blue-400">
          <Video className="w-7 h-7" />
        </div>
        <h4 className="text-base font-semibold text-slate-100 mb-1">{title}</h4>
        <p className="text-xs text-slate-400 max-w-md mb-4">
          Este vídeo está hospedado em um provedor externo. Clique abaixo para assistir diretamente
          no site de origem.
        </p>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
          onClick={() => window.open(trimmedUrl, '_blank', 'noopener,noreferrer')}
        >
          <Play className="w-4 h-4 mr-2" />
          Abrir vídeo original em nova aba
        </Button>
      </div>
    )
  }

  // 5) Fallback final de segurança
  return (
    <div
      className={`w-full aspect-video bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-300 ${className}`}
    >
      <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3 text-amber-400">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h4 className="text-base font-semibold text-slate-100 mb-1">Vídeo indisponível no momento</h4>
      <p className="text-xs text-slate-400 max-w-md">
        Não foi possível preparar o player para esta aula. Verifique a conexão ou procure a
        coordenação do curso.
      </p>
    </div>
  )
}

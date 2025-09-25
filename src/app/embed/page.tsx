import EmbeddableChat from '@/components/EmbeddableChat'

interface EmbedPageProps {
  searchParams: {
    theme?: 'light' | 'dark'
    title?: string
    width?: string
    height?: string
    placeholder?: string
  }
}

export default function EmbedPage({ searchParams }: EmbedPageProps) {
  const {
    theme = 'light',
    title = 'Chinese Tutor',
    width = '100%',
    height = '100vh',
    placeholder = 'Ask me anything in Chinese...'
  } = searchParams

  return (
    <div className="h-screen w-full overflow-hidden">
      <EmbeddableChat
        theme={theme}
        title={title}
        width={width}
        height={height}
        position="inline"
        placeholder={placeholder}
      />
    </div>
  )
}
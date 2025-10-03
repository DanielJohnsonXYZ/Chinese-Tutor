import EmbeddableChat from '@/components/EmbeddableChat'

interface EmbedPageProps {
  searchParams: Promise<{
    theme?: 'light' | 'dark'
    title?: string
    width?: string
    height?: string
    placeholder?: string
  }>
}

export default async function EmbedPage({ searchParams }: EmbedPageProps) {
  const params = await searchParams
  const {
    theme = 'light',
    title = 'Chinese Tutor',
    width = '100%',
    height = '100vh',
    placeholder = 'Ask me anything in Chinese...'
  } = params

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
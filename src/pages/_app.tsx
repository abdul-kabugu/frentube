import BadgeManager from '@/components/BadgeManager'
import ErrorBoundary from '@/components/ErrorBoundary'
import HeadConfig, { HeadConfigProps } from '@/components/HeadConfig'
import Layout from '@/components/Layout'
import { SelectedMediaProvider } from '@/context/MediaFormContext'
import { client } from '@/graphql/apolloClient'
import useIsInIframe from '@/hooks/useIsInIframe'
import useNetworkStatus from '@/hooks/useNetworkStatus'
import { ConfigProvider, useConfigContext } from '@/providers/ConfigProvider'
import EvmProvider from '@/providers/evm/EvmProvider'
import { QueryProvider } from '@/services/provider'
import { useSubscribePostsInDatahub } from '@/services/subsocial/datahub/posts/subscription'
import { initAllStores } from '@/stores/registry'
import '@/styles/globals.css'
import { cx } from '@/utils/class-names'
import { getGaId } from '@/utils/env/client'
import { getIdFromSlug } from '@/utils/slug'
import { ApolloProvider } from '@apollo/client'
import '@rainbow-me/rainbowkit/styles.css'
import { ThemeProvider } from 'next-themes'
import type { AppProps } from 'next/app'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { GoogleAnalytics } from 'nextjs-google-analytics'
import NextNProgress from 'nextjs-progressbar'
import { useEffect, useRef } from 'react'
import { Toaster } from 'react-hot-toast'
const PWAInstall = dynamic(() => import('@/components/PWAInstall'), {
  ssr: false,
})
const ForegroundNotificationHandler = dynamic(
  () => import('@/components/ForegroundNotificationHandler'),
  { ssr: false }
)

export type AppCommonProps = {
  alwaysShowScrollbarOffset?: boolean
  head?: HeadConfigProps
  dehydratedState?: any
}

export default function App(props: AppProps<AppCommonProps>) {
  const isInIframe = useIsInIframe()

  const scrollbarSelector = isInIframe ? 'body' : 'html'
  const scrollbarStyling = props.pageProps.alwaysShowScrollbarOffset
    ? `
      ${scrollbarSelector} {
        overflow-y: scroll;
      }
    `
    : ''

  return (
    <ConfigProvider>
      <style jsx global>{`
        ${isInIframe
          ? // Fix issue with iframe height not calculated correctly in iframe
            `
          html,
          body {
            height: 100%;
            overflow: auto;
            -webkit-overflow-scrolling: touch;
          }
        `
          : ''}

        ${scrollbarStyling}
      `}</style>
      <AppContent {...props} />
      <PWAInstall />
    </ConfigProvider>
  )
}

function AppContent({ Component, pageProps }: AppProps<AppCommonProps>) {
  const { head, dehydratedState, ...props } = pageProps

  const isInitialized = useRef(false)
  const { theme } = useConfigContext()

  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true
    initAllStores()
  }, [])

  return (
    <ThemeProvider attribute='class' forcedTheme={theme}>
      <QueryProvider dehydratedState={dehydratedState}>
        <PostSubscriber />
        <BadgeManager />
        <SubsocialApiReconnect />
        <ToasterConfig />
        <ForegroundNotificationHandler />
        <NextNProgress
          color='#4d46dc'
          options={{ showSpinner: false }}
          showOnShallow={false}
        />
        <HeadConfig {...head} />
        <GoogleAnalytics trackPageViews gaMeasurementId={getGaId()} />
        <div className={cx('font-sans')}>
          <ErrorBoundary>
            <EvmProvider>
              <ApolloProvider client={client}>
                <Layout>
                  <SelectedMediaProvider>
                    <Component {...props} />
                  </SelectedMediaProvider>
                </Layout>
              </ApolloProvider>
            </EvmProvider>
          </ErrorBoundary>
        </div>
      </QueryProvider>
    </ThemeProvider>
  )
}

function PostSubscriber() {
  const { query } = useRouter()
  const slugParam = (query?.slug || '') as string
  const chatId = getIdFromSlug(slugParam)
  useSubscribePostsInDatahub(chatId)

  return null
}

function ToasterConfig() {
  return <Toaster position='top-center' />
}

function SubsocialApiReconnect() {
  const { status, reconnect, disconnect, connect } = useNetworkStatus()
  const isConnected = status === 'connected'

  useEffect(() => {
    if (!isConnected && document.visibilityState === 'visible') {
      reconnect()
    }
  }, [isConnected, reconnect])

  useEffect(() => {
    const listener = () => {
      if (document.visibilityState === 'visible') connect()
      else disconnect()
    }
    document.addEventListener('visibilitychange', listener)
    return () => document.removeEventListener('visibilitychange', listener)
  }, [connect, disconnect])

  return null
}

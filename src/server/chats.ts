import { getLinkedChatIdsForHubId } from '@/constants/hubs'
import { getPostsServer } from '@/pages/api/posts'
import { getPostQuery } from '@/services/api/query'
import { getCommentIdsQueryKey } from '@/services/subsocial/commentIds'
import { getChatIdsBySpaceIdQuery } from '@/services/subsocial/posts'
import { getSpaceQuery } from '@/services/subsocial/spaces'
import { getSubsocialApi } from '@/subsocial-query/subsocial/connection'
import { PostData } from '@subsocial/api/types'
import { QueryClient } from '@tanstack/react-query'
import { prefetchBlockedEntities } from './moderation'

export async function prefetchChatPreviewsData(
  queryClient: QueryClient,
  hubId: string
) {
  const res = await getChatIdsBySpaceIdQuery.fetchQuery(queryClient, hubId)
  const allChatIds = [
    ...(res?.chatIds ?? []),
    ...getLinkedChatIdsForHubId(hubId),
  ]

  const [{ lastMessages, chats, messageIdsByChatIds }] = await Promise.all([
    getChatPreviewsData(allChatIds),
    prefetchBlockedEntities(queryClient, hubId, allChatIds),
    getSpaceQuery.fetchQuery(queryClient, hubId),
  ] as const)

  messageIdsByChatIds.forEach((messageIds, idx) => {
    queryClient.setQueryData(
      getCommentIdsQueryKey(allChatIds[idx]),
      messageIds ?? null
    )
  })
  ;[...lastMessages, ...chats].forEach((post) => {
    getPostQuery.setQueryData(
      queryClient,
      post.id,
      JSON.parse(JSON.stringify(post))
    )
  })
}

export async function getChatPreviewsData(chatIds: string[]) {
  const subsocialApi = await getSubsocialApi()

  const [messageIdsByChatIds, chats] = await Promise.all([
    Promise.all(
      chatIds.map((chatId) => {
        return subsocialApi.blockchain.getReplyIdsByPostId(chatId)
      })
    ),
    getPostsServer(chatIds),
  ] as const)

  const lastMessages = await getLastMessages(messageIdsByChatIds)

  return { chats, lastMessages, messageIdsByChatIds }
}
async function getLastMessages(messageIdsByChatIds: string[][]) {
  const lastMessageIds = messageIdsByChatIds
    .map((ids) => ids[ids.length - 1])
    .filter((id) => !!id)

  let lastMessages: PostData[] = []
  if (lastMessageIds.length > 0) {
    lastMessages = await getPostsServer(lastMessageIds)
  }
  return lastMessages
}

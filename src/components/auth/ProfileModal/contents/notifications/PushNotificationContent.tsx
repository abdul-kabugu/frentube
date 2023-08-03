import Button from '@/components/Button'
import useSignMessage from '@/hooks/useSignMessage'
import {
  useCommitSignedMessageWithAction,
  useGetFcmLinkingMessage,
} from '@/services/api/notifications/mutation'
import { getMessageToken } from '@/services/firebase/messaging'
import { LocalStorage } from '@/utils/storage'
import { sortObj } from 'jsonabc'
import { useEffect, useState } from 'react'
import { ContentProps } from '../../types'

export const FCM_PUSH_NOTIFICATION_STORAGE_KEY = 'push-notification-fcm-token'
const storage = new LocalStorage(() => FCM_PUSH_NOTIFICATION_STORAGE_KEY)

export default function PushNotificationContent(props: ContentProps) {
  const isNotificationNotSupported = typeof Notification === 'undefined'

  const [isRegistered, setIsRegistered] = useState(false)

  useEffect(() => {
    const storedFcmToken = storage.get()
    setIsRegistered(!!storedFcmToken)
  }, [isRegistered])

  if (isNotificationNotSupported) {
    return (
      <Button disabled size='lg'>
        Unsupported Browser Notifications
      </Button>
    )
  }

  const permission = Notification.permission
  if (permission === 'granted' && isRegistered) {
    return (
      <DisableNotificationButton setIsRegisterd={setIsRegistered} {...props} />
    )
  }

  return (
    <EnableNotificationButton setIsRegisterd={setIsRegistered} {...props} />
  )
}

type NotificationButtonProps = ContentProps & {
  setIsRegistered: (v: boolean) => void
}

function DisableNotificationButton({
  address,
  setIsRegistered,
}: NotificationButtonProps) {
  const [isGettingToken, setIsGettingToken] = useState(false)

  const { mutate: commitSignedMessage, isLoading: isCommitingMessage } =
    useCommitSignedMessageWithAction({
      onSuccess: (data) => {
        if (!data) throw new Error('Error in disabling notification request')

        // FCM Token Disabled.
        storage.remove()
        setIsRegistered(false)
      },
    })

  const processMessage = useProcessMessage()
  const { mutate: getLinkingMessage, isLoading: isGettingLinkingMessage } =
    useGetFcmLinkingMessage({
      onSuccess: async (data) => {
        const processedData = await processMessage(data)
        commitSignedMessage({
          signedMessageWithDetails: processedData,
        })
      },
    })

  const isLoading =
    isCommitingMessage || isGettingLinkingMessage || isGettingToken

  const handleClickDisable = async () => {
    if (!address) return
    setIsGettingToken(true)
    const fcmToken = await getMessageToken()
    setIsGettingToken(false)
    if (!fcmToken) return

    getLinkingMessage({ address, fcmToken, action: 'unlink' })
  }

  return (
    <Button size='lg' onClick={handleClickDisable} isLoading={isLoading}>
      Disable Notifications
    </Button>
  )
}

function EnableNotificationButton({
  address,
  setIsRegistered,
}: NotificationButtonProps) {
  const [isGettingToken, setIsGettingToken] = useState(false)
  const [fcmToken, setFcmToken] = useState<string | undefined>()

  const { mutate: commitSignedMessage, isLoading: isCommitingMessage } =
    useCommitSignedMessageWithAction({
      onSuccess: (data) => {
        if (!data) throw new Error('Error subscribing for notifications')

        // FCM Token Enabled.
        if (fcmToken) {
          storage.set(fcmToken)
          setIsRegisterd(true)
        }
      },
    })

  const processMessage = useProcessMessage()
  const { mutate: getLinkingMessage, isLoading: isGettingLinkingMessage } =
    useGetFcmLinkingMessage({
      onSuccess: async (data) => {
        const processedData = await processMessage(data)
        commitSignedMessage({
          signedMessageWithDetails: processedData,
        })
      },
    })

  const isLoading =
    isCommitingMessage || isGettingLinkingMessage || isGettingToken

  const handleClickEnable = async () => {
    if (!address) return
    setIsGettingToken(true)
    const fcmToken = await getMessageToken()
    setIsGettingToken(false)
    console.log('FCM Token', fcmToken)
    if (!fcmToken) return

    setFcmToken(fcmToken)
    getLinkingMessage({ address, fcmToken, action: 'link' })
  }

  return (
    <Button size='lg' onClick={handleClickEnable} isLoading={isLoading}>
      Enable Notifications
    </Button>
  )
}

function useProcessMessage() {
  const signMessage = useSignMessage()

  return async (data: { messageData: any; payloadToSign: string } | null) => {
    if (!data) throw new Error('No data')

    const signedPayload = await signMessage(data.payloadToSign)
    data.messageData['signature'] = signedPayload

    const signedMessage = encodeURIComponent(
      JSON.stringify(sortObj(data.messageData))
    )

    return signedMessage
  }
}

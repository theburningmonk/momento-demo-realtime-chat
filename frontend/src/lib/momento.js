import { 
  TopicClient, 
  TopicConfigurations, 
  CredentialProvider
} from '@gomomento/sdk-web'

async function subscribeToTopic(authToken, cacheName, topicName, onMessage) {
  console.log('Initializing Momento topic client', authToken)

  const topicClient = new TopicClient({
    configuration: TopicConfigurations.Browser.latest(),
    credentialProvider: CredentialProvider.fromString({
      authToken
    })
  })

  console.log('Initialized Momento topic client')

  console.log('Subscribing to Momento topic:', { cacheName, topicName })

  const resp = await topicClient.subscribe(cacheName, topicName, {
    onItem: (item => onMessage(item.value()))
  })

  if (!resp.isSubscribed) {
    const error = resp.innerException()
    console.error(`Failed to subscribe to Momento topic [${topicName}]: `, error)
    throw error
  }

  return {
    send: async (message) => {
      await topicClient.publish(cacheName, topicName, message)
    },
    unsubscribe: async () => await resp.unsubscribe()
  }
}

export {
  subscribeToTopic
}
<template>
  <div class="mt-6 border-2 border-black rounded-md h-2/3 p-2">
    <div class="grid grid-cols-4 gap-x-1 h-full">
      <!-- Chat rooms -->
      <div class="col-span-1 p-1 border-2 rounded-md border-gray-400 flex flex-col justify-between">
        <div>
          <p class="font-bold border-b-2 border-black mb-2">Chat rooms</p>
          <ol>
            <li v-for="chatName in chats" :key="chatName" class="w-full">
              <button @click="joinChat(chatName)" class="text-left hover:bg-gray-100 w-full">
                {{ chatName }}
              </button>
            </li>
          </ol>
        </div>
        <!-- create chat -->
        <div class="w-full flex gap-x-2">
          <input v-model="newChatName" class="p-1 border-2 rounded-md border-gray-400 flex-grow" placeholder="Enter chat name" />
          <button @click="createChat" class="py-2 px-3 rounded-lg bg-green-400 hover:bg-green-500">Create Chat</button>
        </div>
      </div>
      <!-- Chat messages -->
      <div v-if="isConnected" class="col-span-3 p-1 border-2 rounded-md border-gray-400 flex flex-col justify-between">
        <ol>
          <li v-for="{ sender, message } in chatMessages" :key="message" class="w-full">
            <span v-if="sender === currentUserEmail" class="font-medium text-green-500">{{ sender }}</span>
            <span v-else class="font-medium text-blue-500">{{ sender }}</span>
            : {{ message }}
          </li>
        </ol>
        <!-- send message -->
        <div class="w-full flex gap-x-2">
          <input v-model="newMessage" class="p-1 border-2 rounded-md border-gray-400 flex-grow" placeholder="Enter message" />
          <button @click="sendMessage" class="py-2 px-3 rounded-lg bg-green-400 hover:bg-green-500">Send</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { Auth } from 'aws-amplify'
import { apiConfig } from '@/aws-exports'
import { subscribeToTopic } from '@/lib/momento'

export default {
  name: 'ChatWindow',
  setup() {
    const currentUserEmail = ref(null)
    const newChatName = ref('')
    const chats = ref([])
    const chatMessages = ref([])
    const newMessage = ref('')
    const isConnected = ref(false)

    let momentoToken = null
    let momentoCacheName = null
    let subscription = null

    onMounted(async () => {
      try {
        const user = await Auth.currentAuthenticatedUser()
        currentUserEmail.value = user.attributes.email

        const session = await Auth.currentSession()
        console.log('session:', session)
        await Promise.all([
          initMomento(session),
          listChats(session)
        ])
      } catch (error) {
        console.error('Error initializing chat window:', error)
      }
    })

    const initMomento = async (session) => {
      try {
        const jwtToken = session.getIdToken().getJwtToken()
        const getTokenResp = await axios.get(apiConfig.apiUrl + '/token', {
            headers: {
              Authorization: `Bearer ${jwtToken}`
            }
          })

          const { token, cacheName } = getTokenResp.data
          momentoToken = token
          momentoCacheName = cacheName
      } catch (error) {
        console.error('Error initializing Momento:', error)
        throw error
      }
    }

    const listChats = async (session) => {
      try {
        const jwtToken = session.getIdToken().getJwtToken()
        const getChatsResp = await axios.get(apiConfig.apiUrl + '/chats', {
          headers: {
            Authorization: `Bearer ${jwtToken}`
          }
        })
  
        chats.value = getChatsResp.data.map(chat => chat.chatName)
      } catch (error) {
        console.error('Error fetching available chats:', error)
        throw error
      }
    }

    const createChat = async () => {
      const session = await Auth.currentSession()
      const jwtToken = session.getIdToken().getJwtToken()

      try {
        await axios.post(apiConfig.apiUrl + '/chats', {
          chatName: '#' + newChatName.value
        }, {
          headers: {
            Authorization: `Bearer ${jwtToken}`
          }
        })
        
        newChatName.value = ''
      } catch (error) {
        console.error('Error creating chat:', error)
      }

      await listChats(session)
    }

    const joinChat = async (chatName) => {
      if (subscription) {
        console.log('Unsubscribing from existing chat...')
        await subscription.unsubscribe()
        isConnected.value = false
        
        chatMessages.value = []
      }
      
      console.log('Subscribing to chat:', chatName)
      subscription = await subscribeToTopic(momentoToken, momentoCacheName, chatName, (jsonMsg) => {
        const { sender, message } = JSON.parse(jsonMsg)
        chatMessages.value.push({ sender, message })
      })

      isConnected.value = true
    }

    const sendMessage = async () => {
      await subscription.send(JSON.stringify({
        sender: currentUserEmail.value,
        message: newMessage.value
      }))

      newMessage.value = ''
    }

    return {
      currentUserEmail,
      newChatName,
      chats,
      chatMessages,
      newMessage,
      isConnected,
      createChat,
      joinChat,
      sendMessage
    }
  }
}
</script>

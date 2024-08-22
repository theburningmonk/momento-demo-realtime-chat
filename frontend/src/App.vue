<template>
  <div id="app" class="flex justify-center align-middle text-lg h-screen">
    <authenticator v-if="!user"></authenticator>
    <template v-if="auth.route === 'authenticated'">
      <div class="mt-10 px-5 w-full">
        <button class="py-2 px-3 rounded-lg bg-gray-300 hover:bg-gray-400" @click="signOut">Sign out</button>
        <chat-window />
      </div>
    </template>
  </div>
</template>

<script>
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-vue"
import "@aws-amplify/ui-vue/styles.css"
import { Auth } from 'aws-amplify'
import { ref, onMounted } from 'vue'
import ChatWindow from '@/components/ChatWindow.vue'

export default {
  name: 'App',
  components: {
    Authenticator,
    ChatWindow
  },
  setup() {
    const user = ref(null)
    const auth = useAuthenticator()

    onMounted(async () => {
      try {
        console.log('Fetching user attributes...')
        user.value = await Auth.currentUserInfo()
        console.log('User attributes:', user.value)
      } catch (error) {
        console.error('Error getting current user:', error)
      }
    })

    const signOut = async () => {
      try {
        await Auth.signOut()
        user.value = null
      } catch (error) {
        console.error('Error signing out:', error)
      }
    }

    return {
      auth,
      signOut
    }
  }
}
</script>
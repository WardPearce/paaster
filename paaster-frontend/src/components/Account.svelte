<script lang="ts">
  import { navigate } from 'svelte-navigator'
  import { removeAccount } from '../helpers/account'

  function logout(): void {
    removeAccount()
    navigate('/')
  }
</script>

<button class="dark-button" on:click={logout}>Logout</button>

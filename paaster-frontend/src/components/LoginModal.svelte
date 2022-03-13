<script lang="ts">
  import Fa from 'svelte-fa'
  import { faChevronRight } from '@fortawesome/free-solid-svg-icons'

  import zxcvbn from 'zxcvbn'

  export let isOpen: boolean

  let createAccount = false
  let username = ''
  let plainPassword = ''

  let passwordFeedbackMsg = ''

  function passwordFeedback() {
    if (!createAccount)
      return

    passwordFeedbackMsg = (
      zxcvbn(plainPassword).feedback.suggestions
      ).toString().replaceAll(',', ' ')
  }
</script>

{#if isOpen}
  <div role="dialog" class="modal">
      <div class="contents">
        <div class="header">
          <h2>{#if !createAccount}Login{:else}Register{/if}</h2>
        </div>


        <form>
          <input bind:value={username} type="text" placeholder="username">
          <input bind:value={plainPassword} on:input={passwordFeedback}
           type="password" placeholder="password">
          {#if createAccount && passwordFeedbackMsg}
            <p style="font-size:.8em;margin-bottom:1em;text-align:center;">{ passwordFeedbackMsg }</p>
          {/if}
  
          <button type="submit" class="dark-button" style="margin-bottom: .5em;">
            <Fa icon={faChevronRight} />
            {#if !createAccount}login{:else}register{/if}
          </button>
        </form>
        <button on:click={() => createAccount = !createAccount}
          class="trans-button">
            {#if createAccount}
              login with an existing account
            {:else}
              register an account
            {/if}
        </button>
      </div>
  </div>
{/if}

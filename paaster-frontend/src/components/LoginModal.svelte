<script lang="ts">
  import Fa from 'svelte-fa'
  import { faChevronRight } from '@fortawesome/free-solid-svg-icons'

  import zxcvbn from 'zxcvbn'
  import { toast } from '@zerodevx/svelte-toast'
  import { closeModal } from 'svelte-modals'
  import { acts } from '@tadashi/svelte-loading'

  import Captcha from './Captcha.svelte'

  import { backendUrl } from '../api'
  import { sha256Hash } from '../helpers/sha256'
  import { setAccount } from '../helpers/account'

  export let isOpen: boolean

  let createAccount = false

  let username = ''
  let plainPassword = ''

  let paswsordCrackTime = ''
  let passwordStrengh = 0

  let captchaSigning = ''
  let userCaptchaInput = ''
  let showingCaptcha = false
  let captcha: Captcha

  function passwordFeedback(): void {
    if (!createAccount)
      return

    const zx = zxcvbn(plainPassword)

    paswsordCrackTime = zx.crack_times_display.offline_slow_hashing_1e4_per_second
    passwordStrengh = zx.score
  }

  function loginCreate(): void {
    acts.show(true)

    if (createAccount) {
      sha256Hash(plainPassword).then(passwordHash => {
        fetch(`${backendUrl}/api/account?captchaSigning=${captchaSigning}&captchaCode=${userCaptchaInput}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: username,
            passwordSHA256: passwordHash
          })
        }).then(resp => {
          resp.json().then(json => {
            if (resp.status === 200) {
              closeModal()
              setAccount(username, plainPassword)
            } else {
              toast.push(json.error)
              captcha.displayCaptcha(false)
            }
          }).catch(_ => toast.push('Unable to create account.'))

          acts.show(false)
        })
      })
    }
  }
</script>

{#if isOpen}
  <div role="dialog" class="modal">
      <div class="contents">
        <div class="header">
          <h2>{#if !createAccount}Login{:else}Register{/if}</h2>
        </div>

        {#if !showingCaptcha}
          <form on:submit|preventDefault={() => captcha.displayCaptcha()}>
            <input bind:value={username} type="text" placeholder="username">
            <input bind:value={plainPassword} on:input={passwordFeedback}
            type="password" placeholder="password">
            {#if createAccount && paswsordCrackTime}
              <p class="pass-feedback">
                This password would take { paswsordCrackTime } to guess
              </p>
              <progress value="{passwordStrengh}" max="4"></progress>
            {/if}

            {#if !createAccount || passwordStrengh > 1}
              <button type="submit" class="dark-button" style="margin-bottom: .5em;">
                <Fa icon={faChevronRight} />
                {#if !createAccount}login{:else}register{/if}
              </button>
            {:else}
              <button type="submit" class="dark-button" disabled style="margin-bottom: .5em;">
                stronger password required
              </button>
            {/if}
          </form>

          <button on:click={() => createAccount = !createAccount}
            class="trans-button">
              {#if createAccount}
                login with an existing account
              {:else}
                register an account
              {/if}
          </button>
        {/if}

        <Captcha
          bind:userCaptchaInput={userCaptchaInput}
          bind:showingCaptcha={showingCaptcha}
          bind:this={captcha}
          on:captchaGenerated={(event) => captchaSigning = event.detail.captchaSigning}
          on:captchaSubmited={loginCreate} />
      </div>
  </div>
{/if}

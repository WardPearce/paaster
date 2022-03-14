<script lang="ts">
  import Fa from 'svelte-fa'
  import { faChevronRight } from '@fortawesome/free-solid-svg-icons'

  import zxcvbn from 'zxcvbn'
  import { toast } from '@zerodevx/svelte-toast'

  import Captcha from './Captcha.svelte'

  import { backendUrl } from '../api'

  export let isOpen: boolean

  let createAccount = false

  let username = ''
  let plainPassword = ''

  let paswsordCrackTime = ''
  let passwordStrengh = 0

  let captchaSigning = ''
  let userCaptchaInput = ''
  let captcha: Captcha

  function passwordFeedback(): void {
    if (!createAccount)
      return

    const zx = zxcvbn(plainPassword)

    paswsordCrackTime = zx.crack_times_display.offline_slow_hashing_1e4_per_second
    passwordStrengh = zx.score
  }

  function sha256Hash(toHash: string): Promise<string> {
    const utf8 = new TextEncoder().encode(toHash)
    return crypto.subtle.digest('SHA-256', utf8).then((hashBuffer) => {
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(
          (bytes) => bytes.toString(16).padStart(2, '0')
        ).join('')
    })
  }

  function loginCreate(): void {
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
            if (resp.status !== 200) {
              captcha.getCaptchaImg()
              userCaptchaInput = ''
              toast.push(json.error)
            }
          }).catch(_ => toast.push('Unable to create account.'))
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

        <form on:submit|preventDefault={loginCreate}>
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
            <Captcha bind:userCaptchaInput={userCaptchaInput} bind:this={captcha}
             on:captcha={(event) => captchaSigning = event.detail.captchaSigning} />
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
      </div>
  </div>
{/if}

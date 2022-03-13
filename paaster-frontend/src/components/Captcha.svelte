<script lang="ts">
  import Fa from 'svelte-fa'
  import { faArrowRotateRight } from '@fortawesome/free-solid-svg-icons'

  import { backendUrl } from '../api'

  let captchaImage: string = ''

  function getCaptchaImg(): void {
    fetch(`${backendUrl}/api/captcha`, {
      method: 'GET'
    }).then(resp => {
      resp.blob().then(blob => captchaImage = URL.createObjectURL(blob))
    })
  }

  getCaptchaImg()
</script>

<div class="captcha">
  <img src={captchaImage} alt="Captcha">
  <button class="dark-button" type="button" on:click={() => getCaptchaImg()}>
    <Fa icon={faArrowRotateRight} />
  </button>
</div>
<input type="text" placeholder="captcha">

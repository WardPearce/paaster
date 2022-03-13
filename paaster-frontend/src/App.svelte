<script lang="ts">
  import Fa from 'svelte-fa'
  import { faLock, faChevronRight } from '@fortawesome/free-solid-svg-icons'

  import { Route, Router, Link } from 'svelte-navigator'

  import { Loading } from '@tadashi/svelte-loading'
  import { SvelteToast } from '@zerodevx/svelte-toast'
  import { openModal, closeModal, Modals } from 'svelte-modals'

  import ViewPaste from './components/ViewPaste.svelte'
  import CreatePaste from './components/CreatePaste.svelte'
  import LoginModal from './components/LoginModal.svelte'

  const pageName = 'VITE_NAME' in import.meta.env ? import.meta.env.VITE_NAME : 'paaster'
</script>

<svelte:head>
  <title>{ pageName }</title>
</svelte:head>

<Loading />
<SvelteToast />
<Modals>
  <div
    slot="backdrop"
    class="backdrop"
    on:click={closeModal}
  />
</Modals>

<Router>
  <nav>
    <Link to="/"><h2>{ pageName }</h2></Link>
    <div class="nav-right">
      <h4 class="encrypted">
        <Fa icon={faLock} />
        E2EE
      </h4>
      <button
        on:click={() => openModal(LoginModal, {})}
        class="dark-button"
        style="margin-left: .5em;"
        href="/"><Fa icon={faChevronRight} /> Login</button>
    </div>
  </nav>

  <Route path="/" component={CreatePaste}></Route>
  <Route path=":pasteId" component={ViewPaste}></Route>  
</Router>

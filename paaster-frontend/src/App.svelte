<script lang="ts">
  import Fa from 'svelte-fa'
  import { faLock } from '@fortawesome/free-solid-svg-icons'

  import { Route, Router, Link } from 'svelte-navigator'

  import { Loading } from '@tadashi/svelte-loading'
  import { SvelteToast } from '@zerodevx/svelte-toast'

  import ViewPaste from './components/ViewPaste.svelte'
  import CreatePaste from './components/CreatePaste.svelte'

  const pageName = 'SITE_NAME' in process.env ? process.env.SITE_NAME : 'paaster'
</script>

<svelte:head>
  <title>{ pageName }</title>
</svelte:head>

<Loading />
<SvelteToast />

<Router>
  <nav>
    <Link to="/"><h2>{ pageName }</h2></Link>
    <h4 class="encrypted">
      <Fa icon={faLock} />
      E2EE
    </h4>
  </nav>

  <Route path="/" component={CreatePaste}></Route>
  <Route path=":pasteId" component={ViewPaste}></Route>  
</Router>

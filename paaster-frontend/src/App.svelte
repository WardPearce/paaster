<script lang="ts">
  import Fa from 'svelte-fa'
  import { faLock } from '@fortawesome/free-solid-svg-icons'

  import { Route, Router, Link } from 'svelte-navigator'

  import { Loading } from '@tadashi/svelte-loading'
  import { SvelteToast } from '@zerodevx/svelte-toast'

  import ViewPaste from './components/ViewPaste.svelte'
  import CreatePaste from './components/CreatePaste.svelte'
</script>

<Loading />
<SvelteToast />

<Router>
  <nav>
    <Link to="/"><h2>paaster</h2></Link>
    <h4 class="encrypted">
      <Fa icon={faLock} />
      E2EE
    </h4>
  </nav>

  <Route path="/" component={CreatePaste}></Route>
  <Route path=":pasteId" component={ViewPaste}></Route>  
</Router>

<script lang="ts">
  import Fa from 'svelte-fa'
  import { faLock } from '@fortawesome/free-solid-svg-icons'

  import { Route, Router } from 'svelte-navigator'
  import ViewPaste from './components/ViewPaste.svelte'
  import CreatePaste from './components/CreatePaste.svelte'
</script>

<Router>
  <nav>
    <h2>paaster</h2>
    <h4 class="encrypted">
      <Fa icon={faLock} />
      Encrypted
    </h4>
  </nav>

  <Route path="/" component={CreatePaste}></Route>
  <Route path=":pasteId" component={ViewPaste}></Route>  
</Router>

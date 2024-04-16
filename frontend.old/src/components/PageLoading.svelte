<script lang="ts">
  import { acts } from "@tadashi/svelte-loading";
  import { onDestroy } from "svelte";

  acts.show(true);
  onDestroy(() => acts.show(false));
</script>

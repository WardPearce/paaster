<main>
	<ul>
		<li>
			<a href="/placeholder">
				<div>
					<p>63da978c103513d53428bf34</p>
					<p>Created 3 seconds ago</p>
				</div>
			</a>
			<div class="actions">
				<button><i class="las la-pencil-alt" />rename</button>
				<button><i class="las la-share" />share</button>
				<button class="danger"><i class="las la-trash" />delete</button>
			</div>
		</li>
	</ul>
</main>

<style>
	ul {
		list-style: none;
	}

	ul li {
		margin-top: 1em;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background-color: var(--darkerBg);
		padding: 1em 3em;
		border-radius: 3em;
	}

	ul li .actions {
		display: flex;
		justify-content: center;
		column-gap: 0.5em;
	}

	@media screen and (max-width: 700px) {
		ul li {
			flex-direction: column;
			row-gap: 1em;
			align-items: center;
		}
	}
</style>

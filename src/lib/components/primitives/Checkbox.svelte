<script lang="ts">
	import { Checkbox } from 'bits-ui';

	interface Props {
		checked: boolean;
		label?: string;
		description?: string;
		paragrafRef?: string;
		disabled?: boolean;
		onchange: (checked: boolean) => void;
	}

	let {
		checked,
		label = '',
		description = '',
		paragrafRef = '',
		disabled = false,
		onchange
	}: Props = $props();
</script>

<div class="checkbox-wrap" class:checkbox-disabled={disabled}>
	<Checkbox.Root
		{checked}
		{disabled}
		onCheckedChange={(v) => onchange(v === true)}
		class="checkbox-box {checked ? 'checkbox-box-checked' : ''}"
	>
		{#snippet children({ checked: isChecked })}
			{#if isChecked}
				<svg class="checkbox-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
					<path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			{/if}
		{/snippet}
	</Checkbox.Root>
	{#if label}
		<div class="checkbox-text-wrap">
			<span class="checkbox-text">
				{label}
				{#if paragrafRef}
					<span class="checkbox-ref">, jf. {paragrafRef}</span>
				{/if}
			</span>
			{#if description}
				<span class="checkbox-description">{description}</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.checkbox-wrap {
		display: inline-flex;
		align-items: flex-start;
		gap: var(--spacing-3);
		cursor: pointer;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-ink);
		user-select: none;
	}

	.checkbox-disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	:global(.checkbox-box) {
		width: 16px;
		height: 16px;
		margin-top: 2px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-canvas);
		border: 1px solid var(--color-wire-strong);
		border-radius: 3px;
		padding: 0;
		cursor: inherit;
		transition: background-color 0.1s, border-color 0.1s;
	}

	:global(.checkbox-box:hover:not([data-disabled])) {
		border-color: var(--color-vekt-dim);
	}

	:global(.checkbox-box:focus-visible) {
		outline: none;
		border-color: var(--color-wire-focus);
		box-shadow: 0 0 0 2px var(--color-vekt-bg);
	}

	:global(.checkbox-box-checked) {
		background: var(--color-vekt);
		border-color: var(--color-vekt);
	}

	:global(.checkbox-box-checked:hover:not([data-disabled])) {
		background: var(--color-vekt-dim);
		border-color: var(--color-vekt-dim);
	}

	.checkbox-icon {
		color: var(--color-canvas);
	}

	.checkbox-text-wrap {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.checkbox-text {
		line-height: 1.4;
	}

	.checkbox-ref {
		color: var(--color-ink-muted);
		font-weight: 400;
	}

	.checkbox-description {
		font-size: 12px;
		color: var(--color-ink-muted);
		font-weight: 400;
		line-height: 1.4;
	}
</style>

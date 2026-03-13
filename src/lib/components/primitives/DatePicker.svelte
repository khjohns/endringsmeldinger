<script lang="ts">
	import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { DatePicker } from 'bits-ui';
	import { CalendarDate, type DateValue } from '@internationalized/date';

	interface Props {
		value: string;
		label?: string;
		hint?: string;
		onchange: (isoDate: string) => void;
	}

	let { value, label = '', hint = '', onchange }: Props = $props();

	function toCalendarDate(iso: string): CalendarDate | undefined {
		if (!iso) return undefined;
		try {
			const [y, m, d] = iso.split('-').map(Number);
			return new CalendarDate(y, m, d);
		} catch {
			return undefined;
		}
	}

	let dateValue = $derived(toCalendarDate(value));

	function handleValueChange(v: DateValue | undefined) {
		onchange(v ? v.toString() : '');
	}
</script>

<div class="date-field">
	{#if label}
		<div class="date-label">{label}</div>
	{/if}
	<DatePicker.Root
		value={dateValue}
		onValueChange={handleValueChange}
		locale="nb"
		weekStartsOn={1}
		closeOnDateSelect={true}
	>
		<div class="date-row">
			<DatePicker.Input class="date-input">
				{#snippet children({ segments })}
					{#each segments as { part, value: segValue }, si (si)}
						<DatePicker.Segment {part} class="date-segment {part === 'literal' ? 'date-literal' : 'date-editable'}">
							{segValue}
						</DatePicker.Segment>
					{/each}
				{/snippet}
			</DatePicker.Input>
			<DatePicker.Trigger class="date-trigger">
				<CalendarDays size={16} strokeWidth={1.5} aria-hidden="true" />
			</DatePicker.Trigger>
		</div>

		<DatePicker.Content class="date-popover">
			<DatePicker.Calendar>
				{#snippet children({ months, weekdays })}
					<DatePicker.Header class="cal-header">
						<DatePicker.PrevButton class="cal-nav">
							<ChevronLeft size={14} strokeWidth={1.5} aria-hidden="true" />
						</DatePicker.PrevButton>
						<DatePicker.Heading class="cal-heading" />
						<DatePicker.NextButton class="cal-nav">
							<ChevronRight size={14} strokeWidth={1.5} aria-hidden="true" />
						</DatePicker.NextButton>
					</DatePicker.Header>

					{#each months as month (month.value.toString())}
						<DatePicker.Grid class="cal-grid">
							<DatePicker.GridHead>
								<DatePicker.GridRow class="cal-row">
									{#each weekdays as weekday (weekday)}
										<DatePicker.HeadCell class="cal-weekday">{weekday}</DatePicker.HeadCell>
									{/each}
								</DatePicker.GridRow>
							</DatePicker.GridHead>
							<DatePicker.GridBody>
								{#each month.weeks as weekDates, wi (wi)}
									<DatePicker.GridRow class="cal-row">
										{#each weekDates as date (date.toString())}
											<DatePicker.Cell {date} month={month.value} class="cal-cell">
												<DatePicker.Day class="cal-day">
													{date.day}
												</DatePicker.Day>
											</DatePicker.Cell>
										{/each}
									</DatePicker.GridRow>
								{/each}
							</DatePicker.GridBody>
						</DatePicker.Grid>
					{/each}
				{/snippet}
			</DatePicker.Calendar>
		</DatePicker.Content>
	</DatePicker.Root>
	{#if hint}
		<div class="date-hint">{hint}</div>
	{/if}
</div>

<style>
	.date-field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.date-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-ink-muted);
	}

	.date-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-1);
	}

	:global(.date-input) {
		display: inline-flex;
		align-items: center;
		padding: var(--spacing-2) var(--spacing-3);
		background: var(--color-canvas);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		font-family: var(--font-data);
		font-size: 13px;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink);
		transition: border-color 0.12s;
	}

	:global(.date-input:focus-within) {
		border-color: var(--color-wire-focus);
	}

	:global(.date-editable) {
		padding: 1px 2px;
		border-radius: 2px;
		outline: none;
		color: var(--color-ink);
	}

	:global(.date-editable:focus) {
		background: var(--color-vekt);
		color: var(--color-canvas);
	}

	:global(.date-editable[data-placeholder]) {
		color: var(--color-ink-muted);
	}

	:global(.date-literal) {
		color: var(--color-ink-muted);
	}

	:global(.date-trigger) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		color: var(--color-ink-secondary);
		cursor: pointer;
		transition: background-color 0.12s, color 0.12s;
	}

	:global(.date-trigger:hover) {
		background: var(--color-felt-hover);
		color: var(--color-ink);
	}

	:global(.date-trigger:focus-visible) {
		outline: none;
		border-color: var(--color-wire-focus);
	}

	:global(.date-popover) {
		z-index: 50;
		background: var(--color-felt-raised);
		border: 1px solid var(--color-wire-strong);
		border-radius: var(--radius-md);
		padding: var(--spacing-3);
		margin-top: var(--spacing-1);
	}

	:global(.cal-header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--spacing-2);
	}

	:global(.cal-heading) {
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 600;
		color: var(--color-ink);
		text-transform: capitalize;
	}

	:global(.cal-nav) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		background: none;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		color: var(--color-ink-secondary);
		cursor: pointer;
		transition: background-color 0.1s, color 0.1s;
	}

	:global(.cal-nav:hover) {
		background: var(--color-felt-hover);
		color: var(--color-ink);
	}

	:global(.cal-nav:focus-visible) {
		outline: none;
		border-color: var(--color-wire-focus);
	}

	:global(.cal-grid) {
		border-collapse: collapse;
	}

	:global(.cal-row) {
		display: flex;
	}

	:global(.cal-weekday) {
		width: 32px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	:global(.cal-cell) {
		padding: 1px;
	}

	:global(.cal-day) {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-data);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink);
		background: none;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		padding: 0;
		cursor: pointer;
		transition: background-color 0.1s, border-color 0.1s;
	}

	:global(.cal-day:hover:not([data-disabled]):not([data-selected])) {
		background: var(--color-felt-hover);
	}

	:global(.cal-day:focus-visible) {
		outline: none;
		border-color: var(--color-wire-focus);
	}

	:global(.cal-day[data-selected]) {
		background: var(--color-vekt);
		color: var(--color-canvas);
		font-weight: 700;
	}

	:global(.cal-day[data-today]:not([data-selected])) {
		border-color: var(--color-vekt-bg-strong);
	}

	:global(.cal-day[data-disabled]) {
		color: var(--color-ink-muted);
		cursor: default;
	}

	:global(.cal-day[data-outside-month]) {
		color: var(--color-ink-ghost);
		opacity: 0.5;
	}

	.date-hint {
		font-size: 11px;
		color: var(--color-ink-muted);
	}
</style>

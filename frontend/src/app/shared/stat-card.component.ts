import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [NgClass, NgIf],
  template: `
    <article class="lf-card min-h-[112px] px-4 py-4">
      <p class="text-[11px] font-medium text-[#5f697d]">{{ label }}</p>
      <div class="mt-2 flex items-end gap-2">
        <strong class="text-[26px] font-bold leading-none tracking-[-0.04em] text-[#172033]">{{ value }}</strong>
      </div>
      <p
        *ngIf="hint"
        class="mt-2 text-[10px] font-medium"
        [ngClass]="toneClass"
      >
        {{ hint }}
      </p>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value = '';
  @Input() hint = '';
  @Input() tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' = 'neutral';

  get toneClass(): string {
    return {
      neutral: 'text-[#7b8597]',
      success: 'text-[#08aa83]',
      warning: 'text-[#f59e0b]',
      danger: 'text-[#f04455]',
      info: 'text-[#10a7b2]',
    }[this.tone];
  }
}

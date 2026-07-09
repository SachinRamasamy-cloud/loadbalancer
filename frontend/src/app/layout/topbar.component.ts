import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <header class="sticky top-0 z-30 flex h-[64px] items-center border-b border-[#e1e5ed] bg-white/95 px-4 backdrop-blur md:px-6 lg:px-7">
      <button
        type="button"
        class="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e1e5ed] text-[#536078] lg:hidden"
        aria-label="Open navigation"
        (click)="menu.emit()"
      >
        <app-icon name="menu" [size]="19" />
      </button>

      <div class="relative w-full max-w-[390px]">
        <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#8d97a9]">
          <app-icon name="search" [size]="15" />
        </span>
        <input
          [(ngModel)]="search"
          class="lf-input h-10 pl-9"
          placeholder="Search pools, servers..."
          aria-label="Search pools and servers"
        />
      </div>

      <div class="ml-auto flex items-center gap-3 md:gap-4">
        <button class="relative text-[#67738a] transition hover:text-[#6f2be4]" aria-label="Notifications">
          <app-icon name="bell" [size]="18" />
          <span class="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#ef3f75] ring-2 ring-white"></span>
        </button>

        <div class="flex items-center gap-2.5">
          <div class="grid h-8 w-8 place-items-center rounded-full bg-[#153d86] text-[10px] font-bold text-white shadow-sm">JD</div>
          <span class="hidden text-[12px] font-semibold text-[#263248] sm:block">John Doe</span>
        </div>

        <button class="hidden h-8 rounded-[6px] border border-[#e0e4eb] bg-white px-3 text-[10px] font-semibold text-[#4d586d] hover:bg-[#f8f9fb] sm:inline-flex sm:items-center">
          Logout
        </button>
      </div>
    </header>
  `,
})
export class TopbarComponent {
  @Output() menu = new EventEmitter<void>();
  search = '';
}

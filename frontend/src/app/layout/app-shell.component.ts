import { Component } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopbarComponent } from './topbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, NgIf, NgClass, SidebarComponent, TopbarComponent],
  template: `
    <div class="min-h-screen bg-[#f5f7fb]">
      <button
        *ngIf="mobileOpen"
        type="button"
        class="fixed inset-0 z-40 bg-[#08152f]/50 backdrop-blur-[1px] lg:hidden"
        aria-label="Close navigation"
        (click)="mobileOpen = false"
      ></button>

      <div
        class="fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0"
        [ngClass]="mobileOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <app-sidebar (navigate)="mobileOpen = false" />
      </div>

      <div class="min-h-screen lg:pl-[224px]">
        <app-topbar (menu)="mobileOpen = true" />
        <main><router-outlet /></main>
      </div>
    </div>
  `,
})
export class AppShellComponent {
  mobileOpen = false;
}

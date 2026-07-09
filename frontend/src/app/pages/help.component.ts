import { Component } from '@angular/core';

@Component({
  selector: 'app-help-page',
  standalone: true,
  template: `<section class="lf-page"><div class="mb-5"><h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Help</h1><p class="mt-1 text-[11px] text-[#778196]">Documentation and operational support.</p></div><div class="grid gap-4 md:grid-cols-3"><article class="lf-card p-5"><h2 class="lf-card-title">Getting Started</h2><p class="mt-3 text-[11px] leading-5 text-[#737e91]">Configure pools, register real servers and choose a routing algorithm.</p></article><article class="lf-card p-5"><h2 class="lf-card-title">Operations Guide</h2><p class="mt-3 text-[11px] leading-5 text-[#737e91]">Review health checks, draining workflows, alerts and incident logs.</p></article><article class="lf-card p-5"><h2 class="lf-card-title">Support</h2><p class="mt-3 text-[11px] leading-5 text-[#737e91]">Contact the platform team for production configuration assistance.</p></article></div></section>`,
})
export class HelpComponent {}

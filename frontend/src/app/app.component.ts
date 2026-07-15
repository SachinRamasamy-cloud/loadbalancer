import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiFlowLiveStreamService } from './features/api-flow/api-flow-live-stream.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(private readonly liveApiStream: ApiFlowLiveStreamService) {}

  ngOnInit(): void {
    // Start once for the complete Angular application. API calls remain visible
    // even when they happen while the user is on another dashboard page.
    this.liveApiStream.start();
  }

  ngOnDestroy(): void {
    this.liveApiStream.stop();
  }
}

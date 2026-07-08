import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverviewComponent } from './overview.component';

describe('OverviewComponent', () => {
  let fixture: ComponentFixture<OverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OverviewComponent);
    fixture.detectChanges();
  });

  it('renders the dashboard title', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain(
      'Load Balancer Overview',
    );
  });
});

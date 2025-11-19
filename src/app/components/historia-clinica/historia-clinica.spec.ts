import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoriaClinica } from './historia-clinica';

describe('HistoriaClinica', () => {
  let component: HistoriaClinica;
  let fixture: ComponentFixture<HistoriaClinica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoriaClinica]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoriaClinica);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

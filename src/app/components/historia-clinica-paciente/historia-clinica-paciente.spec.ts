import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoriaClinicaPaciente } from './historia-clinica-paciente';

describe('HistoriaClinicaPaciente', () => {
  let component: HistoriaClinicaPaciente;
  let fixture: ComponentFixture<HistoriaClinicaPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoriaClinicaPaciente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoriaClinicaPaciente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

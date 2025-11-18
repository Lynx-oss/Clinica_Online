import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CargarHistoriaClinica } from './cargar-historia-clinica';

describe('CargarHistoriaClinica', () => {
  let component: CargarHistoriaClinica;
  let fixture: ComponentFixture<CargarHistoriaClinica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CargarHistoriaClinica]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CargarHistoriaClinica);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurnosEspecialista } from './turnos-especialista';

describe('TurnosEspecialista', () => {
  let component: TurnosEspecialista;
  let fixture: ComponentFixture<TurnosEspecialista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurnosEspecialista]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TurnosEspecialista);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

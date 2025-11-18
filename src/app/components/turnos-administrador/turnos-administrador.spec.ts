import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurnosAdministrador } from './turnos-administrador';

describe('TurnosAdministrador', () => {
  let component: TurnosAdministrador;
  let fixture: ComponentFixture<TurnosAdministrador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurnosAdministrador]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TurnosAdministrador);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

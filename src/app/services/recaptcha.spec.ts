import { TestBed } from '@angular/core/testing';

import { Recaptcha } from './recaptcha';

describe('Recaptcha', () => {
  let service: Recaptcha;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Recaptcha);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

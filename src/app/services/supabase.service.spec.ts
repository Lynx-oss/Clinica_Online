import { TestBed } from '@angular/core/testing';

import { SupabaseServiceTs } from './supabase.service.js';

describe('SupabaseServiceTs', () => {
  let service: SupabaseServiceTs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupabaseServiceTs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

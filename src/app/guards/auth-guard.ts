import { inject } from '@angular/core'
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  const user = supabaseService.currentUserValue;

  if(!user) {
    router.navigate(['/welcome']);
    return false;
  }

  if(route.routeConfig?.path === 'usuarios'){
    const profile = await supabaseService.getProfile(user.id);
    if(profile?.role !== 'admin'){
      router.navigate(['/home']);
      return false;
    }
  }
  return true;
};

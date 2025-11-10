import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare const grecaptcha: any;

@Injectable({
  providedIn: 'root'
})
export class Recaptcha {
  private siteKey = environment.recaptchaSiteKey;

  constructor(){
    console.log('sitekey', this.siteKey)
  }

  render(containerId: string, callback: (token: string)=> void): number {
    console.log('renderizando captcha')
    return grecaptcha.render(containerId, {
      sitekey: this.siteKey,
      callback: callback,
      size: 'normal',
      'expired-callback' : () =>{
        console.log('captcha expired')
      }
    })
  }

  reset(widgetId: number): void {
    if(widgetId !== undefined){
      grecaptcha.reset(widgetId);  
    } else {
      grecaptcha.reset();
    }
  }

  execute(widgetId: number): void{
    if(widgetId !== undefined){
      grecaptcha.execute(widgetId);
    } else{
      grecaptcha.execute();
    }
  }

  isReady(): boolean {
    const ready = typeof grecaptcha !== 'undefined' && typeof grecaptcha.render !== 'undefined';
    console.log(ready ? 'recaptcha is ready' : 'recaptcha is not ready');
    return ready;
  }
  
}

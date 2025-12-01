import { Directive, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appCopyToClipboard]',
  standalone: true
})
export class CopyToClipboardDirective {
  @Input() appCopyToClipboard: string = '';

  @HostListener('click', ['$event'])
  onClick(event: Event) {
    event.stopPropagation();
    if (this.appCopyToClipboard) {
      navigator.clipboard.writeText(this.appCopyToClipboard).then(() => {
        console.log('Copiado al portapapeles:', this.appCopyToClipboard);
      });
    }
  }
}
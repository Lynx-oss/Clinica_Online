import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeFormat',
  standalone: true
})
export class TimeFormatPipe implements PipeTransform {
  transform(value: string | null | undefined, locale: string = 'es-AR'): string {
    if (!value) return '-';
    return new Date(value).toLocaleTimeString(locale);
  }
}
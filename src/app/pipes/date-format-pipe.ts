import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateFormat',
  standalone: true
})
export class DateFormatPipe implements PipeTransform {
  transform(value: string | null | undefined, locale: string = 'es-AR'): string {
    if (!value) return '-';
    return new Date(value).toLocaleDateString(locale);
  }
}
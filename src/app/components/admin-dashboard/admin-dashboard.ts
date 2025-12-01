import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import * as Highcharts from 'highcharts';
import Exporting from 'highcharts/modules/exporting';
import ExportData from 'highcharts/modules/export-data';
import OfflineExporting from 'highcharts/modules/offline-exporting'; 
import { HighchartsChartComponent } from 'highcharts-angular'; 

import { SupabaseService } from '../../services/supabase.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { DateFormatPipe } from '../../pipes/date-format-pipe';
import { TimeFormatPipe } from '../../pipes/time-format-pipe';
import { TruncateTextPipe } from '../../pipes/truncate-text-pipe';

import { HighlightDirective } from '../../directives/highlight.directive.ts';
import { LoadingDirective } from '../../directives/loading.directive.ts';
import { CopyToClipboardDirective } from '../../directives/copy-to-clipboard.directive.ts';

const maybeExporting: any = Exporting;
if (typeof maybeExporting === 'function') {
  maybeExporting(Highcharts);
} else if (maybeExporting?.default) {
  maybeExporting.default(Highcharts);
}

const maybeExportData: any = ExportData;
if (typeof maybeExportData === 'function') {
  maybeExportData(Highcharts);
} else if (maybeExportData?.default) {
  maybeExportData.default(Highcharts);
}

const maybeOfflineExporting: any = OfflineExporting;
if (typeof maybeOfflineExporting === 'function') {
  maybeOfflineExporting(Highcharts);
} else if (maybeOfflineExporting?.default) {
  maybeOfflineExporting.default(Highcharts);
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'],
  imports: [
    CommonModule,
    FormsModule,
    HighchartsChartComponent,
    DateFormatPipe,
    TimeFormatPipe,
    TruncateTextPipe,
    HighlightDirective,
    LoadingDirective,
    CopyToClipboardDirective
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AdminDashboard implements OnInit, AfterViewChecked {
  Highcharts: typeof Highcharts = Highcharts;
  
  chartOptions: Highcharts.Options = {
    series: [{ type: 'column', data: [] }]
  };
  
  @ViewChild('lineChartContainer', { static: false }) lineChartContainer!: ElementRef;
  private lineChart?: Highcharts.Chart;
  private lineChartBuilt = false;
  
  loading = false;
  loginLogs: Array<any> = [];
  loginsPorDia: Array<{ dia: string; cantidad: number }> = [];
  startDate: string = '';
  endDate: string = '';

  constructor(private supabaseService: SupabaseService, private router: Router) {}

  async ngOnInit() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);

    this.startDate = start.toISOString().slice(0, 10);
    this.endDate = end.toISOString().slice(0, 10);

    await this.loadData();
  }

  ngAfterViewChecked() {
    if (this.lineChartContainer && this.loginsPorDia.length > 0 && !this.lineChartBuilt && !this.loading) {
      this.buildLineChart();
    }
  }

  async loadData() {
    this.loading = true;
    this.lineChartBuilt = false;
    
    try {
      const startTs = `${this.startDate}T00:00:00Z`;
      const endTs = `${this.endDate}T23:59:59Z`;

      const { data, error } = await this.supabaseService.getLoginLogs({
        start: startTs,
        end: endTs,
        limit: 5000,
        offset: 0,
      });

      if (error) {
        console.error('Error obteniendo logs:', error);
        this.loginLogs = [];
        this.loginsPorDia = [];
        return;
      }

      this.loginLogs = data || [];
      this.aggregateLoginsByDay();
      this.buildChart();
    } catch (err) {
      console.error(err);
      this.loginLogs = [];
      this.loginsPorDia = [];
    } finally {
      this.loading = false;
    }
  }

  aggregateLoginsByDay() {
    const map = new Map<string, number>();
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }

    this.loginLogs.forEach((l: any) => {
      if (l.logged_at) {
        const dia = l.logged_at.slice(0, 10);
        if (map.has(dia)) {
          map.set(dia, (map.get(dia) || 0) + 1);
        } else {
          map.set(dia, 1);
        }
      }
    });

    this.loginsPorDia = Array.from(map.entries())
      .map(([dia, cantidad]) => ({ dia, cantidad }))
      .sort((a, b) => a.dia.localeCompare(b.dia));
  }

  buildChart() {
    const categories = this.loginsPorDia.map((d) => d.dia);
    const data = this.loginsPorDia.map((d) => d.cantidad);

    this.chartOptions = {
      chart: { 
        type: 'column',
        backgroundColor: 'transparent'
      },
      title: { 
        text: 'Ingresos al sistema por día',
        style: {
          color: '#023e8a',
          fontWeight: 'bold',
          fontSize: '18px'
        }
      },
      xAxis: { 
        categories, 
        title: { text: 'Día' },
        labels: {
          rotation: -45,
          style: {
            fontSize: '11px'
          }
        }
      },
      yAxis: { 
        title: { text: 'Cantidad' }, 
        allowDecimals: false 
      },
      series: [{ 
        name: 'Logins', 
        type: 'column', 
        data,
        color: '#0077b6'
      }],
      credits: { enabled: false },
      exporting: { 
        enabled: true,
        fallbackToExportServer: false, 
        buttons: {
          contextButton: {
            menuItems: ['downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG']
          }
        }
      }
    };
  }

  buildLineChart() {
    if (!this.lineChartContainer || !this.loginsPorDia.length) {
      return;
    }

    const categories = this.loginsPorDia.map((d) => d.dia);
    const seriesData = this.loginsPorDia.map((d) => d.cantidad);

    const options: Highcharts.Options = {
      chart: { 
        type: 'line',
        backgroundColor: 'transparent'
      },
      title: { 
        text: 'Tendencia de ingresos al sistema',
        style: {
          color: '#023e8a',
          fontWeight: 'bold',
          fontSize: '18px'
        }
      },
      xAxis: { 
        categories, 
        title: { text: 'Día' },
        labels: {
          rotation: -45,
          style: {
            fontSize: '11px'
          }
        }
      },
      yAxis: { 
        title: { text: 'Cantidad de logins' }, 
        allowDecimals: false 
      },
      series: [{ 
        name: 'Logins', 
        type: 'line', 
        data: seriesData,
        color: '#0077b6',
        lineWidth: 3,
        marker: {
          enabled: true,
          radius: 5,
          fillColor: '#0077b6'
        }
      }],
      credits: { enabled: false },
      exporting: { 
        enabled: true,
        fallbackToExportServer: false, 
        buttons: {
          contextButton: {
            menuItems: ['downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG']
          }
        }
      },
      tooltip: {
        shared: true,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#0077b6',
        borderRadius: 10,
        style: {
          fontSize: '12px'
        }
      },
      plotOptions: {
        line: {
          dataLabels: {
            enabled: false
          },
          enableMouseTracking: true
        }
      }
    };

    if (this.lineChart) {
      this.lineChart.destroy();
    }

    try {
      this.lineChart = Highcharts.chart(this.lineChartContainer.nativeElement, options);
      this.lineChartBuilt = true;
    } catch (error) {
      console.error('Error al crear el gráfico de líneas:', error);
    }
  }

  async aplicarFiltro() {
    if (this.startDate > this.endDate) {
      alert('La fecha de inicio no puede ser mayor a la fecha final.');
      return;
    }
    await this.loadData();
  }

  exportLogsToExcel() {
    if (!this.loginLogs.length) return;

    const rows = this.loginLogs.map((l: any) => ({
      usuario: l.user_id, 
      email: l.email,
      fecha: new Date(l.logged_at).toLocaleDateString('es-AR'),
      hora: new Date(l.logged_at).toLocaleTimeString('es-AR'),
      ip: l.ip_address 
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'login_logs');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout]), `login_logs_${this.startDate}_a_${this.endDate}.xlsx`);
  }

  volver() {
    this.router.navigate(['/home']);
  }

  ngOnDestroy() {
    if (this.lineChart) {
      this.lineChart.destroy();
    }
  }
}
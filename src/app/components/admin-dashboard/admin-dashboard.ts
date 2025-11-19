import { Component, OnInit } from '@angular/core';
import * as Highcharts from 'highcharts';
import Exporting from 'highcharts/modules/exporting';
import ExportData from 'highcharts/modules/export-data';

import { SupabaseService } from '../../services/supabase.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'],
  imports: [
    CommonModule,
    FormsModule,
  ],
})
export class AdminDashboardComponent implements OnInit {
  Highcharts: typeof Highcharts = Highcharts;
  chartOptions: Highcharts.Options = {};
  loading = false;

  loginLogs: Array<any> = [];
  loginsPorDia: Array<{ dia: string; cantidad: number }> = [];

  startDate: string = '';
  endDate: string = '';

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);

    this.startDate = start.toISOString().slice(0, 10);
    this.endDate = end.toISOString().slice(0, 10);

    await this.loadData();
  }

  async loadData() {
    this.loading = true;
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
    const start = new Date(this.startDate + 'T00:00:00');
    const end = new Date(this.endDate + 'T00:00:00');

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }

    this.loginLogs.forEach((l: any) => {
      const dia = l.logged_at.slice(0, 10); // evitar errores de TZ
      map.set(dia, (map.get(dia) || 0) + 1);
    });

    this.loginsPorDia = Array.from(map.entries())
      .map(([dia, cantidad]) => ({ dia, cantidad }))
      .sort((a, b) => a.dia.localeCompare(b.dia));
  }

  buildChart() {
    const categories = this.loginsPorDia.map((d) => d.dia);
    const data = this.loginsPorDia.map((d) => d.cantidad);

    this.chartOptions = {
      chart: { type: 'column' },
      title: { text: 'Ingresos al sistema por día' },
      xAxis: { categories, title: { text: 'Día' } },
      yAxis: { title: { text: 'Cantidad' }, allowDecimals: false },
      series: [{ name: 'Logins', type: 'column', data }],
      credits: { enabled: false },
    };
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
      fecha: this.formatDate(l.logged_at),
      hora: this.formatTime(l.logged_at),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'login_logs');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout]), `login_logs_${this.startDate}_a_${this.endDate}.xlsx`);
  }

  formatDate(dt: string) {
    return new Date(dt).toLocaleDateString('es-AR');
  }

  formatTime(dt: string) {
    return new Date(dt).toLocaleTimeString('es-AR');
  }
}

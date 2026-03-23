import os from 'os';
import { monitorEventLoopDelay } from 'perf_hooks';

export interface ProcessMetricsSnapshot {
  readonly cpu_percent: number;
  readonly peak_cpu_percent: number;
  readonly rss_mb: number;
  readonly heap_used_mb: number;
  readonly external_mb: number;
  readonly peak_rss_mb: number;
  readonly event_loop_delay_ms: number;
  readonly peak_event_loop_delay_ms: number;
  readonly uptime_seconds: number;
  readonly sample_count: number;
}

class ProcessMetricsCollector {
  private readonly cpu_count: number;
  private readonly event_loop_histogram = monitorEventLoopDelay({ resolution: 20 });
  private timer: NodeJS.Timeout | null = null;
  private last_cpu_usage = process.cpuUsage();
  private last_sample_ms = Date.now();
  private sample_count = 0;
  private cpu_percent = 0;
  private peak_cpu_percent = 0;
  private peak_rss_bytes = 0;
  private peak_event_loop_delay_ms = 0;

  constructor() {
    this.cpu_count = Math.max(1, os.cpus().length);
  }

  start(interval_ms = 1000): void {
    if (this.timer) {
      return;
    }

    this.event_loop_histogram.enable();
    this.last_cpu_usage = process.cpuUsage();
    this.last_sample_ms = Date.now();

    this.timer = setInterval(() => {
      this.sample();
    }, interval_ms);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.event_loop_histogram.disable();
  }

  private sample(): void {
    const now_ms = Date.now();
    const elapsed_ms = Math.max(1, now_ms - this.last_sample_ms);
    this.last_sample_ms = now_ms;

    const cpu_usage = process.cpuUsage(this.last_cpu_usage);
    this.last_cpu_usage = process.cpuUsage();

    const cpu_micros = cpu_usage.user + cpu_usage.system;
    const single_core_percent = (cpu_micros / (elapsed_ms * 1000)) * 100;
    // Normalize by CPU cores so this number is bounded in [0, 100+] relative to whole machine capacity.
    this.cpu_percent = single_core_percent / this.cpu_count;
    this.peak_cpu_percent = Math.max(this.peak_cpu_percent, this.cpu_percent);

    const memory = process.memoryUsage();
    this.peak_rss_bytes = Math.max(this.peak_rss_bytes, memory.rss);

    const delay_ms = this.event_loop_histogram.percentile(99) / 1e6;
    this.peak_event_loop_delay_ms = Math.max(this.peak_event_loop_delay_ms, delay_ms);

    this.sample_count++;
  }

  get_snapshot(): ProcessMetricsSnapshot {
    const memory = process.memoryUsage();
    const current_delay_ms = this.event_loop_histogram.percentile(99) / 1e6;

    return {
      cpu_percent: Number(this.cpu_percent.toFixed(2)),
      peak_cpu_percent: Number(this.peak_cpu_percent.toFixed(2)),
      rss_mb: Number((memory.rss / (1024 * 1024)).toFixed(2)),
      heap_used_mb: Number((memory.heapUsed / (1024 * 1024)).toFixed(2)),
      external_mb: Number((memory.external / (1024 * 1024)).toFixed(2)),
      peak_rss_mb: Number((this.peak_rss_bytes / (1024 * 1024)).toFixed(2)),
      event_loop_delay_ms: Number(current_delay_ms.toFixed(2)),
      peak_event_loop_delay_ms: Number(this.peak_event_loop_delay_ms.toFixed(2)),
      uptime_seconds: Number(process.uptime().toFixed(2)),
      sample_count: this.sample_count
    };
  }
}

export const process_metrics_collector = new ProcessMetricsCollector();

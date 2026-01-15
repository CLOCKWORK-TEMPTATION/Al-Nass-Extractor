/**
 * Data Export/Import Service
 * خدمة تصدير واستيراد البيانات
 */

import type {
  CharacterProfile,
  DialogueEntry,
  NovelMetadata,
  CulturalContextEntry,
  PlotEventEntry,
  SettingEntry,
  ExportFormat,
  ExportOptions,
} from '../schemas/templates';

/**
 * Data Export Service
 * خدمة تصدير البيانات بصيغ متعددة
 */
export class DataExportService {
  /**
   * Export data to specified format
   * تصدير البيانات بالصيغة المحددة
   */
  static export(
    data: any[],
    format: ExportFormat,
    options?: Partial<ExportOptions>
  ): string | Blob {
    switch (format) {
      case 'json':
        return this.exportToJSON(data, options);
      case 'jsonl':
        return this.exportToJSONL(data);
      case 'csv':
        return this.exportToCSV(data, options);
      case 'txt':
        return this.exportToTXT(data);
      default:
        throw new Error(`تنسيق غير مدعوم: ${format}`);
    }
  }

  /**
   * Export to JSON format
   */
  private static exportToJSON(data: any[], options?: Partial<ExportOptions>): string {
    const filtered = this.filterData(data, options?.filter);
    const selected = options?.fields
      ? this.selectFields(filtered, options.fields)
      : filtered;

    const output = options?.include_metadata
      ? {
          metadata: {
            export_date: new Date().toISOString(),
            total_records: selected.length,
            format: 'json',
          },
          data: selected,
        }
      : selected;

    return JSON.stringify(output, null, 2);
  }

  /**
   * Export to JSONL format (JSON Lines)
   */
  private static exportToJSONL(data: any[]): string {
    return data.map(item => JSON.stringify(item)).join('\n');
  }

  /**
   * Export to CSV format
   */
  private static exportToCSV(data: any[], options?: Partial<ExportOptions>): string {
    if (data.length === 0) {
      return '';
    }

    // Flatten nested objects
    const flattenedData = data.map(item => this.flattenObject(item));

    // Extract all unique keys
    const allKeys = new Set<string>();
    flattenedData.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    const rows = flattenedData.map(item => {
      return headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      }).map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Export to plain text format
   */
  private static exportToTXT(data: any[]): string {
    return data.map((item, index) => {
      const lines = [`=== Record ${index + 1} ===`];
      for (const [key, value] of Object.entries(item)) {
        if (typeof value === 'object' && value !== null) {
          lines.push(`${key}: ${JSON.stringify(value, null, 2)}`);
        } else {
          lines.push(`${key}: ${value}`);
        }
      }
      return lines.join('\n');
    }).join('\n\n');
  }

  /**
   * Flatten nested object for CSV export
   */
  private static flattenObject(
    obj: any,
    prefix: string = '',
    result: Record<string, any> = {}
  ): Record<string, any> {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        result[newKey] = '';
      } else if (Array.isArray(value)) {
        result[newKey] = value.join('; ');
      } else if (typeof value === 'object') {
        this.flattenObject(value, newKey, result);
      } else {
        result[newKey] = value;
      }
    }
    return result;
  }

  /**
   * Filter data based on criteria
   */
  private static filterData(data: any[], filter?: ExportOptions['filter']): any[] {
    if (!filter) return data;

    return data.filter(item => {
      if (filter.novel_id && item.novel_id !== filter.novel_id) {
        return false;
      }

      if (filter.character_ids && item.character_id) {
        if (!filter.character_ids.includes(item.character_id)) {
          return false;
        }
      }

      if (filter.date_range) {
        const itemDate = item.created_date || item.last_updated;
        if (itemDate) {
          if (itemDate < filter.date_range.start || itemDate > filter.date_range.end) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Select specific fields from data
   */
  private static selectFields(data: any[], fields: string[]): any[] {
    return data.map(item => {
      const selected: any = {};
      for (const field of fields) {
        const keys = field.split('.');
        let value: any = item;
        for (const key of keys) {
          if (value && typeof value === 'object') {
            value = value[key];
          } else {
            value = undefined;
            break;
          }
        }
        if (value !== undefined) {
          this.setNestedValue(selected, field, value);
        }
      }
      return selected;
    });
  }

  /**
   * Set nested value in object
   */
  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  /**
   * Download data as file
   */
  static downloadAsFile(content: string | Blob, filename: string): void {
    const blob = typeof content === 'string'
      ? new Blob([content], { type: 'text/plain;charset=utf-8' })
      : content;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Data Import Service
 * خدمة استيراد البيانات
 */
export class DataImportService {
  /**
   * Import data from file content
   * استيراد البيانات من محتوى الملف
   */
  static async import(content: string, format: ExportFormat): Promise<any[]> {
    switch (format) {
      case 'json':
        return this.importFromJSON(content);
      case 'jsonl':
        return this.importFromJSONL(content);
      case 'csv':
        return this.importFromCSV(content);
      default:
        throw new Error(`تنسيق غير مدعوم: ${format}`);
    }
  }

  /**
   * Import from JSON format
   */
  private static importFromJSON(content: string): any[] {
    try {
      const parsed = JSON.parse(content);

      // Check if it's wrapped with metadata
      if (parsed.data && Array.isArray(parsed.data)) {
        return parsed.data;
      }

      // Otherwise assume it's the data array directly
      if (Array.isArray(parsed)) {
        return parsed;
      }

      // Single object - wrap in array
      return [parsed];
    } catch (error) {
      throw new Error(`فشل تحليل JSON: ${error}`);
    }
  }

  /**
   * Import from JSONL format
   */
  private static importFromJSONL(content: string): any[] {
    const lines = content.split('\n').filter(line => line.trim());
    const data: any[] = [];

    for (const line of lines) {
      try {
        data.push(JSON.parse(line));
      } catch (error) {
        console.warn('تخطي سطر غير صالح:', line);
      }
    }

    return data;
  }

  /**
   * Import from CSV format
   */
  private static importFromCSV(content: string): any[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return [];
    }

    const headers = this.parseCSVLine(lines[0]);
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const obj: any = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        this.setNestedValue(obj, header, value);
      });

      data.push(obj);
    }

    return data;
  }

  /**
   * Parse a CSV line
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  /**
   * Set nested value in object
   */
  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  /**
   * Read file content
   */
  static async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('فشل قراءة الملف'));
      reader.readAsText(file, 'utf-8');
    });
  }
}

/**
 * Data Conversion Utilities
 * أدوات تحويل البيانات
 */
export class DataConversionService {
  /**
   * Convert JSON to TXT format
   * تحويل JSON إلى نص عادي
   */
  static jsonToTxt(data: any): string {
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        return data;
      }
    }

    return this.objectToText(data);
  }

  private static objectToText(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    const lines: string[] = [];

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        lines.push(`${spaces}[${index}]`);
        lines.push(this.objectToText(item, indent + 1));
      });
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          lines.push(`${spaces}${key}:`);
          lines.push(this.objectToText(value, indent + 1));
        } else {
          lines.push(`${spaces}${key}: ${value}`);
        }
      }
    } else {
      lines.push(`${spaces}${obj}`);
    }

    return lines.join('\n');
  }

  /**
   * Merge multiple JSONL files
   * دمج عدة ملفات JSONL
   */
  static mergeJSONL(contents: string[]): string {
    const allData: any[] = [];

    for (const content of contents) {
      const data = DataImportService['importFromJSONL'](content);
      allData.push(...data);
    }

    return DataExportService['exportToJSONL'](allData);
  }

  /**
   * Deduplicate data by key
   * إزالة التكرارات من البيانات
   */
  static deduplicate(data: any[], keyField: string = 'id'): any[] {
    const seen = new Set<any>();
    const unique: any[] = [];

    for (const item of data) {
      const key = this.getNestedValue(item, keyField);
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique;
  }

  private static getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }
}

/**
 * Batch Processing Service
 * خدمة المعالجة الجماعية
 */
export class BatchProcessingService {
  /**
   * Process multiple files
   * معالجة عدة ملفات
   */
  static async processMultipleFiles(
    files: File[],
    processor: (content: string, filename: string) => Promise<any>
  ): Promise<Array<{ filename: string; result: any; error?: string }>> {
    const results: Array<{ filename: string; result: any; error?: string }> = [];

    for (const file of files) {
      try {
        const content = await DataImportService.readFile(file);
        const result = await processor(content, file.name);
        results.push({ filename: file.name, result });
      } catch (error: any) {
        results.push({
          filename: file.name,
          result: null,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Batch export with progress tracking
   * تصدير جماعي مع تتبع التقدم
   */
  static async batchExport(
    datasets: Array<{ name: string; data: any[] }>,
    format: ExportFormat,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const results: string[] = [];
    const total = datasets.length;

    for (let i = 0; i < datasets.length; i++) {
      const { name, data } = datasets[i];
      const content = DataExportService.export(data, format);

      if (typeof content === 'string') {
        results.push(`=== ${name} ===\n${content}\n`);
      }

      if (onProgress) {
        onProgress((i + 1) / total);
      }
    }

    const combined = results.join('\n\n');
    return new Blob([combined], { type: 'text/plain;charset=utf-8' });
  }
}

import * as XLSX from 'xlsx';

export class ExcelService {
  /**
   * Export JSON array to Excel (.xlsx) file
   */
  public static exportToExcel(data: Record<string, any>[], filename: string, sheetName = 'Sheet1') {
    if (!data || data.length === 0) {
      throw new Error('No data available to export');
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Auto-fit column widths
    const keys = Object.keys(data[0] || {});
    worksheet['!cols'] = keys.map((key) => ({
      wch: Math.max(key.length + 3, 14),
    }));

    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }

  /**
   * Export data to CSV
   */
  public static exportToCsv(data: Record<string, any>[], filename: string) {
    if (!data || data.length === 0) {
      throw new Error('No data available to export');
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Parse uploaded Excel or CSV file to JSON objects
   */
  public static async parseExcelFile(file: File): Promise<Record<string, any>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          resolve(json as Record<string, any>[]);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }
}

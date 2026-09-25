import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Bilty, CompanySettings } from '../../types';
import { PdfService } from '../../services/pdfService';
import { ExcelService } from '../../services/excelService';

interface BiltySinglePagePrintModalProps {
  bilties: Bilty[];
  settings: CompanySettings;
  onClose: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const BiltySinglePagePrintModal: React.FC<BiltySinglePagePrintModalProps> = ({
  bilties,
  settings,
  onClose,
  onShowToast,
}) => {
  const [density, setDensity] = useState<'normal' | 'compact' | 'ultra'>(
    bilties.length > 20 ? 'ultra' : bilties.length > 10 ? 'compact' : 'normal'
  );
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

  const totalPackages = bilties.reduce((sum, b) => sum + (Number(b.packages) || 0), 0);
  const totalWeight = bilties.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);
  const totalFreight = bilties.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  const totalPaid = bilties.reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0);
  const totalBalance = bilties.reduce((sum, b) => sum + (Number(b.balanceAmount) || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      PdfService.generateSinglePageBiltiesPdf(bilties, settings, {
        orientation,
        density,
        title: 'CONSOLIDATED BILTY DISPATCH REGISTER (1-PAGE SHEET)',
      });
      if (onShowToast) {
        onShowToast('Downloaded 1-Page Consolidated Bilty PDF', 'success');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(err.message || 'Failed to generate PDF', 'error');
      }
    }
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = bilties.map((b, idx) => ({
        'Sr. No': idx + 1,
        'Bilty Number': b.biltyNumber,
        'Date': b.biltyDate,
        'Consignor (Sender)': b.consignor,
        'Consignee (Receiver)': b.consignee,
        'Origin (From)': b.fromCity,
        'Destination (To)': b.toCity,
        'Vehicle Number': b.vehicleNumber,
        'Driver Name': b.driverName,
        'Driver Mobile': b.driverMobile || '',
        'Material Description': b.material,
        'Packages': b.packages,
        'Package Type': b.packageType,
        'Weight': `${b.weight} ${b.weightUnit}`,
        'Freight Charges': b.freight,
        'Total Amount': b.totalAmount,
        'Payment Mode': b.paymentType,
        'Paid Amount': b.paidAmount,
        'Balance Due': b.balanceAmount,
        'Remarks': b.remarks || '',
      }));

      ExcelService.exportToExcel(
        dataToExport,
        `Bilties_SinglePage_Register_${Date.now()}`,
        'Selected BTs'
      );
      if (onShowToast) {
        onShowToast(`Exported ${bilties.length} selected BTs to Excel`, 'success');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(err.message || 'Failed to export Excel', 'error');
      }
    }
  };

  // Dynamic styling based on density
  const getDensityStyles = () => {
    switch (density) {
      case 'ultra':
        return {
          tableText: 'text-[9.5px]',
          cellPadding: 'py-0.5 px-1.5',
          headerPadding: 'py-1 px-1.5',
          headerTitle: 'text-sm font-black',
          headerSub: 'text-[9px]',
          metaBox: 'text-[10px] py-1 px-2',
        };
      case 'compact':
        return {
          tableText: 'text-[10.5px]',
          cellPadding: 'py-1 px-2',
          headerPadding: 'py-1.5 px-2',
          headerTitle: 'text-base font-black',
          headerSub: 'text-[10px]',
          metaBox: 'text-[11px] py-1.5 px-2.5',
        };
      case 'normal':
      default:
        return {
          tableText: 'text-xs',
          cellPadding: 'py-1.5 px-2.5',
          headerPadding: 'py-2 px-2.5',
          headerTitle: 'text-lg font-black',
          headerSub: 'text-xs',
          metaBox: 'text-xs py-2 px-3',
        };
    }
  };

  const ds = getDensityStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full border border-slate-300 overflow-hidden my-auto flex flex-col max-h-[96vh]">
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print p-3 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  Single-Page BT Print & Export Sheet
                </span>
                <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {bilties.length} BTs Selected (Ek Hi Page Print)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Consolidated table view formatted specifically to print all selected bilties on 1 single page.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Density Selector */}
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold px-2 uppercase">Fit / Scale:</span>
              <button
                type="button"
                onClick={() => setDensity('normal')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  density === 'normal' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
                title="Normal scale (suitable for up to 10-12 BTs)"
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  density === 'compact' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
                title="Compact scale (suitable for 12-22 BTs)"
              >
                Compact
              </button>
              <button
                type="button"
                onClick={() => setDensity('ultra')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  density === 'ultra' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
                title="Ultra-compact scale (suitable for 22+ BTs to fit on 1 single page)"
              >
                Ultra-Compact
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg font-bold shadow-md shadow-blue-600/30 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print (1-Page)</span>
            </button>

            {/* Download 1-Page PDF */}
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3 py-1.5 rounded-lg font-semibold transition-colors"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>1-Page PDF</span>
            </button>

            {/* Excel Export */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-slate-100 flex-1">
          {/* A4 Printable Sheet Container */}
          <div
            id="single-page-bt-sheet"
            className="printable-area bg-white text-slate-900 border border-slate-300 rounded-xl shadow-lg p-5 sm:p-6 mx-auto w-full transition-all"
            style={{ maxWidth: '100%' }}
          >
            {/* Sheet Company Header */}
            <div className="border-b-2 border-blue-900 pb-3 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-blue-700 font-extrabold block">
                  CONSOLIDATED DISPATCH MANIFEST & LORRY RECEIPT REGISTER
                </span>
                <h1 className={`${ds.headerTitle} text-blue-950 tracking-tight uppercase leading-tight`}>
                  {settings.companyName}
                </h1>
                <p className={`${ds.headerSub} text-slate-600 font-medium`}>
                  {settings.address}, {settings.cityState} &bull; Phone: {settings.mobile} &bull; GSTIN:{' '}
                  <span className="font-mono font-bold text-slate-800">{settings.gstNumber}</span>
                </p>
              </div>

              <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
                <div className="inline-block bg-blue-900 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                  Single-Page Sheet
                </div>
                <div className="text-[11px] font-mono text-slate-600 mt-1">
                  Printed: <span className="font-bold text-slate-900">{new Date().toLocaleString('en-IN')}</span>
                </div>
                <div className="text-[11px] font-mono font-bold text-blue-800">
                  Total Bilties: {bilties.length} Nos
                </div>
              </div>
            </div>

            {/* Quick Metrics Banner */}
            <div className={`grid grid-cols-2 sm:grid-cols-5 gap-2 bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 border border-blue-200 rounded-lg ${ds.metaBox} mb-3 font-mono`}>
              <div>
                <span className="text-[9px] uppercase font-sans text-slate-500 font-bold block">Selected Bilties</span>
                <span className="font-bold text-blue-900 text-xs sm:text-sm">{bilties.length} BTs</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-sans text-slate-500 font-bold block">Total Packages</span>
                <span className="font-bold text-slate-900 text-xs sm:text-sm">{totalPackages.toLocaleString()} Pkgs</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-sans text-slate-500 font-bold block">Total Weight</span>
                <span className="font-bold text-slate-900 text-xs sm:text-sm">{totalWeight.toLocaleString()} Kg</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-sans text-slate-500 font-bold block">Total Freight Amount</span>
                <span className="font-bold text-blue-900 text-xs sm:text-sm">
                  {settings.currencySymbol} {totalFreight.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-sans text-slate-500 font-bold block">Paid / Balance Due</span>
                <span className="font-bold text-emerald-700 text-xs sm:text-sm">
                  ₹{totalPaid.toLocaleString()}
                </span>{' '}
                /{' '}
                <span className="font-bold text-rose-700 text-xs sm:text-sm">
                  ₹{totalBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Consolidated BT Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg mb-3">
              <table className={`w-full text-left border-collapse ${ds.tableText}`}>
                <thead>
                  <tr className="bg-blue-900 text-white font-bold border-b border-blue-950 uppercase tracking-wider text-[10px]">
                    <th className={`${ds.headerPadding} text-center w-7 border-r border-blue-800`}>#</th>
                    <th className={`${ds.headerPadding} min-w-[70px] border-r border-blue-800`}>BT #</th>
                    <th className={`${ds.headerPadding} min-w-[70px] border-r border-blue-800`}>Date</th>
                    <th className={`${ds.headerPadding} min-w-[130px] border-r border-blue-800`}>Consignor (Sender)</th>
                    <th className={`${ds.headerPadding} min-w-[130px] border-r border-blue-800`}>Consignee (Receiver)</th>
                    <th className={`${ds.headerPadding} min-w-[110px] border-r border-blue-800`}>Route</th>
                    <th className={`${ds.headerPadding} min-w-[85px] border-r border-blue-800`}>Vehicle</th>
                    <th className={`${ds.headerPadding} min-w-[100px] border-r border-blue-800`}>Material Goods</th>
                    <th className={`${ds.headerPadding} text-center min-w-[50px] border-r border-blue-800`}>Pkgs</th>
                    <th className={`${ds.headerPadding} text-right min-w-[60px] border-r border-blue-800`}>Weight</th>
                    <th className={`${ds.headerPadding} text-center min-w-[55px] border-r border-blue-800`}>Mode</th>
                    <th className={`${ds.headerPadding} text-right min-w-[70px] border-r border-blue-800`}>Freight (₹)</th>
                    <th className={`${ds.headerPadding} text-right min-w-[65px] border-r border-blue-800`}>Paid (₹)</th>
                    <th className={`${ds.headerPadding} text-right min-w-[65px]`}>Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bilties.map((b, idx) => (
                    <tr
                      key={b.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70 hover:bg-blue-50/50'}
                    >
                      <td className={`${ds.cellPadding} text-center font-mono text-slate-500 border-r border-slate-200`}>
                        {idx + 1}
                      </td>
                      <td className={`${ds.cellPadding} font-mono font-bold text-blue-900 border-r border-slate-200`}>
                        {b.biltyNumber}
                      </td>
                      <td className={`${ds.cellPadding} font-mono text-slate-700 whitespace-nowrap border-r border-slate-200`}>
                        {b.biltyDate}
                      </td>
                      <td className={`${ds.cellPadding} font-medium text-slate-900 max-w-[140px] truncate border-r border-slate-200`} title={b.consignor}>
                        {b.consignor}
                      </td>
                      <td className={`${ds.cellPadding} text-slate-800 max-w-[140px] truncate border-r border-slate-200`} title={b.consignee}>
                        {b.consignee}
                      </td>
                      <td className={`${ds.cellPadding} text-slate-700 whitespace-nowrap border-r border-slate-200`}>
                        {b.fromCity} &rarr; {b.toCity}
                      </td>
                      <td className={`${ds.cellPadding} font-mono font-bold text-slate-800 whitespace-nowrap border-r border-slate-200`}>
                        {b.vehicleNumber}
                      </td>
                      <td className={`${ds.cellPadding} text-slate-700 max-w-[110px] truncate border-r border-slate-200`} title={b.material}>
                        {b.material}
                      </td>
                      <td className={`${ds.cellPadding} text-center font-mono font-semibold border-r border-slate-200`}>
                        {b.packages}
                      </td>
                      <td className={`${ds.cellPadding} text-right font-mono text-slate-700 border-r border-slate-200`}>
                        {b.weight ? `${b.weight} ${b.weightUnit || 'Kg'}` : '-'}
                      </td>
                      <td className={`${ds.cellPadding} text-center border-r border-slate-200`}>
                        <span
                          className={`inline-block px-1 py-0.2 rounded font-bold text-[9px] ${
                            b.paymentType === 'Paid'
                              ? 'text-emerald-700 font-bold'
                              : b.paymentType === 'To-Pay'
                              ? 'text-amber-700 font-bold'
                              : 'text-blue-700 font-bold'
                          }`}
                        >
                          {b.paymentType}
                        </span>
                      </td>
                      <td className={`${ds.cellPadding} text-right font-mono font-bold text-slate-900 border-r border-slate-200`}>
                        {b.totalAmount.toLocaleString()}
                      </td>
                      <td className={`${ds.cellPadding} text-right font-mono text-emerald-800 border-r border-slate-200`}>
                        {b.paidAmount > 0 ? b.paidAmount.toLocaleString() : '-'}
                      </td>
                      <td className={`${ds.cellPadding} text-right font-mono font-bold text-rose-700`}>
                        {b.balanceAmount > 0 ? b.balanceAmount.toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-100/90 text-blue-950 font-bold border-t-2 border-blue-900">
                    <td colSpan={8} className={`${ds.cellPadding} text-right uppercase tracking-wider border-r border-blue-300 font-extrabold`}>
                      Grand Total Summary ({bilties.length} Bilties):
                    </td>
                    <td className={`${ds.cellPadding} text-center font-mono font-black text-blue-950 border-r border-blue-300`}>
                      {totalPackages.toLocaleString()}
                    </td>
                    <td className={`${ds.cellPadding} text-right font-mono font-black text-blue-950 border-r border-blue-300`}>
                      {totalWeight.toLocaleString()} Kg
                    </td>
                    <td className={`${ds.cellPadding} border-r border-blue-300`}></td>
                    <td className={`${ds.cellPadding} text-right font-mono font-black text-blue-950 border-r border-blue-300`}>
                      {settings.currencySymbol} {totalFreight.toLocaleString()}
                    </td>
                    <td className={`${ds.cellPadding} text-right font-mono font-black text-emerald-800 border-r border-blue-300`}>
                      {settings.currencySymbol} {totalPaid.toLocaleString()}
                    </td>
                    <td className={`${ds.cellPadding} text-right font-mono font-black text-rose-700`}>
                      {settings.currencySymbol} {totalBalance.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer / Signatures Block */}
            <div className="grid grid-cols-3 gap-4 pt-4 mt-2 border-t border-slate-300 text-xs">
              <div className="text-center">
                <div className="h-9 border-b border-slate-400 mb-1"></div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Booking Clerk / Prepared By
                </span>
              </div>
              <div className="text-center">
                <div className="h-9 border-b border-slate-400 mb-1"></div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Dispatcher / In-Charge Sign
                </span>
              </div>
              <div className="text-center">
                <div className="h-9 border-b border-slate-400 mb-1"></div>
                <span className="text-[10px] font-bold text-slate-900 uppercase">
                  For {settings.companyName} (Authorized)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

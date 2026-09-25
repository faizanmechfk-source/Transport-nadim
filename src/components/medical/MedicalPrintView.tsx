import React from 'react';
import { X, Printer, Download, Share2 } from 'lucide-react';
import { CompanySettings, MedicalEntry } from '../../types';
import { PdfService } from '../../services/pdfService';
import { NativeBridge } from '../../services/nativeBridge';

interface MedicalPrintViewProps {
  entry: MedicalEntry;
  settings: CompanySettings;
  onClose: () => void;
}

export const MedicalPrintView: React.FC<MedicalPrintViewProps> = ({ entry, settings, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const handlePdf = () => {
    PdfService.generateMedicalPdf(entry, settings);
  };

  const handleShare = async () => {
    await NativeBridge.shareOrPrint(
      `Medical Slip #${entry.entryNumber} - ${settings.companyName}`,
      `Pharma Entry ${entry.entryNumber}: Item ${entry.medicalItem}, Batch ${entry.batchNumber}, Qty ${entry.quantity}. Total: ₹${entry.amount.toLocaleString()}`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden my-auto">
        <div className="no-print p-3 bg-slate-800 text-white flex items-center justify-between text-xs">
          <div className="font-semibold flex items-center gap-2">
            <span>Medical Entry Slip:</span>
            <span className="font-mono text-teal-300 font-bold">{entry.entryNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded text-xs font-semibold shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={handlePdf}
              className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-100 px-3 py-1 rounded text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-100 px-3 py-1 rounded text-xs font-semibold"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable slip */}
        <div className="printable-area p-6 sm:p-8 bg-white text-slate-900 text-xs">
          <div className="border-2 border-teal-800 rounded-lg p-5">
            <div className="text-center border-b-2 border-teal-800 pb-3 mb-4">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                MEDICAL TRANSPORT & PHARMACEUTICAL DISPATCH NOTE
              </div>
              <h1 className="text-xl font-black text-teal-900 tracking-tight">{settings.companyName}</h1>
              <p className="text-xs text-slate-600 mt-0.5">{settings.address}, {settings.cityState}</p>
              <p className="text-[11px] text-slate-500">Phone: {settings.mobile} | GSTIN: {settings.gstNumber}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-teal-50 border border-teal-200 p-3 rounded mb-4 font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-sans block">Entry No.</span>
                <span className="font-bold text-teal-900 text-sm">{entry.entryNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-sans block">Date</span>
                <span className="font-bold text-slate-900">{entry.entryDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-sans block">Party / Hospital / Pharma</span>
                <span className="font-bold text-slate-900">{entry.party}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-sans block">Patient / Clin. Reference</span>
                <span className="font-bold text-slate-900">{entry.patientReference || 'N/A'}</span>
              </div>
            </div>

            <div className="border border-slate-300 rounded overflow-hidden mb-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-teal-900 text-white font-bold">
                    <th className="p-2">Item Description</th>
                    <th className="p-2">Batch #</th>
                    <th className="p-2 text-right">Quantity</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 font-bold text-slate-900">{entry.medicalItem}</td>
                    <td className="p-2.5 font-mono font-bold text-teal-800">{entry.batchNumber}</td>
                    <td className="p-2.5 text-right font-mono font-bold">{entry.quantity}</td>
                    <td className="p-2.5 text-right font-mono font-black text-slate-900">
                      {settings.currencySymbol} {entry.amount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border border-slate-200 rounded p-3 bg-slate-50 mb-6 text-xs space-y-1">
              <div>Transport Bilty Ref: <span className="font-mono font-bold text-blue-800">{entry.transportBiltyNumber || 'Direct Supply'}</span></div>
              {entry.remarks && <div>Special Instructions: <span className="text-slate-700 font-medium">{entry.remarks}</span></div>}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 text-center text-[11px] font-bold text-slate-800">
              <div className="border-t border-slate-400 pt-1">Pharmacist / Receiver Signature</div>
              <div className="border-t border-slate-400 pt-1">For {settings.companyName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

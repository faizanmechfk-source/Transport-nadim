import React from 'react';
import { X, Printer, Download, Share2 } from 'lucide-react';
import { Bilty, CompanySettings } from '../../types';
import { PdfService } from '../../services/pdfService';
import { NativeBridge } from '../../services/nativeBridge';

interface BiltyPrintViewProps {
  bilty: Bilty;
  settings: CompanySettings;
  onClose: () => void;
}

export const BiltyPrintView: React.FC<BiltyPrintViewProps> = ({ bilty, settings, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const handlePdf = () => {
    PdfService.generateBiltyPdf(bilty, settings);
  };

  const handleShare = async () => {
    await NativeBridge.shareOrPrint(
      `Bilty #${bilty.biltyNumber} - ${settings.companyName}`,
      `Bilty ${bilty.biltyNumber}: ${bilty.consignor} to ${bilty.consignee}. Total: ₹${bilty.totalAmount.toLocaleString()}`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-300 overflow-hidden my-auto">
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print p-3 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span>Bilty Print Preview:</span>
            <span className="font-mono text-blue-300 font-bold">{bilty.biltyNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Document</span>
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
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE BILTY INVOICE / CONSIGNMENT NOTE (A4 Style) */}
        <div className="printable-area p-6 sm:p-8 bg-white text-slate-900 text-xs">
          <div className="border-2 border-blue-900 rounded-lg p-5">
            {/* Header */}
            <div className="text-center border-b-2 border-blue-900 pb-3 mb-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                CONSIGNMENT NOTE / LORRY RECEIPT (BILTY)
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-blue-900 tracking-tight">
                {settings.companyName}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {settings.address}, {settings.cityState}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Phone: {settings.mobile} | Email: {settings.email} | GSTIN: <span className="font-mono font-bold text-slate-800">{settings.gstNumber}</span>
              </p>
            </div>

            {/* Bilty Metadata Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-blue-50 border border-blue-200 p-2.5 rounded mb-4 font-mono text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block font-sans uppercase">Bilty No.</span>
                <span className="font-bold text-rose-700 text-sm">{bilty.biltyNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-sans uppercase">Date</span>
                <span className="font-bold text-slate-900">{bilty.biltyDate}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-sans uppercase">Payment Mode</span>
                <span className="font-bold text-blue-900 uppercase">{bilty.paymentType}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-sans uppercase">Vehicle No.</span>
                <span className="font-bold text-slate-900">{bilty.vehicleNumber}</span>
              </div>
            </div>

            {/* Consignor & Consignee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-300 rounded p-3 mb-4 bg-slate-50/50">
              <div className="border-r sm:border-r border-slate-200 pr-2">
                <div className="text-[10px] uppercase font-bold text-blue-800 mb-1">
                  Consignor (Sender)
                </div>
                <div className="font-bold text-sm text-slate-900">{bilty.consignor}</div>
                <div className="text-slate-600 mt-1 font-medium">
                  Dispatch From: <span className="font-bold text-slate-800">{bilty.fromCity}</span>
                </div>
              </div>

              <div className="pl-2">
                <div className="text-[10px] uppercase font-bold text-blue-800 mb-1">
                  Consignee (Receiver)
                </div>
                <div className="font-bold text-sm text-slate-900">{bilty.consignee}</div>
                <div className="text-slate-600 mt-1 font-medium">
                  Destination To: <span className="font-bold text-slate-800">{bilty.toCity}</span>
                </div>
              </div>
            </div>

            {/* Goods Table */}
            <div className="border border-slate-300 rounded overflow-hidden mb-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-blue-900 text-white font-bold">
                    <th className="p-2 border-r border-blue-800">Packages</th>
                    <th className="p-2 border-r border-blue-800">Packing Type</th>
                    <th className="p-2 border-r border-blue-800">Description of Goods</th>
                    <th className="p-2 border-r border-blue-800 text-right">Actual Weight</th>
                    <th className="p-2 text-right">Charged Weight</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200 font-medium">
                    <td className="p-2.5 border-r border-slate-200 font-mono font-bold">{bilty.packages}</td>
                    <td className="p-2.5 border-r border-slate-200">{bilty.packageType}</td>
                    <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-800">{bilty.material}</td>
                    <td className="p-2.5 border-r border-slate-200 text-right font-mono">{bilty.weight} {bilty.weightUnit}</td>
                    <td className="p-2.5 text-right font-mono">{bilty.weight} {bilty.weightUnit}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Charges & Driver details row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Driver & Transit notes */}
              <div className="border border-slate-200 rounded p-3 text-xs bg-slate-50">
                <div className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">
                  Transport & Transit Details
                </div>
                <div className="space-y-1 text-slate-600">
                  <div>Transporter: <span className="font-semibold text-slate-800">{bilty.transporter}</span></div>
                  <div>Driver Name: <span className="font-semibold text-slate-800">{bilty.driverName || 'N/A'}</span></div>
                  <div>Driver Mobile: <span className="font-semibold text-slate-800">{bilty.driverMobile || 'N/A'}</span></div>
                  {bilty.remarks && (
                    <div className="mt-2 pt-1 border-t border-slate-200 text-amber-900 font-medium">
                      Remarks: {bilty.remarks}
                    </div>
                  )}
                </div>
              </div>

              {/* Freight Charges Breakdown */}
              <div className="border border-slate-200 rounded p-3 text-xs">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-1 text-slate-600">Freight Charges:</td>
                      <td className="py-1 text-right font-mono font-semibold">{settings.currencySymbol} {bilty.freight.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-600">Loading Charges:</td>
                      <td className="py-1 text-right font-mono">{settings.currencySymbol} {bilty.loadingCharges.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-600">Unloading Charges:</td>
                      <td className="py-1 text-right font-mono">{settings.currencySymbol} {bilty.unloadingCharges.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-600">Statistical / Other:</td>
                      <td className="py-1 text-right font-mono">{settings.currencySymbol} {bilty.otherCharges.toLocaleString()}</td>
                    </tr>
                    <tr className="border-t-2 border-slate-300 font-bold text-slate-900 bg-slate-50">
                      <td className="py-1.5 px-1">Total Amount:</td>
                      <td className="py-1.5 px-1 text-right font-mono text-sm text-blue-900">
                        {settings.currencySymbol} {bilty.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-emerald-700 font-semibold">Paid Amount:</td>
                      <td className="py-1 text-right font-mono font-bold text-emerald-700">
                        {settings.currencySymbol} {bilty.paidAmount.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="font-bold text-rose-700">
                      <td className="py-1">Balance Due:</td>
                      <td className="py-1 text-right font-mono text-sm">
                        {settings.currencySymbol} {bilty.balanceAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="border border-slate-200 rounded p-2.5 text-[10px] text-slate-500 mb-6 bg-slate-50/70">
              <span className="font-bold text-slate-700 block mb-0.5">TERMS & CONDITIONS:</span>
              <p className="leading-tight">{settings.termsAndConditions}</p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-6 text-center text-[11px] font-bold text-slate-800">
              <div className="border-t border-slate-400 pt-1">
                Sender's Signature
              </div>
              <div className="border-t border-slate-400 pt-1">
                Driver's Signature
              </div>
              <div className="border-t border-slate-400 pt-1">
                For {settings.companyName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { X, Printer, Download, Share2, Package, UserCheck, ArrowRight } from 'lucide-react';
import { CompanySettings, Memo } from '../../types';
import { PdfService } from '../../services/pdfService';
import { NativeBridge } from '../../services/nativeBridge';

interface MemoPrintViewProps {
  memo: Memo;
  settings: CompanySettings;
  onClose: () => void;
}

export const MemoPrintView: React.FC<MemoPrintViewProps> = ({ memo, settings, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const handlePdf = () => {
    PdfService.generateMemoPdf(memo, settings);
  };

  const handleShare = async () => {
    const sender = memo.sender || memo.party;
    const receiver = memo.receiver ? ` to ${memo.receiver}` : '';
    await NativeBridge.shareOrPrint(
      `Dispatch Memo #${memo.memoNumber} - ${settings.companyName}`,
      `Dispatch Memo ${memo.memoNumber}: ${sender}${receiver}. Vehicle: ${memo.vehicleNumber}, Driver: ${memo.driver}. Amount: ₹${memo.amount.toLocaleString()}`
    );
  };

  const items = memo.items || [];
  const hasItems = items.length > 0;
  const totalPackages = memo.packages || items.reduce((acc, it) => acc + (Number(it.packages) || 0), 0);
  const totalWeight = memo.weight || items.reduce((acc, it) => acc + (Number(it.weight) || 0), 0);
  const itemsTotalAmount = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-300 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Top Control Bar */}
        <div className="no-print p-3 bg-slate-800 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span>Dispatch Memo Preview:</span>
            <span className="font-mono text-sky-300 font-bold">{memo.memoNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 bg-sky-600 hover:bg-sky-700 text-white px-3 py-1 rounded text-xs font-semibold shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Memo</span>
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

        {/* PRINTABLE MEMO SHEET */}
        <div className="printable-area p-5 sm:p-8 bg-white text-slate-900 text-xs overflow-y-auto flex-1">
          <div className="border-2 border-sky-950 rounded-lg p-5 space-y-4">
            {/* Header */}
            <div className="text-center border-b-2 border-sky-950 pb-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                LORRY HIRE & DISPATCH CHALLAN / MEMO
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-sky-950 tracking-tight">
                {settings.companyName}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {settings.address}, {settings.cityState}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Phone: {settings.mobile} | Email: {settings.email} | GSTIN: <span className="font-mono font-bold text-slate-800">{settings.gstNumber}</span>
              </p>
            </div>

            {/* Memo Details Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-sky-50/80 border border-sky-200 p-2.5 rounded font-mono text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block font-sans uppercase font-bold">Memo Number</span>
                <span className="font-bold text-sky-950 text-sm">{memo.memoNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-sans uppercase font-bold">Date</span>
                <span className="font-bold text-slate-900">{memo.memoDate}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-sans uppercase font-bold">Vehicle Number</span>
                <span className="font-bold text-slate-900">{memo.vehicleNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-sans uppercase font-bold">Driver Name & Mobile</span>
                <span className="font-bold text-slate-900">{memo.driver}</span>
                {memo.driverMobile && <span className="text-[10px] text-slate-600 block">({memo.driverMobile})</span>}
              </div>
            </div>

            {/* SENDER & RECEIVER BOX */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-slate-300 rounded-lg p-3 bg-slate-50/50">
              {/* SENDER */}
              <div className="border-r-0 sm:border-r border-slate-200 pr-0 sm:pr-3">
                <span className="text-[10px] uppercase font-bold text-blue-900 tracking-wider flex items-center gap-1 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                  Sender (Consignor / Bhejne Wala)
                </span>
                <div className="text-sm font-bold text-slate-900">
                  {memo.sender || memo.party || 'Not Specified'}
                </div>
                {memo.senderMobile && (
                  <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                    Phone: {memo.senderMobile}
                  </div>
                )}
                <div className="text-[11px] text-slate-600 mt-0.5">
                  <span className="font-semibold">Station / Origin:</span> {memo.fromCity}
                </div>
              </div>

              {/* RECEIVER */}
              <div className="pl-0 sm:pl-2">
                <span className="text-[10px] uppercase font-bold text-emerald-900 tracking-wider flex items-center gap-1 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                  Receiver (Consignee / Paane Wala)
                </span>
                <div className="text-sm font-bold text-emerald-950">
                  {memo.receiver || 'Self / To Order'}
                </div>
                {memo.receiverMobile && (
                  <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                    Phone: {memo.receiverMobile}
                  </div>
                )}
                <div className="text-[11px] text-slate-600 mt-0.5">
                  <span className="font-semibold">Destination / To:</span> {memo.toCity}
                </div>
              </div>
            </div>

            {/* PRODUCT-WISE CONSIGNMENT TABLE */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-sky-950 text-white font-bold p-2 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 uppercase tracking-wide">
                  <Package className="w-3.5 h-3.5" />
                  <span>Product Entry / Itemized Goods Manifest</span>
                </span>
                <span className="text-[11px] font-mono text-sky-200">
                  Route: {memo.fromCity} &rarr; {memo.toCity}
                </span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 text-[10px] font-bold uppercase">
                  <tr>
                    <th className="py-2 px-2.5 text-center w-8 border-r border-slate-200">#</th>
                    <th className="py-2 px-3 border-r border-slate-200">Product / Material Description</th>
                    <th className="py-2 px-2.5 text-center w-28 border-r border-slate-200">Packages / Qty</th>
                    <th className="py-2 px-2.5 text-right w-32 border-r border-slate-200">Amount ({settings.currencySymbol})</th>
                    <th className="py-2 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {hasItems ? (
                    items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="py-2 px-2.5 text-center font-mono text-slate-500 border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">
                          {item.productName}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono border-r border-slate-200">
                          {item.packages} Pkgs
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                          {Number(item.amount) > 0 ? Number(item.amount).toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">
                          {item.remarks || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-500 border-r border-slate-200">
                        1
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 border-r border-slate-200">
                        {memo.material || 'General Transport Goods'}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono border-r border-slate-200">
                        {memo.packages || 0} Pkgs
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                        {memo.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {memo.remarks || '-'}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                  <tr>
                    <td colSpan={2} className="py-2 px-3 text-right uppercase text-[10px]">
                      Total Manifest Consignment:
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono text-sky-950 border-r border-slate-200">
                      {totalPackages} Pkgs
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-sky-950 text-sm border-r border-slate-200">
                      {settings.currencySymbol} {(hasItems && itemsTotalAmount > 0 ? itemsTotalAmount : memo.amount).toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Attached Bilty List (if any) */}
            {memo.biltyReferences.length > 0 && (
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-slate-100 text-slate-800 font-bold px-3 py-1.5 text-xs flex items-center justify-between border-b border-slate-200">
                  <span className="uppercase text-[10px]">Consolidated Bilties Attached ({memo.biltyReferences.length})</span>
                </div>
                <div className="p-2.5 bg-white flex flex-wrap gap-2">
                  {memo.biltyReferences.map((ref, idx) => (
                    <span key={idx} className="bg-sky-50 border border-sky-300 px-2.5 py-1 rounded font-mono font-bold text-sky-900 text-[11px]">
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Summary */}
            <div className="border border-slate-300 rounded-lg p-4 bg-slate-50">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Total Freight</span>
                  <span className="text-base font-extrabold text-slate-900 font-mono">
                    {settings.currencySymbol} {memo.amount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Advance Paid</span>
                  <span className="text-base font-extrabold text-emerald-700 font-mono">
                    {settings.currencySymbol} {(memo.advanceAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Diesel / Fuel Slip</span>
                  <span className="text-base font-extrabold text-amber-700 font-mono">
                    {settings.currencySymbol} {(memo.dieselAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Balance Payable</span>
                  <span className="text-base font-extrabold text-rose-700 font-mono">
                    {settings.currencySymbol} {(memo.balanceAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {memo.remarks && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 text-slate-700 text-[11px]">
                  <b>Dispatch Instructions / Remarks:</b> {memo.remarks}
                </div>
              )}
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-6 text-center text-[11px] font-bold text-slate-800">
              <div className="border-t border-slate-400 pt-1">
                Driver's Signature
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">{memo.driver}</div>
              </div>
              <div className="border-t border-slate-400 pt-1">
                Loading In-Charge
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">Verified & Dispatched</div>
              </div>
              <div className="border-t border-slate-400 pt-1">
                For {settings.companyName}
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

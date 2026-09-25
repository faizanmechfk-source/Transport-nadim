import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AuditLog,
  Bilty,
  ClosedMonthRecord,
  CompanySettings,
  MatchEntry,
  MedicalEntry,
  MedicalMatchEntry,
  Memo,
  MonthEndSummary,
  Party,
  UserSession,
  Vehicle
} from '../types';

export interface MonthEndAuditPdfOptions {
  monthKey: string;
  settings: CompanySettings;
  bilties: Bilty[];
  memos: Memo[];
  parties: Party[];
  vehicles: Vehicle[];
  medicalEntries?: MedicalEntry[];
  partySummaries: MonthEndSummary[];
  closedRecord?: ClosedMonthRecord;
  currentUser?: UserSession;
  auditNotes?: string;
}

export class PdfService {
  /**
   * Generates a formal Transport Bilty (Lorry Receipt / Consignment Note)
   */
  public static generateBiltyPdf(bilty: Bilty, settings: CompanySettings, copyType: string = 'CONSIGNOR COPY') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Outer Border
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.8);
    doc.rect(8, 8, pageWidth - 16, 280);

    // Header Band
    doc.setFillColor(239, 246, 255);
    doc.rect(8, 8, pageWidth - 16, 28, 'F');

    // Company Name & Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175);
    doc.text(settings.companyName.toUpperCase(), pageWidth / 2, 16, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`${settings.address}, ${settings.cityState} | Phone: ${settings.mobile}`, pageWidth / 2, 22, { align: 'center' });
    doc.text(`GSTIN: ${settings.gstNumber} | Email: ${settings.email}`, pageWidth / 2, 27, { align: 'center' });

    // Document Title Banner
    doc.setFillColor(30, 64, 175);
    doc.rect(8, 36, pageWidth - 16, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`GOODS CONSIGNMENT NOTE / BILTY (${copyType})`, pageWidth / 2, 41.5, { align: 'center' });

    // Metadata Bar
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);

    // Box 1: Bilty details
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(8, 54, pageWidth - 8, 54);

    doc.setFont('helvetica', 'bold');
    doc.text(`BILTY NO: `, 12, 49);
    doc.setTextColor(185, 28, 28);
    doc.text(`${bilty.biltyNumber}`, 32, 49);

    doc.setTextColor(15, 23, 42);
    doc.text(`DATE: `, 75, 49);
    doc.setFont('helvetica', 'normal');
    doc.text(`${bilty.biltyDate}`, 87, 49);

    doc.setFont('helvetica', 'bold');
    doc.text(`PAYMENT TYPE: `, 130, 49);
    doc.setTextColor(bilty.paymentType === 'Paid' ? 22 : 185, bilty.paymentType === 'Paid' ? 101 : 28, 28);
    doc.text(`${bilty.paymentType.toUpperCase()}`, 160, 49);

    // Route & Vehicle
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`FROM:`, 12, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`${bilty.fromCity.toUpperCase()}`, 26, 60);

    doc.setFont('helvetica', 'bold');
    doc.text(`TO:`, 75, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`${bilty.toCity.toUpperCase()}`, 83, 60);

    doc.setFont('helvetica', 'bold');
    doc.text(`VEHICLE NO:`, 130, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`${bilty.vehicleNumber}`, 155, 60);

    doc.line(8, 64, pageWidth - 8, 64);

    // Party Information Grid
    doc.setFillColor(248, 250, 252);
    doc.rect(8, 64, (pageWidth - 16) / 2, 28, 'F');
    doc.rect(8 + (pageWidth - 16) / 2, 64, (pageWidth - 16) / 2, 28, 'F');
    doc.line(pageWidth / 2, 64, pageWidth / 2, 92);
    doc.line(8, 92, pageWidth - 8, 92);

    // Consignor
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`CONSIGNOR (SENDER):`, 12, 70);
    doc.setFontSize(9.5);
    doc.text(`${bilty.consignor}`, 12, 76);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`From: ${bilty.fromCity}`, 12, 82);

    // Consignee
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`CONSIGNEE (RECEIVER):`, pageWidth / 2 + 4, 70);
    doc.setFontSize(9.5);
    doc.text(`${bilty.consignee}`, pageWidth / 2 + 4, 76);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`To: ${bilty.toCity}`, pageWidth / 2 + 4, 82);

    // Goods Description Table
    autoTable(doc, {
      startY: 96,
      margin: { left: 10, right: 10 },
      head: [['Packages', 'Packing Type', 'Description of Goods', 'Actual Weight', 'Charged Weight']],
      body: [
        [
          bilty.packages.toString(),
          bilty.packageType,
          bilty.material,
          `${bilty.weight} ${bilty.weightUnit}`,
          `${bilty.weight} ${bilty.weightUnit}`,
        ],
      ],
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 4,
      },
    });

    // Charges Table
    const lastY = (doc as any).lastAutoTable.finalY + 6;

    autoTable(doc, {
      startY: lastY,
      margin: { left: pageWidth / 2, right: 10 },
      body: [
        ['Basic Freight Charges:', `${settings.currencySymbol} ${bilty.freight.toLocaleString()}`],
        ['Loading Charges:', `${settings.currencySymbol} ${bilty.loadingCharges.toLocaleString()}`],
        ['Unloading Charges:', `${settings.currencySymbol} ${bilty.unloadingCharges.toLocaleString()}`],
        ['Statistical & Other Charges:', `${settings.currencySymbol} ${bilty.otherCharges.toLocaleString()}`],
        ['Total Freight Amount:', `${settings.currencySymbol} ${bilty.totalAmount.toLocaleString()}`],
        ['Paid Amount:', `${settings.currencySymbol} ${bilty.paidAmount.toLocaleString()}`],
        ['Balance Amount Due:', `${settings.currencySymbol} ${bilty.balanceAmount.toLocaleString()}`],
      ],
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'right' },
        1: { halign: 'right', fontStyle: 'bold' },
      },
    });

    // Driver & Transporter notes on the left side
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('DRIVER & DISPATCH DETAILS', 12, lastY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Driver Name: ${bilty.driverName || 'N/A'}`, 12, lastY + 10);
    doc.text(`Mobile: ${bilty.driverMobile || 'N/A'}`, 12, lastY + 15);
    doc.text(`Transporter: ${bilty.transporter}`, 12, lastY + 20);
    if (bilty.remarks) {
      doc.text(`Remarks: ${bilty.remarks}`, 12, lastY + 26, { maxWidth: pageWidth / 2 - 20 });
    }

    // Terms & Conditions Box
    const termsY = 210;
    doc.setDrawColor(226, 232, 240);
    doc.rect(10, termsY, pageWidth - 20, 32);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('TERMS & CONDITIONS:', 12, termsY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(settings.termsAndConditions, 12, termsY + 10, { maxWidth: pageWidth - 24, lineHeightFactor: 1.3 });

    // Signature Block
    const signY = 252;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.line(12, signY + 18, 55, signY + 18);
    doc.text("Sender's Signature", 14, signY + 22);

    doc.line(75, signY + 18, 125, signY + 18);
    doc.text("Driver's Signature", 80, signY + 22);

    doc.line(pageWidth - 65, signY + 18, pageWidth - 15, signY + 18);
    doc.text(`For ${settings.companyName}`, pageWidth - 65, signY + 22);

    doc.save(`Bilty_${bilty.biltyNumber}.pdf`);
  }

  /**
   * Generates Transport Memo PDF
   */
  public static generateMemoPdf(memo: Memo, settings: CompanySettings) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175);
    doc.text(settings.companyName.toUpperCase(), pageWidth / 2, 16, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${settings.address}, ${settings.cityState} | Phone: ${settings.mobile} | GSTIN: ${settings.gstNumber}`, pageWidth / 2, 22, { align: 'center' });

    doc.setFillColor(30, 64, 175);
    doc.rect(10, 27, pageWidth - 20, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text('LORRY HIRE CHALLAN / DISPATCH MEMO', pageWidth / 2, 32, { align: 'center' });

    const senderDisplay = memo.sender || memo.party || 'N/A';
    const senderText = memo.senderMobile ? `${senderDisplay} (Ph: ${memo.senderMobile})` : senderDisplay;
    const receiverDisplay = memo.receiver || 'Self / To Order';
    const receiverText = memo.receiverMobile ? `${receiverDisplay} (Ph: ${memo.receiverMobile})` : receiverDisplay;
    const driverText = memo.driverMobile ? `${memo.driver} (Ph: ${memo.driverMobile})` : memo.driver;

    // Memo Meta & Parties Table
    autoTable(doc, {
      startY: 37,
      margin: { left: 10, right: 10 },
      body: [
        ['Memo Number:', memo.memoNumber, 'Memo Date:', memo.memoDate],
        ['Sender (Consignor):', senderText, 'Receiver (Consignee):', receiverText],
        ['Vehicle Number:', memo.vehicleNumber, 'Driver Name:', driverText],
        ['Origin Station:', memo.fromCity, 'Destination Station:', memo.toCity],
      ],
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 38 },
        1: { cellWidth: 57 },
        2: { fontStyle: 'bold', cellWidth: 38 },
        3: { cellWidth: 57 },
      },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 4;

    // Product-Wise Itemized Consignment Table
    const items = memo.items || [];
    const hasItems = items.length > 0;

    const itemTableBody = hasItems
      ? items.map((it, idx) => [
          (idx + 1).toString(),
          it.productName,
          `${it.packages} Pkgs`,
          `${settings.currencySymbol} ${(Number(it.amount) || 0).toLocaleString()}`,
          it.remarks || '-',
        ])
      : [
          [
            '1',
            memo.material || 'General Transport Consignment',
            `${memo.packages || 0} Pkgs`,
            `${settings.currencySymbol} ${memo.amount.toLocaleString()}`,
            memo.remarks || '-',
          ],
        ];

    const totalPkgs = memo.packages || items.reduce((acc, it) => acc + (Number(it.packages) || 0), 0);
    const totalAmt = hasItems && items.length > 0 ? items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0) : memo.amount;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 64, 175);
    doc.text('ITEMIZED GOODS / PRODUCT MANIFEST', 10, currentY);

    autoTable(doc, {
      startY: currentY + 1.5,
      margin: { left: 10, right: 10 },
      head: [['#', 'Product / Material Description', 'Packages / Qty', 'Amount', 'Remarks']],
      body: itemTableBody,
      foot: [
        [
          'Total:',
          'Consignment Total Summary',
          `${totalPkgs} Pkgs`,
          `${settings.currencySymbol} ${totalAmt.toLocaleString()}`,
          '',
        ],
      ],
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.2 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 80, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 32, fontStyle: 'bold' },
        4: { cellWidth: 38 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // Financial Breakdown Table
    autoTable(doc, {
      startY: currentY,
      margin: { left: 10, right: 10 },
      body: [
        [
          'Total Freight Amount:',
          `${settings.currencySymbol} ${memo.amount.toLocaleString()}`,
          'Advance Paid to Driver:',
          `${settings.currencySymbol} ${(memo.advanceAmount || 0).toLocaleString()}`,
        ],
        [
          'Diesel / Fuel Slip:',
          `${settings.currencySymbol} ${(memo.dieselAmount || 0).toLocaleString()}`,
          'Net Balance Payable:',
          `${settings.currencySymbol} ${(memo.balanceAmount || 0).toLocaleString()}`,
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45 },
        1: { cellWidth: 50, fontStyle: 'bold' },
        2: { fontStyle: 'bold', cellWidth: 45 },
        3: { cellWidth: 50, fontStyle: 'bold', textColor: [185, 28, 28] },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // Attached Bilties & Remarks
    if (memo.biltyReferences.length > 0 || memo.remarks) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      if (memo.biltyReferences.length > 0) {
        doc.text(`Associated Bilty Reference(s): ${memo.biltyReferences.join(', ')}`, 10, currentY);
        currentY += 4.5;
      }
      if (memo.remarks) {
        doc.text(`Dispatch Instructions / Remarks: ${memo.remarks}`, 10, currentY);
        currentY += 4.5;
      }
    }

    // Signatures
    const signY = Math.max(currentY + 12, 255);
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.line(15, signY, 65, signY);
    doc.text("Driver's Signature", 22, signY + 4.5);

    doc.line(pageWidth - 75, signY, pageWidth - 15, signY);
    doc.text(`For ${settings.companyName}`, pageWidth - 70, signY + 4.5);

    doc.save(`Memo_${memo.memoNumber}.pdf`);
  }

  /**
   * Generates Medical Transport Entry PDF
   */
  public static generateMedicalPdf(entry: MedicalEntry, settings: CompanySettings) {
    return this.generateMedicalEntryPdf(entry, settings);
  }

  public static generateMedicalEntryPdf(entry: MedicalEntry, settings: CompanySettings) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 118, 110);
    doc.text(settings.companyName.toUpperCase(), pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Healthcare & Pharma Logistics Division | Contact: ${settings.mobile}`, pageWidth / 2, 24, { align: 'center' });

    doc.setFillColor(15, 118, 110);
    doc.rect(10, 28, pageWidth - 20, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('MEDICAL CONSIGNMENT & TRANSIT ENTRY', pageWidth / 2, 33.5, { align: 'center' });

    autoTable(doc, {
      startY: 40,
      margin: { left: 10, right: 10 },
      body: [
        ['Entry Number:', entry.entryNumber, 'Entry Date:', entry.date],
        ['Hospital/Party:', entry.party, 'Patient/Ref Name:', entry.patientReference],
        ['Medical Item:', entry.medicalItem, 'Quantity:', entry.quantity.toString()],
        ['Batch Number:', entry.batchNumber, 'Consignment Value:', `${settings.currencySymbol} ${entry.amount.toLocaleString()}`],
        ['Transport/Bilty Ref:', entry.transportBiltyNumber || 'N/A', 'Remarks:', entry.remarks || 'Standard pharmaceutical handling'],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35 },
        2: { fontStyle: 'bold', cellWidth: 35 },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text('Received by Pharmacist / Ward Store: _________________', 15, finalY);
    doc.text('Transport Officer Signature: _________________', pageWidth - 85, finalY);

    doc.save(`Medical_Entry_${entry.entryNumber}.pdf`);
  }

  /**
   * Generates Match-Up Discrepancy Report PDF
   */
  public static generateMatchUpPdf(entries: MatchEntry[], title: string, settings: CompanySettings) {
    return this.generateMatchupReportPdf(entries, title, settings);
  }

  public static generateMatchupReportPdf(entries: MatchEntry[], title: string, settings: CompanySettings) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.text(settings.companyName.toUpperCase(), pageWidth / 2, 14, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`ENTRIES RECONCILIATION & MATCH-UP REPORT: ${title.toUpperCase()}`, pageWidth / 2, 20, { align: 'center' });

    const rows = entries.map((e) => [
      e.biltyNumber,
      e.date,
      e.partyA,
      e.vehicleA,
      `${settings.currencySymbol}${e.amountA.toLocaleString()}`,
      e.partyB,
      e.vehicleB,
      `${settings.currencySymbol}${e.amountB.toLocaleString()}`,
      e.status,
      e.diffNotes.join('; '),
      e.isVerified ? 'Verified' : 'Pending',
    ]);

    autoTable(doc, {
      startY: 25,
      margin: { left: 8, right: 8 },
      head: [['Bilty #', 'Date', 'Set A Party', 'Set A Veh', 'Set A Amt', 'Set B Party', 'Set B Veh', 'Set B Amt', 'Status', 'Discrepancy Notes', 'Verify']],
      body: rows,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    });

    doc.save(`Matchup_Report_${Date.now()}.pdf`);
  }

  /**
   * Generates Month End Statement PDF
   */
  public static generateMonthEndPdf(summaries: MonthEndSummary[], monthKey: string, settings: CompanySettings) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(30, 64, 175);
    doc.text(settings.companyName.toUpperCase(), pageWidth / 2, 14, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`MONTH END STATEMENT & PARTY OUTSTANDING - ${monthKey}`, pageWidth / 2, 20, { align: 'center' });

    const rows = summaries.map((s) => [
      s.partyName,
      `${settings.currencySymbol}${s.openingBalance.toLocaleString()}`,
      s.totalEntries.toString(),
      `${settings.currencySymbol}${s.totalFreight.toLocaleString()}`,
      `${settings.currencySymbol}${s.totalCharges.toLocaleString()}`,
      `${settings.currencySymbol}${s.totalBiltyAmount.toLocaleString()}`,
      `${settings.currencySymbol}${s.totalPaid.toLocaleString()}`,
      `${settings.currencySymbol}${s.totalPending.toLocaleString()}`,
      `${settings.currencySymbol}${s.closingBalance.toLocaleString()}`,
      s.isClosed ? 'LOCKED' : 'OPEN',
    ]);

    autoTable(doc, {
      startY: 25,
      margin: { left: 8, right: 8 },
      head: [
        [
          'Party Name',
          'Opening Bal',
          'Entries',
          'Freight',
          'Charges',
          'Total Bilty',
          'Total Paid',
          'Pending',
          'Closing Bal',
          'Status',
        ],
      ],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    });

    doc.save(`MonthEnd_Statement_${monthKey}.pdf`);
  }

  /**
   * Generates a Comprehensive Consolidated Month-End Financial & Logistical Audit PDF
   * Multi-page official audit document formatted for statutory, banking, and management review.
   */
  public static generateMonthEndConsolidatedAuditPdf(options: MonthEndAuditPdfOptions) {
    const {
      monthKey,
      settings,
      bilties,
      memos,
      parties,
      vehicles,
      medicalEntries = [],
      partySummaries,
      closedRecord,
      currentUser,
      auditNotes,
    } = options;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Parse Month Name
    const [yearStr, monthStr] = monthKey.split('-');
    const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
    const monthName = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' })
      : monthKey;

    // Filter active records for the month
    const monthBilties = bilties.filter((b) => b.biltyDate && b.biltyDate.startsWith(monthKey) && !b.isDeleted);
    const monthMemos = memos.filter((m) => m.memoDate && m.memoDate.startsWith(monthKey) && !m.isDeleted);
    const monthMedicals = medicalEntries.filter(
      (m) => ((m.entryDate || m.date) || '').startsWith(monthKey) && !m.isDeleted
    );

    // Financial Metrics
    const totalBiltiesCount = monthBilties.length;
    const totalFreight = monthBilties.reduce((sum, b) => sum + (b.freight || 0), 0);
    const totalCharges = monthBilties.reduce(
      (sum, b) => sum + (b.loadingCharges || 0) + (b.unloadingCharges || 0) + (b.otherCharges || 0),
      0
    );
    const totalGst = monthBilties.reduce((sum, b) => sum + (b.serviceTaxGst || 0), 0);
    const totalBiltyAmount = monthBilties.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalPaid = monthBilties.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const totalBalance = monthBilties.reduce((sum, b) => sum + (b.balanceAmount || 0), 0);
    const collectionEfficiency =
      totalBiltyAmount > 0 ? ((totalPaid / totalBiltyAmount) * 100).toFixed(1) : '100.0';

    // Memo Metrics
    const totalMemosCount = monthMemos.length;
    const totalMemoAmount = monthMemos.reduce((sum, m) => sum + (m.amount || 0), 0);
    const totalAdvance = monthMemos.reduce((sum, m) => sum + (m.advanceAmount || 0), 0);
    const totalDiesel = monthMemos.reduce((sum, m) => sum + (m.dieselAmount || 0), 0);
    const totalMemoBalance = monthMemos.reduce((sum, m) => sum + (m.balanceAmount || 0), 0);

    // Logistical Metrics
    const totalWeightKg = monthBilties.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);
    const totalWeightTons = (totalWeightKg / 1000).toFixed(2);
    const totalPackages = monthBilties.reduce((sum, b) => sum + (Number(b.packages) || 0), 0);

    // Payment Mode Breakdown
    const paidModeBilties = monthBilties.filter((b) => b.paymentType === 'Paid');
    const toPayModeBilties = monthBilties.filter((b) => b.paymentType === 'To-Pay');
    const tbbModeBilties = monthBilties.filter((b) => b.paymentType === 'T.B.B.');

    // Route breakdown
    const routeMap: Record<string, { trips: number; weight: number; freight: number }> = {};
    monthBilties.forEach((b) => {
      const key = `${b.fromCity || 'Unknown'} -> ${b.toCity || 'Unknown'}`;
      if (!routeMap[key]) routeMap[key] = { trips: 0, weight: 0, freight: 0 };
      routeMap[key].trips += 1;
      routeMap[key].weight += Number(b.weight) || 0;
      routeMap[key].freight += Number(b.totalAmount) || 0;
    });
    const topRoutes = Object.entries(routeMap)
      .sort((a, b) => b[1].freight - a[1].freight)
      .slice(0, 6);

    // Fleet utilization breakdown
    const fleetMap: Record<string, { trips: number; freight: number; weight: number }> = {};
    monthBilties.forEach((b) => {
      const veh = b.vehicleNumber?.trim().toUpperCase() || 'OTHER';
      if (!fleetMap[veh]) fleetMap[veh] = { trips: 0, freight: 0, weight: 0 };
      fleetMap[veh].trips += 1;
      fleetMap[veh].freight += Number(b.totalAmount) || 0;
      fleetMap[veh].weight += Number(b.weight) || 0;
    });
    const topFleet = Object.entries(fleetMap)
      .sort((a, b) => b[1].trips - a[1].trips)
      .slice(0, 6);

    const isClosed = !!closedRecord;
    const auditRef = `AUD-${monthKey.replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const currSym = settings.currencySymbol || '₹';

    // -------------------------------------------------------------
    // PAGE 1: EXECUTIVE AUDIT DOSSIER & FINANCIAL-LOGISTICAL OVERVIEW
    // -------------------------------------------------------------

    // Top Header Ribbon
    doc.setFillColor(30, 64, 175);
    doc.rect(10, 8, pageWidth - 20, 2, 'F');

    // Company Name & Identity
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175);
    doc.text(settings.companyName.toUpperCase(), pageWidth / 2, 16, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `${settings.address}, ${settings.cityState} | Phone: ${settings.mobile} | Email: ${settings.email}`,
      pageWidth / 2,
      21,
      { align: 'center' }
    );
    doc.text(
      `GSTIN: ${settings.gstNumber} | PAN: ${settings.panNumber || 'N/A'} | Bank: ${settings.bankName || 'SBI'} A/C: ${settings.bankAccountNumber || 'N/A'} (IFSC: ${settings.bankIfsc || 'N/A'})`,
      pageWidth / 2,
      25.5,
      { align: 'center' }
    );

    // Title Banner
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, 28, pageWidth - 20, 11, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `CONSOLIDATED MONTH-END AUDIT REPORT & FINANCIAL-LOGISTICAL SUMMARY - ${monthName.toUpperCase()}`,
      14,
      35
    );

    // Status Pill on Title Banner
    if (isClosed) {
      doc.setFillColor(220, 252, 231);
      doc.setDrawColor(134, 239, 172);
      doc.roundedRect(pageWidth - 62, 30.5, 50, 6, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(21, 128, 61);
      doc.text(`[LOCKED & AUDITED]`, pageWidth - 37, 34.8, { align: 'center' });
    } else {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(252, 211, 77);
      doc.roundedRect(pageWidth - 62, 30.5, 50, 6, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(180, 83, 9);
      doc.text(`[PROVISIONAL / OPEN]`, pageWidth - 37, 34.8, { align: 'center' });
    }

    // Metadata Bar
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const metaY = 43;
    doc.text(`Audit Dossier Ref: ${auditRef}`, 12, metaY);
    doc.text(`Month Period: ${monthKey} (${monthName})`, 80, metaY);
    doc.text(`Generated At: ${new Date().toLocaleString()}`, 155, metaY);
    doc.text(`Audited / Extracted By: ${currentUser?.name || 'Administrator'} (${currentUser?.role || 'Admin'})`, 225, metaY);

    // Section 1: Financial & Logistics Executive Summary Table
    autoTable(doc, {
      startY: 46,
      margin: { left: 10, right: 10 },
      head: [
        [
          '1. REVENUE & BILLING AUDIT',
          '2. COLLECTIONS & RECEIVABLES',
          '3. LOGISTICAL DISPATCH & FLEET',
          '4. OPERATIONAL MARGIN & STATUTORY',
        ],
      ],
      body: [
        [
          `Total Bilties Booked: ${totalBiltiesCount}\nGross Freight: ${currSym} ${totalFreight.toLocaleString()}\nLoading & Handling: ${currSym} ${totalCharges.toLocaleString()}\nTotal Invoice Gross: ${currSym} ${totalBiltyAmount.toLocaleString()}`,
          `Total Realized / Paid: ${currSym} ${totalPaid.toLocaleString()}\nOutstanding Receivables: ${currSym} ${totalBalance.toLocaleString()}\nCollection Efficiency: ${collectionEfficiency}%\nPayment Dues Rate: ${(100 - parseFloat(collectionEfficiency)).toFixed(1)}%`,
          `Dispatch Trips (Memos): ${totalMemosCount}\nTotal Weight: ${totalWeightTons} Tonnes\nTotal Packages: ${totalPackages.toLocaleString()} Pkgs\nActive Fleet Vehicles: ${Object.keys(fleetMap).length}`,
          `Outward Memo Value: ${currSym} ${totalMemoAmount.toLocaleString()}\nDriver Advance Paid: ${currSym} ${totalAdvance.toLocaleString()}\nFuel / Diesel Outlay: ${currSym} ${totalDiesel.toLocaleString()}\nGST Assessed: ${currSym} ${totalGst.toLocaleString()} (RCM)`,
        ],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 2.2,
      },
      styles: {
        fontSize: 7.8,
        cellPadding: 3,
        textColor: [15, 23, 42],
        lineColor: [203, 213, 225],
      },
      columnStyles: {
        0: { cellWidth: (pageWidth - 20) / 4 },
        1: { cellWidth: (pageWidth - 20) / 4 },
        2: { cellWidth: (pageWidth - 20) / 4 },
        3: { cellWidth: (pageWidth - 20) / 4 },
      },
    });

    const s1FinalY = (doc as any).lastAutoTable.finalY + 4;

    // Payment Mode Breakdown Banner
    autoTable(doc, {
      startY: s1FinalY,
      margin: { left: 10, right: 10 },
      head: [['PAYMENT MODE BREAKDOWN', 'CONSIGNMENT COUNT', 'TOTAL BILLED AMOUNT', 'PAID REVENUE', 'PENDING BALANCE', '% REVENUE SHARE']],
      body: [
        [
          'Paid Consignments (Advance / Spot)',
          paidModeBilties.length.toString(),
          `${currSym} ${paidModeBilties.reduce((s, b) => s + b.totalAmount, 0).toLocaleString()}`,
          `${currSym} ${paidModeBilties.reduce((s, b) => s + b.paidAmount, 0).toLocaleString()}`,
          `${currSym} ${paidModeBilties.reduce((s, b) => s + b.balanceAmount, 0).toLocaleString()}`,
          totalBiltyAmount > 0 ? `${((paidModeBilties.reduce((s, b) => s + b.totalAmount, 0) / totalBiltyAmount) * 100).toFixed(1)}%` : '0%',
        ],
        [
          'To-Pay Consignments (Destination Collect)',
          toPayModeBilties.length.toString(),
          `${currSym} ${toPayModeBilties.reduce((s, b) => s + b.totalAmount, 0).toLocaleString()}`,
          `${currSym} ${toPayModeBilties.reduce((s, b) => s + b.paidAmount, 0).toLocaleString()}`,
          `${currSym} ${toPayModeBilties.reduce((s, b) => s + b.balanceAmount, 0).toLocaleString()}`,
          totalBiltyAmount > 0 ? `${((toPayModeBilties.reduce((s, b) => s + b.totalAmount, 0) / totalBiltyAmount) * 100).toFixed(1)}%` : '0%',
        ],
        [
          'T.B.B. (To Be Billed / Credit Ledger)',
          tbbModeBilties.length.toString(),
          `${currSym} ${tbbModeBilties.reduce((s, b) => s + b.totalAmount, 0).toLocaleString()}`,
          `${currSym} ${tbbModeBilties.reduce((s, b) => s + b.paidAmount, 0).toLocaleString()}`,
          `${currSym} ${tbbModeBilties.reduce((s, b) => s + b.balanceAmount, 0).toLocaleString()}`,
          totalBiltyAmount > 0 ? `${((tbbModeBilties.reduce((s, b) => s + b.totalAmount, 0) / totalBiltyAmount) * 100).toFixed(1)}%` : '0%',
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2 },
      styles: { fontSize: 7.2, cellPadding: 2 },
    });

    const s2FinalY = (doc as any).lastAutoTable.finalY + 4;

    // Two Side-by-side Tables: Top Corridors & Fleet Utilization
    const halfWidth = (pageWidth - 24) / 2;

    // Left Table: Top Corridors
    autoTable(doc, {
      startY: s2FinalY,
      margin: { left: 10, right: pageWidth - 10 - halfWidth },
      tableWidth: halfWidth,
      head: [['TOP FREIGHT CORRIDORS / ROUTES', 'TRIPS', 'WEIGHT', 'TOTAL FREIGHT']],
      body:
        topRoutes.length > 0
          ? topRoutes.map(([r, d]) => [
              r,
              d.trips.toString(),
              `${(d.weight / 1000).toFixed(1)} T`,
              `${currSym} ${d.freight.toLocaleString()}`,
            ])
          : [['No corridor data for period', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 7.2, fontStyle: 'bold', cellPadding: 2 },
      styles: { fontSize: 7, cellPadding: 1.8 },
      columnStyles: {
        0: { cellWidth: halfWidth * 0.44 },
        1: { cellWidth: halfWidth * 0.16, halign: 'center' },
        2: { cellWidth: halfWidth * 0.18, halign: 'right' },
        3: { cellWidth: halfWidth * 0.22, halign: 'right', fontStyle: 'bold' },
      },
    });

    // Right Table: Fleet Usage
    autoTable(doc, {
      startY: s2FinalY,
      margin: { left: 14 + halfWidth, right: 10 },
      tableWidth: halfWidth,
      head: [['FLEET VEHICLE UTILIZATION', 'TRIPS', 'WEIGHT', 'FREIGHT VOLUME']],
      body:
        topFleet.length > 0
          ? topFleet.map(([v, d]) => [
              v,
              d.trips.toString(),
              `${(d.weight / 1000).toFixed(1)} T`,
              `${currSym} ${d.freight.toLocaleString()}`,
            ])
          : [['No fleet movement for period', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [67, 56, 202], textColor: 255, fontSize: 7.2, fontStyle: 'bold', cellPadding: 2 },
      styles: { fontSize: 7, cellPadding: 1.8 },
      columnStyles: {
        0: { cellWidth: halfWidth * 0.44 },
        1: { cellWidth: halfWidth * 0.16, halign: 'center' },
        2: { cellWidth: halfWidth * 0.18, halign: 'right' },
        3: { cellWidth: halfWidth * 0.22, halign: 'right', fontStyle: 'bold' },
      },
    });

    // Medical cargo note if any
    const finalPage1Y = (doc as any).lastAutoTable.finalY + 5;
    if (monthMedicals.length > 0 && finalPage1Y < pageHeight - 15) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `* Specialized Medical Logistics: ${monthMedicals.length} temperature/pharma consignments dispatched (${currSym} ${monthMedicals.reduce((s, m) => s + (m.amount || 0), 0).toLocaleString()}).`,
        12,
        finalPage1Y
      );
    }

    // -------------------------------------------------------------
    // PAGE 2: PARTY-WISE FINANCIAL LEDGER & AUDIT RECONCILIATION
    // -------------------------------------------------------------
    doc.addPage('a4', 'landscape');

    // Page 2 Header Band
    doc.setFillColor(30, 64, 175);
    doc.rect(10, 8, pageWidth - 20, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text(
      `AUDIT SECTION 2: PARTY-WISE FINANCIAL LEDGER & RECEIVABLES RECONCILIATION (${monthName.toUpperCase()})`,
      12,
      15
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Audit Statement of all client ledger accounts, opening balances, month freight bookings, collections, and closing dues.`,
      12,
      19
    );

    const partyRows = partySummaries.map((s, idx) => [
      (idx + 1).toString(),
      s.partyName,
      `${currSym} ${s.openingBalance.toLocaleString()}`,
      s.totalEntries.toString(),
      `${currSym} ${s.totalFreight.toLocaleString()}`,
      `${currSym} ${s.totalCharges.toLocaleString()}`,
      `${currSym} ${s.totalBiltyAmount.toLocaleString()}`,
      `${currSym} ${s.totalPaid.toLocaleString()}`,
      `${currSym} ${s.totalPending.toLocaleString()}`,
      `${currSym} ${s.closingBalance.toLocaleString()}`,
      s.isClosed ? 'LOCKED' : s.totalPending === 0 ? 'CLEARED' : 'PENDING',
    ]);

    const totalOpening = partySummaries.reduce((sum, s) => sum + s.openingBalance, 0);
    const totalClosing = partySummaries.reduce((sum, s) => sum + s.closingBalance, 0);
    const totalEntriesSum = partySummaries.reduce((sum, s) => sum + s.totalEntries, 0);

    autoTable(doc, {
      startY: 22,
      margin: { left: 10, right: 10 },
      head: [
        [
          '#',
          'PARTY / CLIENT NAME',
          'OPENING BAL',
          'ENTRIES',
          'FREIGHT',
          'CHARGES',
          'TOTAL BILLED',
          'COLLECTIONS',
          'PENDING DUE',
          'CLOSING BAL',
          'AUDIT STATUS',
        ],
      ],
      body: partyRows,
      foot: [
        [
          'TOTAL',
          `Grand Total (${partySummaries.length} Parties)`,
          `${currSym} ${totalOpening.toLocaleString()}`,
          totalEntriesSum.toString(),
          `${currSym} ${totalFreight.toLocaleString()}`,
          `${currSym} ${totalCharges.toLocaleString()}`,
          `${currSym} ${totalBiltyAmount.toLocaleString()}`,
          `${currSym} ${totalPaid.toLocaleString()}`,
          `${currSym} ${totalBalance.toLocaleString()}`,
          `${currSym} ${totalClosing.toLocaleString()}`,
          isClosed ? 'ALL LOCKED' : 'AUDITED',
        ],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 2.2,
      },
      footStyles: {
        fillColor: [239, 246, 255],
        textColor: [30, 64, 175],
        fontSize: 7.8,
        fontStyle: 'bold',
        cellPadding: 2.2,
      },
      styles: {
        fontSize: 7.2,
        cellPadding: 2,
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 58, fontStyle: 'bold' },
        2: { cellWidth: 23, halign: 'right' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 23, halign: 'right' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
        7: { cellWidth: 24, halign: 'right' },
        8: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] },
        9: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        10: { cellWidth: 26, halign: 'center' },
      },
    });

    // -------------------------------------------------------------
    // PAGE 3: OUTWARD DISPATCH MANIFEST & AUDIT ATTESTATION BLOCK
    // -------------------------------------------------------------
    doc.addPage('a4', 'landscape');

    // Page 3 Header Band
    doc.setFillColor(30, 64, 175);
    doc.rect(10, 8, pageWidth - 20, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text(
      `AUDIT SECTION 3: OUTWARD DISPATCH LOGISTICS REGISTER & AUDIT ATTESTATION`,
      12,
      15
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Reconciliation of dispatched truck load memos, driver trip advances, diesel fuel accounts, and auditor attestation.`,
      12,
      19
    );

    // Memos Table
    const memoRows = monthMemos.map((m, idx) => [
      (idx + 1).toString(),
      m.memoNumber,
      m.memoDate,
      m.vehicleNumber,
      m.driver,
      `${m.fromCity} -> ${m.toCity}`,
      m.biltyReferences?.length ? `${m.biltyReferences.length} BTs` : 'Direct',
      `${currSym} ${m.amount.toLocaleString()}`,
      `${currSym} ${(m.advanceAmount || 0).toLocaleString()}`,
      `${currSym} ${(m.dieselAmount || 0).toLocaleString()}`,
      `${currSym} ${(m.balanceAmount || 0).toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: 22,
      margin: { left: 10, right: 10 },
      head: [
        [
          '#',
          'MEMO #',
          'DATE',
          'VEHICLE #',
          'DRIVER',
          'ROUTE (FROM -> TO)',
          'BILTY REFS',
          'MEMO FARE',
          'ADVANCE',
          'DIESEL',
          'BALANCE DUE',
        ],
      ],
      body:
        memoRows.length > 0
          ? memoRows
          : [['-', 'No dispatch memos recorded in this period', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
      foot: [
        [
          'TOTAL',
          `${totalMemosCount} Memos`,
          '',
          '',
          '',
          '',
          'Grand Total:',
          `${currSym} ${totalMemoAmount.toLocaleString()}`,
          `${currSym} ${totalAdvance.toLocaleString()}`,
          `${currSym} ${totalDiesel.toLocaleString()}`,
          `${currSym} ${totalMemoBalance.toLocaleString()}`,
        ],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: 255,
        fontSize: 7.2,
        fontStyle: 'bold',
        cellPadding: 2,
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 2,
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.8,
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 20, fontStyle: 'bold' },
        2: { cellWidth: 20 },
        3: { cellWidth: 26, fontStyle: 'bold' },
        4: { cellWidth: 32 },
        5: { cellWidth: 42 },
        6: { cellWidth: 22, halign: 'center' },
        7: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 24, halign: 'right' },
        9: { cellWidth: 24, halign: 'right' },
        10: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      },
    });

    // -------------------------------------------------------------
    // AUDITOR ATTESTATION & STATUTORY DECLARATION (Bottom of Page 3)
    // -------------------------------------------------------------
    const memoFinalY = Math.min((doc as any).lastAutoTable.finalY + 6, pageHeight - 65);

    // Attestation Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, memoFinalY, pageWidth - 20, 22, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 64, 175);
    doc.text(`INTERNAL AUDIT ATTESTATION & STATUTORY TRANSPORT COMPLIANCE DECLARATION:`, 14, memoFinalY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    const notesText =
      auditNotes ||
      `1. We hereby certify that the consignment register, dispatch manifests, party ledgers, and cash/bank vouchers for ${monthName} have been examined and found in mutual agreement.\n2. Goods are accepted and carried strictly under Goods Carriage conditions. GST liability on freight is accounted under Reverse Charge Mechanism (RCM Notification 13/2017) or forward charge.\n3. Driver trip advances and fuel adjustments have been verified against physical petrol pump vouchers and signed driver trip sheets.`;

    const splitNotes = doc.splitTextToSize(notesText, pageWidth - 28);
    doc.text(splitNotes, 14, memoFinalY + 10);

    // 3 Sign-Off Boxes
    const signBoxY = memoFinalY + 25;
    const boxWidth = (pageWidth - 28) / 3;

    // Sign Box 1: Prepared By
    doc.setDrawColor(203, 213, 225);
    doc.rect(10, signBoxY, boxWidth, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('PREPARED & RECONCILED BY', 13, signBoxY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Billing In-Charge / Chief Booking Clerk', 13, signBoxY + 9);
    doc.text(`Name: ${currentUser?.name || 'Accounts Officer'}`, 13, signBoxY + 14);
    doc.line(13, signBoxY + 20, 10 + boxWidth - 8, signBoxY + 20);
    doc.text('Signature & Date', 13, signBoxY + 23);

    // Sign Box 2: Verified By
    doc.rect(14 + boxWidth, signBoxY, boxWidth, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('REVIEWED & AUDITED BY', 17 + boxWidth, signBoxY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Internal Transport Auditor / Controller', 17 + boxWidth, signBoxY + 9);
    doc.text(`Status: ${isClosed ? 'Verified & Locked' : 'Audit In-Progress'}`, 17 + boxWidth, signBoxY + 14);
    doc.line(17 + boxWidth, signBoxY + 20, 14 + 2 * boxWidth - 8, signBoxY + 20);
    doc.text('Auditor Seal & Signature', 17 + boxWidth, signBoxY + 23);

    // Sign Box 3: Authorized Signatory
    doc.rect(18 + 2 * boxWidth, signBoxY, boxWidth, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`FOR ${settings.companyName.toUpperCase()}`, 21 + 2 * boxWidth, signBoxY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Managing Director / Authorized Signatory', 21 + 2 * boxWidth, signBoxY + 9);
    doc.text(`Date: ${new Date().toISOString().substring(0, 10)}`, 21 + 2 * boxWidth, signBoxY + 14);
    doc.line(21 + 2 * boxWidth, signBoxY + 20, 18 + 3 * boxWidth - 8, signBoxY + 20);
    doc.text('Authorized Seal & Signature', 21 + 2 * boxWidth, signBoxY + 23);

    // -------------------------------------------------------------
    // RUN FOOTERS WITH PAGE NUMBERS ACROSS ALL PAGES
    // -------------------------------------------------------------
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);

      // Footer line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(10, pageHeight - 7, pageWidth - 10, pageHeight - 7);

      doc.text(
        `CONFIDENTIAL AUDIT DOSSIER | ${settings.companyName} | Month: ${monthKey} (${monthName}) | Ref: ${auditRef}`,
        12,
        pageHeight - 4
      );

      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 12, pageHeight - 4, { align: 'right' });
    }

    doc.save(`MonthEnd_Consolidated_Audit_${monthKey}.pdf`);
  }

  /**
   * Generates a 1-Page Consolidated Transport Bilties Register / Manifest PDF
   * Specially formatted so that all selected BTs fit onto a single page!
   */
  public static generateSinglePageBiltiesPdf(
    bilties: Bilty[],
    settings: CompanySettings,
    options?: {
      orientation?: 'landscape' | 'portrait';
      density?: 'normal' | 'compact' | 'ultra';
      title?: string;
    }
  ) {
    if (!bilties || bilties.length === 0) {
      throw new Error('No bilties selected to generate PDF');
    }

    const orientation = options?.orientation || 'landscape';
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const count = bilties.length;

    // Determine scale based on density or item count
    let fontSize = 7.5;
    let cellPadding = 1.8;
    if (options?.density === 'ultra' || count > 24) {
      fontSize = 5.8;
      cellPadding = 0.9;
    } else if (options?.density === 'compact' || count > 12) {
      fontSize = 6.8;
      cellPadding = 1.3;
    }

    // Top Company Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 64, 175);
    doc.text(settings.companyName.toUpperCase(), pageWidth / 2, 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `${settings.address}, ${settings.cityState} | Phone: ${settings.mobile} | GSTIN: ${settings.gstNumber}`,
      pageWidth / 2,
      14,
      { align: 'center' }
    );

    // Title Band
    const titleText = options?.title || 'CONSOLIDATED BILTY DISPATCH MANIFEST (1-PAGE SHEET)';
    doc.setFillColor(30, 64, 175);
    doc.rect(8, 16.5, pageWidth - 16, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(titleText, pageWidth / 2, 20.2, { align: 'center' });

    // Summary metadata
    const totalPackages = bilties.reduce((sum, b) => sum + (Number(b.packages) || 0), 0);
    const totalWeight = bilties.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);
    const totalFreight = bilties.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const totalPaid = bilties.reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0);
    const totalBalance = bilties.reduce((sum, b) => sum + (Number(b.balanceAmount) || 0), 0);

    const rows = bilties.map((b, idx) => [
      (idx + 1).toString(),
      b.biltyNumber,
      b.biltyDate,
      b.consignor,
      b.consignee,
      `${b.fromCity} -> ${b.toCity}`,
      b.vehicleNumber,
      b.material,
      `${b.packages} ${b.packageType || 'Pkgs'}`,
      b.weight ? `${b.weight} ${b.weightUnit || 'Kg'}` : '-',
      b.paymentType,
      b.totalAmount.toLocaleString(),
      b.paidAmount > 0 ? b.paidAmount.toLocaleString() : '-',
      b.balanceAmount > 0 ? b.balanceAmount.toLocaleString() : '-',
    ]);

    autoTable(doc, {
      startY: 23.5,
      margin: { left: 8, right: 8 },
      head: [
        [
          '#',
          'BT No.',
          'Date',
          'Consignor (Sender)',
          'Consignee (Receiver)',
          'Route',
          'Vehicle',
          'Material',
          'Pkgs',
          'Weight',
          'Mode',
          'Freight',
          'Paid',
          'Balance',
        ],
      ],
      body: rows,
      foot: [
        [
          'TOTAL',
          `${count} BTs`,
          '',
          '',
          '',
          '',
          '',
          'Grand Total:',
          `${totalPackages} Pkgs`,
          `${totalWeight.toLocaleString()} Kg`,
          '',
          `${settings.currencySymbol} ${totalFreight.toLocaleString()}`,
          `${settings.currencySymbol} ${totalPaid.toLocaleString()}`,
          `${settings.currencySymbol} ${totalBalance.toLocaleString()}`,
        ],
      ],
      pageBreak: 'avoid',
      theme: 'grid',
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontSize: fontSize + 0.3,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: cellPadding + 0.3,
      },
      footStyles: {
        fillColor: [239, 246, 255],
        textColor: [30, 64, 175],
        fontSize: fontSize + 0.4,
        fontStyle: 'bold',
        cellPadding: cellPadding + 0.4,
      },
      styles: {
        fontSize,
        cellPadding,
        overflow: 'ellipsize',
        textColor: [15, 23, 42],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { fontStyle: 'bold', cellWidth: 16 },
        2: { cellWidth: 18 },
        3: { cellWidth: 38 },
        4: { cellWidth: 38 },
        5: { cellWidth: 26 },
        6: { cellWidth: 22, fontStyle: 'bold' },
        7: { cellWidth: 26 },
        8: { halign: 'center', cellWidth: 16 },
        9: { halign: 'right', cellWidth: 18 },
        10: { halign: 'center', cellWidth: 15 },
        11: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
        12: { halign: 'right', cellWidth: 18 },
        13: { halign: 'right', fontStyle: 'bold', cellWidth: 18 },
      },
    });

    // Signature Block at Bottom
    const finalY = (doc as any).lastAutoTable.finalY + 7;
    const pageHeight = doc.internal.pageSize.getHeight();
    const signY = Math.min(finalY, pageHeight - 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);

    doc.line(12, signY + 7, 50, signY + 7);
    doc.text('Prepared By / Booking Clerk', 14, signY + 11);

    doc.line(pageWidth / 2 - 20, signY + 7, pageWidth / 2 + 20, signY + 7);
    doc.text('Dispatcher In-Charge', pageWidth / 2 - 14, signY + 11);

    doc.line(pageWidth - 55, signY + 7, pageWidth - 15, signY + 7);
    doc.text(`For ${settings.companyName}`, pageWidth - 55, signY + 11);

    doc.save(`Bilties_1Page_Register_${Date.now()}.pdf`);
  }
}

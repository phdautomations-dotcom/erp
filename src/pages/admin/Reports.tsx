import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { fmtINR, fmtNum, fmtDate } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addPdfBranding, type Settings } from "@/lib/pdf";

export default function Reports() {
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [docs, setDocs] = useState<any[]>([]);
  const [pays, setPays] = useState<any[]>([]);
  const [exps, setExps] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    document.title = "Reports | PHD ERP";
    Promise.all([
      supabase.from("documents").select("*, parties(name, gstin, state, state_code), document_lines(*)").gte("doc_date", from).lte("doc_date", to),
      supabase.from("payments").select("*").gte("payment_date", from).lte("payment_date", to),
      supabase.from("expenses").select("*").gte("expense_date", from).lte("expense_date", to),
      supabase.from("parties").select("*"),
      supabase.from("company_settings").select("*").limit(1).single(),
    ]).then(([d, p, e, pa, s]) => { setDocs(d.data || []); setPays(p.data || []); setExps(e.data || []); setParties(pa.data || []); setSettings(s.data || null); });
  }, [from, to]);

  const sales = docs.filter(d => d.doc_type === "invoice");
  const purchases = docs.filter(d => d.doc_type === "purchase_bill");
  const totalSales = sales.reduce((s, d) => s + Number(d.total), 0);
  const totalPurchase = purchases.reduce((s, d) => s + Number(d.total), 0);
  const totalExp = exps.reduce((s, e) => s + Number(e.amount), 0);
  const profit = totalSales - totalPurchase - totalExp;
  const outputGst = sales.reduce((s, d) => s + Number(d.cgst) + Number(d.sgst) + Number(d.igst), 0);
  const inputGst = purchases.reduce((s, d) => s + Number(d.cgst) + Number(d.sgst) + Number(d.igst), 0);

  const aging = (() => {
    const now = new Date();
    const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    sales.forEach(d => {
      const due = Number(d.total) - Number(d.paid);
      if (due <= 0) return;
      const days = Math.floor((now.getTime() - new Date(d.doc_date).getTime()) / 86400000);
      if (days <= 30) buckets["0-30"] += due;
      else if (days <= 60) buckets["31-60"] += due;
      else if (days <= 90) buckets["61-90"] += due;
      else buckets["90+"] += due;
    });
    return buckets;
  })();

  const downloadGSTR1 = async () => {
    if (sales.length === 0) return toast.error("No sales data in this period.");
    
    toast.info("Generating GSTR-1 Excel, please wait...");
    
    try {
      const b2bRows: any[] = [];

      sales.forEach(inv => {
        const party = (inv.parties as any) || {};
        if (!party.gstin) return; // B2B only requires parties with GSTIN

        const lines = inv.document_lines || [];
        
        // Group items by tax_rate and sum their taxable values
        const rateGroups: Record<number, number> = {};
        lines.forEach((line: any) => {
          const rate = Number(line.gst_rate) || 0;
          if (!rateGroups[rate]) rateGroups[rate] = 0;
          rateGroups[rate] += Number(line.taxable);
        });

        // Format date from YYYY-MM-DD to DD-MM-YYYY
        const [year, month, day] = inv.doc_date.split('-');
        const formattedDate = `${day}-${month}-${year}`;

        // Format Place of Supply (POS) - e.g. "06-Haryana" or just "06"
        const pos = party.state 
          ? `${party.state_code || settings?.state_code || '06'}-${party.state}`
          : party.state_code || settings?.state_code || '06';

        Object.keys(rateGroups).forEach((rateString) => {
          const rate = Number(rateString);
          b2bRows.push({
            gstin: (party.gstin || '').toUpperCase().substring(0, 15),
            receiverName: party.name || '',
            invoiceNumber: String(inv.doc_number).substring(0, 16),
            invoiceDate: formattedDate,
            invoiceValue: Number(inv.total),
            pos: String(pos),
            reverseCharge: 'N',
            applicableTaxRate: null,
            invoiceType: 'Regular',
            ecommerceGstin: null,
            rate: Number(rate),
            taxableValue: Number(rateGroups[rate]),
            cessAmount: null
          });
        });
      });

      // Dynamically import exceljs and file-saver
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      // Create workbook and worksheet dynamically instead of fetching template
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('b2b,sez,de');

      // Row 1: Sheet Title
      worksheet.addRow(['Summary For B2B(4), SEZ(6B), DE(6C)']);
      
      // Row 2: Summary Headers required by Offline Tool
      worksheet.addRow([
        'No. of Recipients',
        'No. of Invoices',
        '',
        '',
        'Total Invoice Value',
        '', '', '', '', '', '',
        'Total Taxable Value',
        'Total Cess'
      ]);

      // Row 3: Summary Counters (Offline tool expects 0 here initially)
      worksheet.addRow([0, 0, '', '', 0, '', '', '', '', '', '', 0, 0]);

      // Row 4: Main Column Headers
      worksheet.addRow([
        'GSTIN/UIN of Recipient',
        'Receiver Name',
        'Invoice Number',
        'Invoice date',
        'Invoice Value',
        'Place Of Supply',
        'Reverse Charge',
        'Applicable % of Tax Rate',
        'Invoice Type',
        'E-Commerce GSTIN',
        'Rate',
        'Taxable Value',
        'Cess Amount'
      ]);

      // Set column widths for better readability
      const columnWidths = [25, 30, 20, 15, 15, 20, 15, 25, 15, 20, 10, 15, 15];
      columnWidths.forEach((width, i) => {
        worksheet.getColumn(i + 1).width = width;
      });

      // Insert data starting from Row 5 (1-based index)
      let currentRowIndex = 5;
      
      b2bRows.forEach((rowData) => {
        const row = worksheet.getRow(currentRowIndex);
        row.getCell(1).value = rowData.gstin;
        row.getCell(2).value = rowData.receiverName;
        row.getCell(3).value = rowData.invoiceNumber;
        row.getCell(4).value = rowData.invoiceDate;
        row.getCell(5).value = rowData.invoiceValue;
        row.getCell(6).value = rowData.pos;
        row.getCell(7).value = rowData.reverseCharge;
        row.getCell(8).value = rowData.applicableTaxRate;
        row.getCell(9).value = rowData.invoiceType;
        row.getCell(10).value = rowData.ecommerceGstin;
        row.getCell(11).value = rowData.rate;
        row.getCell(12).value = rowData.taxableValue;
        row.getCell(13).value = rowData.cessAmount;
        row.commit();
        currentRowIndex++;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(blob, `GSTR-1_B2B_${from}_to_${to}.xlsx`);
      toast.success("GSTR-1 Excel Exported!");

    } catch (error: any) {
      console.error(error);
      toast.error("Excel generation failed: " + error.message);
    }
  };

  const downloadGSTR1Json = () => {
    if (sales.length === 0) return toast.error("No sales data in this period.");
    
    const b2b: any[] = [];
    const groupedByGstin: Record<string, any[]> = {};
    
    sales.forEach(inv => {
      const party = (inv.parties as any) || {};
      if (!party.gstin) return;
      
      if (!groupedByGstin[party.gstin]) {
        groupedByGstin[party.gstin] = [];
      }
      groupedByGstin[party.gstin].push(inv);
    });
    
    Object.keys(groupedByGstin).forEach(gstin => {
      const partyInvoices = groupedByGstin[gstin];
      const invArray: any[] = [];
      
      partyInvoices.forEach(inv => {
        const lines = inv.document_lines || [];
        const [year, month, day] = inv.doc_date.split('-');
        const formattedDate = `${day}-${month}-${year}`;
        const party = (inv.parties as any) || {};
        const pos = party.state_code || settings?.state_code || '06';
        
        const rateGroups: Record<number, { txval: number, cgst: number, sgst: number, igst: number }> = {};
        lines.forEach((line: any) => {
          const rate = Number(line.gst_rate) || 0;
          if (!rateGroups[rate]) rateGroups[rate] = { txval: 0, cgst: 0, sgst: 0, igst: 0 };
          rateGroups[rate].txval += Number(line.taxable);
          rateGroups[rate].cgst += Number(line.cgst);
          rateGroups[rate].sgst += Number(line.sgst);
          rateGroups[rate].igst += Number(line.igst);
        });
        
        const itms: any[] = [];
        let num = 1;
        
        Object.keys(rateGroups).forEach((rateString) => {
          const rate = Number(rateString);
          const vals = rateGroups[rate];
          const itm_det: any = { txval: Number(vals.txval.toFixed(2)), rt: rate };
          
          if (vals.igst > 0 || inv.is_igst) {
            itm_det.iamt = Number(vals.igst.toFixed(2));
          } else {
            itm_det.cgst = Number(vals.cgst.toFixed(2));
            itm_det.sgst = Number(vals.sgst.toFixed(2));
          }
          itms.push({ num: num++, itm_det });
        });
        
        invArray.push({ inum: String(inv.doc_number).substring(0, 16), idt: formattedDate, val: Number(inv.total), pos: String(pos), rchrg: "N", inv_typ: "R", itms });
      });
      
      b2b.push({ ctin: gstin.toUpperCase().substring(0, 15), inv: invArray });
    });
    
    const fpMonth = from.split('-')[1];
    const fpYear = from.split('-')[0];
    const gstr1Data: any = { gstin: settings?.gstin || "06DHEPR7029N1ZR", fp: `${fpMonth}${fpYear}`, gt: 0, cur_gt: 0, version: "GST3.0.0", hash: "hash", b2b };
    if (b2b.length === 0) delete gstr1Data.b2b;
    
    const blob = new Blob([JSON.stringify(gstr1Data, null, 4)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `GSTR-1_${from}_to_${to}.json`; link.click(); URL.revokeObjectURL(url);
    toast.success("GSTR-1 JSON Exported!");
  };

  const downloadGSTR2 = () => {
    if (purchases.length === 0) return toast.error("No purchase data in this period.");
    const headers = ["Date", "Bill Number", "Vendor Name", "GSTIN", "State", "Taxable Value", "CGST", "SGST", "IGST", "Total Amount"];
    const csvRows = purchases.map(d => {
      const date = new Date(d.doc_date).toLocaleDateString('en-GB');
      const p = (d.parties as any) || {};
      const esc = (s: any) => `"${String(s || '').replace(/"/g, '""')}"`;
      return [
        esc(date), esc(d.doc_number), esc(p.name), esc(p.gstin), esc(p.state),
        (d.subtotal - d.discount).toFixed(2), Number(d.cgst).toFixed(2), Number(d.sgst).toFixed(2), Number(d.igst).toFixed(2), Number(d.total).toFixed(2)
      ].join(",");
    });
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GSTR-2_${from}_to_${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printSalesRegister = async () => {
    if (!settings) return toast.error("Settings not loaded.");
    const pdf = new jsPDF("p", "mm", "a4");
    let y = await addPdfBranding(pdf, "SALES REGISTER", settings);

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    const dateRange = `From: ${new Date(from).toLocaleDateString('en-GB')} To: ${new Date(to).toLocaleDateString('en-GB')}`;
    pdf.text(dateRange, pdf.internal.pageSize.getWidth() - 12, y, { align: "right" });
    y += 10;

    const head = [['Date', 'Number', 'Party', 'GSTIN', 'Taxable', 'GST', 'Total']];
    const body = sales.map(d => [
      fmtDate(d.doc_date),
      d.doc_number,
      (d.parties as any)?.name || '',
      (d.parties as any)?.gstin || '',
      fmtNum(d.subtotal - d.discount),
      fmtNum(Number(d.cgst) + Number(d.sgst) + Number(d.igst)),
      fmtNum(d.total)
    ]);

    const totalTaxable = sales.reduce((s, d) => s + (d.subtotal - d.discount), 0);
    const totalGst = sales.reduce((s, d) => s + (Number(d.cgst) + Number(d.sgst) + Number(d.igst)), 0);

    const foot = [[
      '', '', '', 'Totals',
      fmtNum(totalTaxable),
      fmtNum(totalGst),
      fmtNum(totalSales)
    ]];

    autoTable(pdf, {
      startY: y,
      head, body, foot,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'normal' },
      footStyles: { fillColor: [240, 240, 240], textColor: 15, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 1.8, valign: "middle" },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 28 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 28 },
        4: { halign: 'right', cellWidth: 22 },
        5: { halign: 'right', cellWidth: 22 },
        6: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
      },
    });

    pdf.save(`Sales_Register_${from}_to_${to}.pdf`);
  };

  const printPurchaseRegister = async () => {
    if (!settings) return toast.error("Settings not loaded.");
    const pdf = new jsPDF("p", "mm", "a4");
    let y = await addPdfBranding(pdf, "PURCHASE REGISTER", settings);

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    const dateRange = `From: ${new Date(from).toLocaleDateString('en-GB')} To: ${new Date(to).toLocaleDateString('en-GB')}`;
    pdf.text(dateRange, pdf.internal.pageSize.getWidth() - 12, y, { align: "right" });
    y += 10;

    const head = [['Date', 'Number', 'Vendor', 'Taxable', 'GST', 'Total']];
    const body = purchases.map(d => [
      fmtDate(d.doc_date),
      d.doc_number,
      (d.parties as any)?.name || '',
      fmtNum(d.subtotal - d.discount),
      fmtNum(Number(d.cgst) + Number(d.sgst) + Number(d.igst)),
      fmtNum(d.total)
    ]);

    const totalTaxable = purchases.reduce((s, d) => s + (d.subtotal - d.discount), 0);
    const totalGst = purchases.reduce((s, d) => s + (Number(d.cgst) + Number(d.sgst) + Number(d.igst)), 0);

    const foot = [[
      '', '', 'Totals',
      fmtNum(totalTaxable),
      fmtNum(totalGst),
      fmtNum(totalPurchase)
    ]];

    autoTable(pdf, {
      startY: y,
      head, body, foot,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'normal' },
      footStyles: { fillColor: [240, 240, 240], textColor: 15, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 1.8, valign: "middle" },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 30 },
        2: { cellWidth: 'auto' },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 25 },
        5: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
      },
    });

    pdf.save(`Purchase_Register_${from}_to_${to}.pdf`);
  };

  const printPnL = async () => {
    if (!settings) return toast.error("Settings not loaded.");
    const pdf = new jsPDF("p", "mm", "a4");
    let y = await addPdfBranding(pdf, "PROFIT & LOSS STATEMENT", settings);

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    const dateRange = `From: ${new Date(from).toLocaleDateString('en-GB')} To: ${new Date(to).toLocaleDateString('en-GB')}`;
    pdf.text(dateRange, pdf.internal.pageSize.getWidth() - 12, y, { align: "right" });
    y += 10;

    const head = [['Particulars', 'Amount']];
    const body = [
      ['Sales', fmtNum(totalSales)],
      ['Purchases', `-${fmtNum(totalPurchase)}`],
      ['Expenses', `-${fmtNum(totalExp)}`]
    ];
    const foot = [['Net Profit', fmtNum(profit)]];

    autoTable(pdf, {
      startY: y,
      head, body, foot,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'normal' },
      footStyles: { fillColor: [240, 240, 240], textColor: 15, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3, valign: "middle" },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 50, fontStyle: 'bold' } },
    });
    
    pdf.save(`PnL_Statement_${from}_to_${to}.pdf`);
  };

  return (
    <AdminLayout title="Reports">
      <div className="flex flex-wrap gap-3 mb-5">
        <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
      </div>

      <Tabs defaultValue="pl">
        <TabsList>
          <TabsTrigger value="pl">P&L</TabsTrigger>
          <TabsTrigger value="gst">GST Summary</TabsTrigger>
          <TabsTrigger value="sales">Sales Register</TabsTrigger>
          <TabsTrigger value="purchase">Purchase Register</TabsTrigger>
          <TabsTrigger value="aging">Aging</TabsTrigger>
        </TabsList>

        <TabsContent value="pl">
          <div className="flex justify-end gap-2 mt-4 mb-2 max-w-md">
            <Button size="sm" variant="outline" onClick={printPnL} disabled={!settings} className="rounded-full shadow-sm"><Printer className="h-4 w-4 mr-2" /> Print P&L</Button>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 max-w-md">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Sales</span><span>{fmtINR(totalSales)}</span></div>
              <div className="flex justify-between"><span>Purchases</span><span>-{fmtINR(totalPurchase)}</span></div>
              <div className="flex justify-between"><span>Expenses</span><span>-{fmtINR(totalExp)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold text-lg"><span>Net Profit</span><span className={profit >= 0 ? "text-foreground" : "text-destructive"}>{fmtINR(profit)}</span></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gst">
          <div className="rounded-2xl border border-border bg-card p-6 max-w-md mt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Output GST (Sales)</span><span>{fmtINR(outputGst)}</span></div>
              <div className="flex justify-between"><span>Input GST (Purchases)</span><span>-{fmtINR(inputGst)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Net GST Payable</span><span>{fmtINR(outputGst - inputGst)}</span></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sales">
          <div className="flex justify-end gap-2 mt-4 mb-2">
            <div className="relative">
              <Button size="sm" variant="outline" onClick={() => setExportOpen(!exportOpen)} disabled={sales.length === 0} className="rounded-full shadow-sm">
                <Download className="h-4 w-4 mr-2" /> Export GSTR-1
              </Button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-36 rounded-xl border border-border bg-card p-1 shadow-lg z-50 flex flex-col">
                    <Button variant="ghost" size="sm" className="justify-start text-sm font-medium" onClick={() => { setExportOpen(false); downloadGSTR1(); }}>Excel Format</Button>
                    <Button variant="ghost" size="sm" className="justify-start text-sm font-medium" onClick={() => { setExportOpen(false); downloadGSTR1Json(); }}>JSON Format</Button>
                  </div>
                </>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={printSalesRegister} disabled={!settings || sales.length === 0} className="rounded-full shadow-sm"><Printer className="h-4 w-4 mr-2" /> Print Register</Button>
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/40 text-xs"><tr><th className="text-left p-2">Date</th><th className="text-left">Number</th><th className="text-left">Party</th><th className="text-left">GSTIN</th><th className="text-right">Taxable</th><th className="text-right">GST</th><th className="text-right">Total</th></tr></thead>
              <tbody>{sales.map(d => <tr key={d.id} className="border-t border-border"><td className="p-2">{d.doc_date}</td><td className="font-mono text-xs">{d.doc_number}</td><td>{(d.parties as any)?.name}</td><td className="font-mono text-xs">{(d.parties as any)?.gstin}</td><td className="text-right">{fmtINR(d.subtotal - d.discount)}</td><td className="text-right">{fmtINR(Number(d.cgst) + Number(d.sgst) + Number(d.igst))}</td><td className="text-right">{fmtINR(d.total)}</td></tr>)}</tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="purchase">
          <div className="flex justify-end gap-2 mt-4 mb-2">
            <Button size="sm" variant="outline" onClick={downloadGSTR2} disabled={purchases.length === 0} className="rounded-full shadow-sm"><Download className="h-4 w-4 mr-2" /> Export GSTR-2</Button>
            <Button size="sm" variant="outline" onClick={printPurchaseRegister} disabled={!settings || purchases.length === 0} className="rounded-full shadow-sm"><Printer className="h-4 w-4 mr-2" /> Print Register</Button>
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/40 text-xs"><tr><th className="text-left p-2">Date</th><th className="text-left">Number</th><th className="text-left">Vendor</th><th className="text-right">Total</th></tr></thead>
              <tbody>{purchases.map(d => <tr key={d.id} className="border-t border-border"><td className="p-2">{d.doc_date}</td><td className="font-mono text-xs">{d.doc_number}</td><td>{(d.parties as any)?.name}</td><td className="text-right">{fmtINR(d.total)}</td></tr>)}</tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="aging">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {Object.entries(aging).map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-border bg-card p-5"><div className="text-xs text-muted-foreground">{k} days</div><div className="font-display text-xl font-semibold mt-1">{fmtINR(v)}</div></div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

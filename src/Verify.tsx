import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, FileText, AlertCircle, Sparkles } from "lucide-react";
import { fmtINR } from "@/lib/format";

export default function Verify() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoc = async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, parties(name, phone)")
        .eq("id", id)
        .single();
        
      if (!error && data) setData(data);
      setLoading(false);
    };
    if (id) fetchDoc();
  }, [id]);

  if (loading) return <div className="p-10 text-center text-gray-500 font-medium">Verifying Document...</div>;

  if (!data) return (
    <div className="flex h-screen items-center justify-center p-4 bg-gray-50">
      <div className="rounded-2xl bg-red-50 p-6 text-center shadow-lg border border-red-200 w-full max-w-sm">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-red-700">Invalid or Fake Document</h2>
        <p className="text-sm text-red-600 mt-2">This document could not be verified in our system or might have been deleted.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-emerald-500 p-6 text-center flex flex-col items-center justify-center">
          <CheckCircle2 className="h-16 w-16 text-white mb-2" />
          <h1 className="text-2xl font-bold text-white">Document Verified</h1>
          <p className="text-emerald-100 text-sm mt-1">This is an authentic system generated document</p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex justify-between border-b border-gray-100 pb-3">
            <span className="text-gray-500 text-sm">Document No</span>
            <span className="font-bold">{data.doc_number}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-3">
            <span className="text-gray-500 text-sm">Date</span>
            <span className="font-medium">{new Date(data.doc_date).toLocaleDateString()}</span>
          </div>
          <div className="flex flex-col border-b border-gray-100 pb-3">
            <span className="text-gray-500 text-sm mb-1">Billed To</span>
            <span className="font-bold text-lg">{(data.parties as any)?.name}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-3">
            <span className="text-gray-500 text-sm">Total Amount</span>
            <span className="font-bold text-xl text-emerald-600">{fmtINR(data.total)}</span>
          </div>
          
          <div className="pt-4 text-center">
            <p className="text-sm font-medium text-gray-700">Thank you for your business! 🙏</p>
            <p className="text-xs text-gray-500 mt-1">We truly value your trust and look forward to serving you again.</p>
          </div>
          
          <div className="mt-4 bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
            <p className="text-sm font-semibold text-blue-800 flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              Verified by PHD Automations
            </p>
          </div>
        </div>
      </div>
      
      {/* Powered by Saffyre Branding */}
      <div className="mt-8 flex flex-col items-center justify-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
        <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
          Powered by
        </div>
        <div className="flex items-center gap-1.5 text-xs font-extrabold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
          <Sparkles className="h-3 w-3 text-blue-500" />
          Saffyre Intelligence Labs
        </div>
      </div>
    </div>
  );
}
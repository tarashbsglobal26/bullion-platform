"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UploadCloud, FileText, AlertCircle, CheckCircle2, Clock, XCircle, Trash2 } from "lucide-react";

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "BUSINESS_REGISTRATION", label: "Business Registration" },
  { value: "TAX_CERTIFICATE", label: "Tax Certificate" },
  { value: "KYC_APPLICATION_FORM", label: "KYC Application Form" },
  { value: "ID_DOCUMENT", label: "ID Document" },
  { value: "PROOF_OF_ADDRESS", label: "Proof of Address" },
];

type Doc = {
  id: string;
  type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  fileName: string;
  reviewNotes: string | null;
};

const STATUS_STYLE: Record<Doc["status"], string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const STATUS_ICON: Record<Doc["status"], React.ElementType> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

const KYC_STATUS_META: Record<string, { label: string; badgeClass: string; icon: React.ElementType; cardClass: string }> = {
  VERIFIED: { label: "Verified", badgeClass: "bg-green-100 text-green-700", icon: CheckCircle2, cardClass: "border-green-200 bg-green-50/50" },
  UNDER_REVIEW: { label: "Under Verification", badgeClass: "bg-yellow-100 text-yellow-700", icon: Clock, cardClass: "border-amber-200 bg-amber-50/50" },
};
const DEFAULT_KYC_STATUS = { label: "Not Verified", badgeClass: "bg-red-100 text-red-700", icon: XCircle, cardClass: "border-amber-200 bg-amber-50/50" };

export function KycUpload({ businessStatus, documents }: { businessStatus: string; documents: Doc[] }) {
  const router = useRouter();
  const [docType, setDocType] = useState(DOC_TYPES[0].value);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const presignRes = await fetch("/api/business/kyc/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, fileSize: file.size }),
      });
      const presignBody = await presignRes.json().catch(() => ({}));
      if (!presignRes.ok) throw new Error(presignBody.error || "Could not prepare upload");

      const putRes = await fetch(presignBody.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");

      const docRes = await fetch("/api/business/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: docType, fileUrl: presignBody.publicUrl, fileName: file.name }),
      });
      const docBody = await docRes.json().catch(() => ({}));
      if (!docRes.ok) throw new Error(docBody.error || "Failed to save document");

      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    setDeletingId(id);
    try {
      const res = await fetch(`/api/business/kyc/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to delete document");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  const rejectedDocs = documents.filter((d) => d.status === "REJECTED");
  const statusMeta = KYC_STATUS_META[businessStatus] ?? DEFAULT_KYC_STATUS;
  const StatusIcon = statusMeta.icon;
  const isVerified = businessStatus === "VERIFIED";

  const statusBadge = (
    <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${statusMeta.badgeClass}`}>
      <StatusIcon className="w-3.5 h-3.5" /> {statusMeta.label}
    </span>
  );

  if (isVerified) {
    return (
      <Card className={statusMeta.cardClass}>
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-900">
            <FileText className="w-5 h-5" />
            <span className="font-semibold">KYC Verification</span>
          </div>
          {statusBadge}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={statusMeta.cardClass}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <FileText className="w-5 h-5" /> KYC Verification
          </CardTitle>
          {statusBadge}
        </div>
        <CardDescription>
          {businessStatus === "UNDER_REVIEW"
            ? "Your documents are under review. You can upload additional documents below if needed."
            : "Upload your company's verification documents to get approved for wholesale orders."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rejectedDocs.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <p className="font-medium mb-1">Some documents were rejected — please re-upload:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {rejectedDocs.map((d) => (
                <li key={d.id}>
                  {DOC_TYPES.find((t) => t.value === d.type)?.label ?? d.type}
                  {d.reviewNotes ? `: ${d.reviewNotes}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="flex h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <label
            className={`flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 cursor-pointer transition-colors ${
              uploading ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            {uploading ? "Uploading…" : "Choose File to Upload"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
        <p className="text-xs text-gray-500">JPEG, PNG, WebP or PDF, up to 20 MB.</p>

        {documents.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            {documents.map((d) => {
              const Icon = STATUS_ICON[d.status];
              return (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{DOC_TYPES.find((t) => t.value === d.type)?.label ?? d.type}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[d.status]}`}>
                      <Icon className="w-3 h-3" /> {d.status}
                    </span>
                    {d.status !== "APPROVED" && (
                      <button
                        type="button"
                        onClick={() => handleDelete(d.id)}
                        disabled={deletingId === d.id}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                        aria-label={`Delete ${d.fileName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

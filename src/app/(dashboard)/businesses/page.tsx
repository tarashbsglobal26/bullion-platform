"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, Building2, FileText, ExternalLink } from "lucide-react";
import { useState } from "react";

const STATUS_VARIANT: Record<string, any> = {
  PENDING_KYC: "warning",
  UNDER_REVIEW: "warning",
  VERIFIED: "success",
  SUSPENDED: "destructive",
  REJECTED: "destructive",
};

export default function BusinessesPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const queryClient = useQueryClient();

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["businesses", statusFilter],
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/business${params}`);
      return res.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/business/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["businesses"] }),
  });

  const updateDoc = useMutation({
    mutationFn: async ({ docId, status }: { docId: string; status: "APPROVED" | "REJECTED" }) => {
      const res = await fetch(`/api/business/kyc`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, status }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["businesses"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Businesses</h1>
        <p className="text-gray-500 text-sm">Manage B2B customers, KYC status, and credit limits</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["", "PENDING_KYC", "UNDER_REVIEW", "VERIFIED", "SUSPENDED", "REJECTED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === s
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-amber-400"
            }`}
          >
            {s === "" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {businesses?.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No businesses found</p>
            </div>
          )}
          {businesses?.map((biz: any) => (
            <Card key={biz.id} className={biz.status === "UNDER_REVIEW" ? "border-amber-200" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold">{biz.name}</h3>
                      <Badge variant={STATUS_VARIANT[biz.status]}>{biz.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{biz.legalName} · Tax ID: {biz.taxId}</p>
                    <p className="text-sm text-gray-500">{biz.email} · {biz.phone}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>{biz._count?.users} users</span>
                      <span>{biz._count?.orders} orders</span>
                      <span>Credit: {formatCurrency(Number(biz.creditLimit))}</span>
                      <span>Terms: {biz.paymentTermDays}d</span>
                      <span>Registered: {format(new Date(biz.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    {biz.kycDocuments?.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                        {biz.kycDocuments.map((doc: any) => (
                          <div key={doc.id} className="flex items-center justify-between gap-3 text-sm">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 min-w-0 text-amber-700 hover:text-amber-900 hover:underline"
                            >
                              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{doc.type.replace(/_/g, " ")}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" />
                            </a>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  doc.status === "APPROVED" ? "bg-green-100 text-green-700" :
                                  doc.status === "REJECTED" ? "bg-red-100 text-red-700" :
                                  "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {doc.status}
                              </span>
                              {doc.status === "PENDING" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => updateDoc.mutate({ docId: doc.id, status: "APPROVED" })}
                                    className="text-green-600 hover:text-green-800"
                                    aria-label="Approve document"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateDoc.mutate({ docId: doc.id, status: "REJECTED" })}
                                    className="text-red-500 hover:text-red-700"
                                    aria-label="Reject document"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-col items-end">
                    {biz.status === "UNDER_REVIEW" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: biz.id, status: "VERIFIED" })}
                          className="gap-1"
                        >
                          <CheckCircle className="w-3 h-3" /> Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateStatus.mutate({ id: biz.id, status: "REJECTED" })}
                          className="gap-1"
                        >
                          <XCircle className="w-3 h-3" /> Reject
                        </Button>
                      </>
                    )}
                    {biz.status === "VERIFIED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus.mutate({ id: biz.id, status: "SUSPENDED" })}
                      >
                        Suspend
                      </Button>
                    )}
                    {biz.status === "SUSPENDED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus.mutate({ id: biz.id, status: "VERIFIED" })}
                      >
                        Reinstate
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Pencil, X, ImagePlus, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

const BANNER_KEY = "new2026";
const SLIDE_INTERVAL_MS = 5000;

type Slide = { imageUrl: string; title: string; subtitle: string; linkUrl: string };

export function NewReleasesBanner({ isAdmin }: { isAdmin: boolean }) {
  const [editing, setEditing] = useState(false);
  const [index, setIndex]     = useState(0);
  const queryClient = useQueryClient();

  const { data: banner, isLoading } = useQuery({
    queryKey: ["banner", BANNER_KEY],
    queryFn: async () => {
      const res = await fetch(`/api/banners/${BANNER_KEY}`);
      return res.json();
    },
  });

  const slides: any[] = banner?.slides ?? [];

  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), SLIDE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  if (isLoading) {
    return <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 h-40 animate-pulse" />;
  }

  const hasSlides = slides.length > 0;
  const slide = hasSlides ? slides[index] : null;

  const content = (
    <div className="relative rounded-xl border-2 border-dashed border-amber-200 bg-amber-50 flex flex-col items-center justify-center py-10 text-center overflow-hidden aspect-[21/6] min-h-[180px]">
      {hasSlides && (
        <>
          <div
            key={slide.id ?? index}
            className="absolute inset-0 transition-opacity duration-500"
            style={{ backgroundImage: `url(${slide.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
          <div className="absolute inset-0 bg-black/40" />
        </>
      )}
      <div className="relative">
        {!hasSlides && (
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3 mx-auto">
            <Star className="w-6 h-6 text-amber-500" />
          </div>
        )}
        <p className={`text-base font-semibold ${hasSlides ? "text-white" : "text-amber-800"}`}>
          {slide?.title || (hasSlides ? "" : "Coming Soon")}
        </p>
        <p className={`text-sm mt-1 ${hasSlides ? "text-white/90" : "text-amber-600"}`}>
          {slide?.subtitle || (hasSlides ? "" : "2026 releases will be listed here once available.")}
        </p>
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); setIndex((i) => (i - 1 + slides.length) % slides.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-1 shadow"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); setIndex((i) => (i + 1) % slides.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-1 shadow"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); setIndex(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}

      {isAdmin && (
        <button
          onClick={(e) => { e.preventDefault(); setEditing(true); }}
          className={`absolute top-3 right-3 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors z-10 ${
            hasSlides ? "bg-white/90 text-gray-700 hover:bg-white" : "bg-white text-amber-700 hover:bg-amber-100 border border-amber-200"
          }`}
        >
          <Pencil className="w-3.5 h-3.5" /> Edit Banner
        </button>
      )}
    </div>
  );

  return (
    <>
      {slide?.linkUrl && !isAdmin ? <Link href={slide.linkUrl}>{content}</Link> : content}
      {editing && (
        <BannerEditModal
          slides={slides}
          onClose={() => setEditing(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["banner", BANNER_KEY] })}
        />
      )}
    </>
  );
}

function BannerEditModal({ slides: initialSlides, onClose, onSaved }: {
  slides: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [slides, setSlides] = useState<Slide[]>(
    initialSlides.length > 0
      ? initialSlides.map((s) => ({ imageUrl: s.imageUrl, title: s.title ?? "", subtitle: s.subtitle ?? "", linkUrl: s.linkUrl ?? "" }))
      : []
  );
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const addSlide = () => setSlides((s) => [...s, { imageUrl: "", title: "", subtitle: "", linkUrl: "" }]);
  const removeSlide = (i: number) => setSlides((s) => s.filter((_, j) => j !== i));
  const updateSlide = (i: number, patch: Partial<Slide>) =>
    setSlides((s) => s.map((slide, j) => j === i ? { ...slide, ...patch } : slide));

  const handleUpload = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIndex(i);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/products/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        updateSlide(i, { imageUrl: url });
      }
    } finally {
      setUploadingIndex(null);
      e.target.value = "";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/banners/new2026`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: slides
            .filter((s) => s.imageUrl)
            .map((s) => ({
              imageUrl: s.imageUrl,
              title:    s.title || null,
              subtitle: s.subtitle || null,
              linkUrl:  s.linkUrl || null,
            })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save banner");
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const lbl = "text-xs font-medium text-gray-700 block mb-1";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">Edit "New Releases 2026" Slideshow</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

          {slides.length === 0 && (
            <p className="text-sm text-gray-400 italic">No slides yet — add one below. With no slides, the plain "Coming Soon" placeholder is shown.</p>
          )}

          <div className="space-y-4">
            {slides.map((slide, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Slide {i + 1}</span>
                  <button type="button" onClick={() => removeSlide(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative aspect-[21/6] rounded-xl border-2 border-dashed border-gray-200 overflow-hidden bg-gray-50">
                  {slide.imageUrl ? (
                    <>
                      <img src={slide.imageUrl} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => updateSlide(i, { imageUrl: "" })}
                        className="absolute top-1.5 right-1.5 bg-white rounded-full shadow p-0.5 text-gray-500 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <label className={`absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors ${uploadingIndex === i ? "opacity-60 pointer-events-none" : ""}`}>
                      <ImagePlus className="w-6 h-6 text-gray-300 mb-1" />
                      <span className="text-xs text-gray-400">{uploadingIndex === i ? "Uploading…" : "Upload image"}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(i, e)} disabled={uploadingIndex === i} />
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-400">Recommended size: 1400×400px (21:6 wide banner)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Title</label>
                    <Input value={slide.title} onChange={e => updateSlide(i, { title: e.target.value })} placeholder="Coming Soon" />
                  </div>
                  <div>
                    <label className={lbl}>Link URL</label>
                    <Input value={slide.linkUrl} onChange={e => updateSlide(i, { linkUrl: e.target.value })} placeholder="/catalog" />
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>Subtitle</label>
                    <Input value={slide.subtitle} onChange={e => updateSlide(i, { subtitle: e.target.value })} placeholder="2026 releases will be listed here once available." />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addSlide}
            className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-800 font-medium">
            <Plus className="w-4 h-4" /> Add Slide
          </button>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" className="flex-1 gap-2" disabled={loading || uploadingIndex !== null}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

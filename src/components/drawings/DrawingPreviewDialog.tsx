import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, FileText } from "lucide-react";

export type DrawingPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  fileName?: string | null;
};

type FileKind = "pdf" | "image" | "unknown";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; objectUrl: string; kind: FileKind }
  | { status: "error"; message: string };

function guessKindFromUrl(url: string): FileKind {
  const u = url.toLowerCase();
  if (u.endsWith(".pdf")) return "pdf";
  if (u.match(/\.(png|jpg|jpeg|webp|gif|bmp|svg)$/)) return "image";
  return "unknown";
}

export function DrawingPreviewDialog({
  open,
  onOpenChange,
  url,
  fileName,
}: DrawingPreviewDialogProps) {
  const title = fileName || "Drawing";

  const [state, setState] = useState<LoadState>({ status: "idle" });

  const kindHint = useMemo(() => (url ? guessKindFromUrl(url) : "unknown"), [url]);

  useEffect(() => {
    if (!open || !url) {
      setState({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    let prevObjectUrl: string | null = null;

    setState({ status: "loading" });

    (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Failed to load file (HTTP ${res.status})`);
        }

        const blob = await res.blob();

        const kind: FileKind = blob.type.includes("pdf")
          ? "pdf"
          : blob.type.startsWith("image/")
            ? "image"
            : kindHint;

        const objectUrl = URL.createObjectURL(blob);
        prevObjectUrl = objectUrl;

        setState({ status: "ready", objectUrl, kind });
      } catch (e) {
        if (controller.signal.aborted) return;
        const message = e instanceof Error ? e.message : "Failed to load file";
        setState({ status: "error", message });
      }
    })();

    return () => {
      controller.abort();
      if (prevObjectUrl) URL.revokeObjectURL(prevObjectUrl);
    };
  }, [open, url, kindHint]);

  const openInNewTab = () => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>Drawing preview</DialogDescription>
        </DialogHeader>

        <div className="p-4 overflow-auto" style={{ maxHeight: "calc(90vh - 120px)" }}>
          {state.status === "loading" && (
            <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading preview…</span>
            </div>
          )}

          {state.status === "error" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {state.message}
              </p>
              <p className="text-xs text-muted-foreground text-center max-w-md">
                Your browser may block direct embedding for security reasons. Use “Open in New Tab”.
              </p>
              <Button onClick={openInNewTab}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          )}

          {state.status === "ready" && state.kind === "pdf" && (
            <iframe
              src={state.objectUrl}
              className="w-full h-[72vh] border rounded-lg"
              title={`Drawing preview: ${title}`}
            />
          )}

          {state.status === "ready" && state.kind === "image" && (
            <img
              src={state.objectUrl}
              alt={title}
              loading="lazy"
              className="w-full h-auto rounded-lg border"
            />
          )}

          {state.status === "ready" && state.kind === "unknown" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground text-center max-w-md">
                This file type can’t be previewed here.
              </p>
              <Button onClick={openInNewTab}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          )}
        </div>

        <div className="p-4 pt-0 flex justify-end gap-2">
          <Button variant="outline" onClick={openInNewTab} disabled={!url}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

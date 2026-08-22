import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getCroppedImageBlob } from "@/lib/cropImage";

interface AvatarCropDialogProps {
  imageSrc: string | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  busy?: boolean;
}

export const AvatarCropDialog = ({ imageSrc, open, onCancel, onConfirm, busy }: AvatarCropDialogProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => setCroppedArea(areaPixels), []);

  const confirm = async () => {
    if (!imageSrc || !croppedArea) return;
    const blob = await getCroppedImageBlob(imageSrc, croppedArea);
    onConfirm(blob);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Adjust your photo</DialogTitle></DialogHeader>
        <div className="relative h-72 w-full rounded-xl overflow-hidden bg-muted">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-muted-foreground">Zoom</span>
          <Slider min={1} max={3} step={0.05} value={[zoom]} onValueChange={([v]) => setZoom(v)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-full" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button className="flex-1 rounded-full btn-gradient" onClick={confirm} disabled={busy || !croppedArea}>
            {busy ? "Saving…" : "Save photo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

"use client";

import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";

type Props = {
  currentUrl?: string | null;
  onUploaded: (newUrl: string) => void;
  fallbackInitials?: string;
};

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const size = Math.min(pixelCrop.width, pixelCrop.height);
  // Sortie carrée raisonnable pour un avatar
  const outputSize = Math.min(512, Math.round(size));
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non supporté");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Échec de l'export image"));
      },
      "image/webp",
      0.85
    );
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });
}

export default function AvatarUploader({
  currentUrl,
  onUploaded,
  fallbackInitials = "?",
}: Props) {
  const [croppingSrc, setCroppingSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format non supporté. Utilise JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Fichier trop volumineux (max 2 Mo).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCroppingSrc(reader.result as string);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
    // reset input pour permettre de re-sélectionner le même fichier
    e.target.value = "";
  };

  const handleValidateCrop = async () => {
    if (!croppingSrc || !croppedAreaPixels) return;
    setLoading(true);
    setError("");

    try {
      const blob = await getCroppedBlob(croppingSrc, croppedAreaPixels);
      const formData = new FormData();
      formData.append("file", blob, "avatar.webp");

      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'upload");
        return;
      }

      setPreviewUrl(data.url);
      setCroppingSrc(null);
      onUploaded(data.url);
    } catch {
      setError("Erreur réseau ou export image.");
    } finally {
      setLoading(false);
    }
  };

  const displayUrl = previewUrl || currentUrl;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <label className="cursor-pointer relative group">
          <div className="avatar placeholder">
            {displayUrl ? (
              <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-warning/40 group-hover:ring-warning transition-all">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="bg-warning/30 text-warning-content rounded-full w-20 h-20 flex items-center justify-center ring-2 ring-warning/40 group-hover:ring-warning transition-all">
                <span className="text-2xl font-bold">
                  {(fallbackInitials || "?").charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={loading}
          />
          <span className="absolute bottom-0 right-0 bg-warning text-base-100 text-xs rounded-full w-6 h-6 flex items-center justify-center shadow">
            ✎
          </span>
        </label>
        <div className="text-sm text-base-content/50">
          <p className="font-medium text-base-content/70">Changer la photo</p>
          <p className="text-xs">JPEG, PNG ou WebP · max 2 Mo</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error text-sm py-2">
          <span>{error}</span>
        </div>
      )}

      {/* Modale de recadrage */}
      {croppingSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card-glow rounded-2xl p-4 w-full max-w-md space-y-4 bg-base-100">
            <h3 className="font-bold text-lg">Recadrer ta photo</h3>
            <div className="relative w-full h-64 bg-base-content/10 rounded-xl overflow-hidden">
              <Cropper
                image={croppingSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div>
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/50">Zoom</span>
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="range range-warning range-xs"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost flex-1"
                onClick={() => setCroppingSrc(null)}
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-pirate flex-1"
                onClick={handleValidateCrop}
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "Valider"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

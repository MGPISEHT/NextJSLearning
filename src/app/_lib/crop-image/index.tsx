"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import "./crop-image.css";

export default function CropImage() {
  const [imgSrc, setImgSrc] = useState("");
  const originalImageRef = useRef<HTMLImageElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [isDrawing, setIsDrawing] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [cropArea, setCropArea] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const drawBaseImageOnDisplayCanvas = useCallback(() => {
    const canvas = displayCanvasRef.current;
    const image = originalImageRef.current;

    if (canvas && image && image.complete) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const aspectRatio = image.naturalWidth / image.naturalHeight;
      let newWidth = canvas.width;
      let newHeight = newWidth / aspectRatio;

      if (newHeight > canvas.height) {
        newHeight = canvas.height;
        newWidth = newHeight * aspectRatio;
      }

      const xOffset = (canvas.width - newWidth) / 2;
      const yOffset = (canvas.height - newHeight) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, xOffset, yOffset, newWidth, newHeight);

      image.dataset.drawnX = String(xOffset);
      image.dataset.drawnY = String(yOffset);
      image.dataset.drawnWidth = String(newWidth);
      image.dataset.drawnHeight = String(newHeight);
    }
  }, []);

  const drawCropRectangleOverlay = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number
    ) => {
      const canvas = ctx.canvas;

      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);

      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, canvas.width, y);
      ctx.fillRect(0, y + height, canvas.width, canvas.height - (y + height));
      ctx.fillRect(0, y, x, height);
      ctx.fillRect(x + width, y, canvas.width - (x + width), height);

      ctx.setLineDash([]);
    },
    []
  );

  useEffect(() => {
    if (imgSrc) {
      const img = new Image();
      img.onload = () => {
        originalImageRef.current = img;
        const canvas = displayCanvasRef.current;
        if (canvas) {
          canvas.width = 600;
          canvas.height = 400;
          drawBaseImageOnDisplayCanvas();
        }
      };
      img.onerror = () => {
        setError("Failed to load image.");
        setImgSrc("");
        setIsLoading(false);
      };
      img.src = imgSrc;
    } else {
      originalImageRef.current = null;
      setCropArea(null);
      setCropStart(null);
      setCropEnd(null);
      const canvas = displayCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      const previewCanvas = previewCanvasRef.current;
      if (previewCanvas) {
        const ctx = previewCanvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      }
    }
  }, [imgSrc, drawBaseImageOnDisplayCanvas]);

  useEffect(() => {
    const canvas = displayCanvasRef.current;
    const image = originalImageRef.current;
    if (canvas && image && image.complete) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        drawBaseImageOnDisplayCanvas();
        if (cropArea) {
          drawCropRectangleOverlay(
            ctx,
            cropArea.x,
            cropArea.y,
            cropArea.width,
            cropArea.height
          );
        }
      }
    }
  }, [cropArea, drawBaseImageOnDisplayCanvas, drawCropRectangleOverlay]);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file.");
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () =>
        setImgSrc(reader.result?.toString() || "")
      );
      reader.readAsDataURL(file);
      setError("");
      setCropArea(null);
    }
  };

  const handleUrlLoad = async () => {
    if (!urlInput) {
      setError("Please enter an image URL.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      new URL(urlInput);
      const response = await fetch(urlInput, { mode: "cors" });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        if (!blob.type.startsWith("image/")) {
          setError("The URL does not point to an image file.");
          setImgSrc("");
          setIsLoading(false);
          return;
        }
        setImgSrc(reader.result?.toString() || "");
        setIsLoading(false);
        setCropArea(null);
      };
      reader.onerror = () => {
        setError("Failed to read image data from URL.");
        setIsLoading(false);
        setImgSrc("");
      };
      reader.readAsDataURL(blob);
    } catch (err: any) {
      setIsLoading(false);
      setError(
        `Failed to load image from URL: ${
          err.message || "Invalid URL or network error"
        }. Ensure the URL is directly to an image and supports CORS.`
      );
      setImgSrc("");
    }
  };

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imgSrc || !originalImageRef.current) return;
    setIsDrawing(true);
    setCropStart(getCanvasCoordinates(e));
    setCropEnd(getCanvasCoordinates(e));
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !cropStart) return;
      const { x, y } = getCanvasCoordinates(e);
      setCropEnd({ x, y });

      const canvas = displayCanvasRef.current;
      const image = originalImageRef.current;
      if (canvas && image && image.complete) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          drawBaseImageOnDisplayCanvas();

          const rectX = Math.min(cropStart.x, x);
          const rectY = Math.min(cropStart.y, y);
          const rectWidth = Math.abs(x - cropStart.x);
          const rectHeight = Math.abs(y - cropStart.y);

          if (rectWidth > 0 && rectHeight > 0) {
            drawCropRectangleOverlay(ctx, rectX, rectY, rectWidth, rectHeight);
          }
        }
      }
    },
    [
      isDrawing,
      cropStart,
      drawBaseImageOnDisplayCanvas,
      drawCropRectangleOverlay,
    ]
  );

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    if (!cropStart || !cropEnd) return;

    const finalX = Math.min(cropStart.x, cropEnd.x);
    const finalY = Math.min(cropStart.y, cropEnd.y);
    const finalWidth = Math.abs(cropEnd.x - cropStart.x);
    const finalHeight = Math.abs(cropEnd.y - cropStart.y);

    if (finalWidth > 0 && finalHeight > 0) {
      setCropArea({
        x: finalX,
        y: finalY,
        width: finalWidth,
        height: finalHeight,
      });
    } else {
      setCropArea(null);
    }
    setCropStart(null);
    setCropEnd(null);
  };

  const onCropClick = () => {
    if (
      !cropArea ||
      !originalImageRef.current ||
      !displayCanvasRef.current ||
      !previewCanvasRef.current
    ) {
      setError("Please select a crop area first.");
      return;
    }

    const image = originalImageRef.current;
    const displayCanvas = displayCanvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    const ctx = previewCanvas.getContext("2d");
    if (!ctx) return;

    const drawnX = parseFloat(image.dataset.drawnX || "0");
    const drawnY = parseFloat(image.dataset.drawnY || "0");
    const drawnWidth = parseFloat(
      image.dataset.drawnWidth || String(displayCanvas.width)
    );
    const drawnHeight = parseFloat(
      image.dataset.drawnHeight || String(displayCanvas.height)
    );

    const scaleX = image.naturalWidth / drawnWidth;
    const scaleY = image.naturalHeight / drawnHeight;

    const cropXRelativeToDrawnImage = cropArea.x - drawnX;
    const cropYRelativeToDrawnImage = cropArea.y - drawnY;

    const actualCropX = Math.max(0, cropXRelativeToDrawnImage * scaleX);
    const actualCropY = Math.max(0, cropYRelativeToDrawnImage * scaleY);
    const actualCropWidth = cropArea.width * scaleX;
    const actualCropHeight = cropArea.height * scaleY;

    previewCanvas.width = actualCropWidth;
    previewCanvas.height = actualCropHeight;

    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      actualCropX,
      actualCropY,
      actualCropWidth,
      actualCropHeight,
      0,
      0,
      actualCropWidth,
      actualCropHeight
    );
  };

  return (
    <div className="container">
      <h1>Image Cropper</h1>

      <div className="card">
        <div className="form-group">
          <label htmlFor="file-upload" className="label">
            Upload from Device:
          </label>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            onChange={onSelectFile}
            className="file-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="url-input" className="label">
            Load from URL:
          </label>
          <div className="input-group">
            <input
              id="url-input"
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter image URL"
              className="text-input"
            />
            <button
              onClick={handleUrlLoad}
              disabled={isLoading}
              className="button button-green"
            >
              {isLoading ? "Loading..." : "Load Image"}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message" role="alert">
            <strong>Error!</strong>
            <span>{error}</span>
          </div>
        )}
      </div>

      {imgSrc && (
        <div
          className="card"
          style={{ maxWidth: "64rem" /* Equivalent to max-w-3xl */ }}
        >
          <h2>Select Crop Area</h2>
          <div className="canvas-wrapper">
            <canvas
              ref={displayCanvasRef}
              className="canvas-style"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
          <div className="button-group">
            <button
              onClick={onCropClick}
              disabled={!cropArea}
              className="button button-blue"
              style={{
                borderRadius: "9999px" /* Equivalent to rounded-full */,
              }}
            >
              Crop Image
            </button>
          </div>
          {cropArea && (
            <p className="info-text">
              Selected area: X:{Math.round(cropArea.x)}, Y:
              {Math.round(cropArea.y)}, Width:{Math.round(cropArea.width)},
              Height:{Math.round(cropArea.height)}
            </p>
          )}
        </div>
      )}

      {cropArea && (
        <div className="card">
          <h2>Cropped Image Preview</h2>
          <canvas
            ref={previewCanvasRef}
            className="canvas-style"
            style={{
              maxWidth: "100%",
              maxHeight: "400px",
              width: "auto",
              height: "auto",
            }}
          />
          <p className="info-text">
            The cropped image will appear above. Right-click or long-press on
            the image to save it.
          </p>
        </div>
      )}
    </div>
  );
}

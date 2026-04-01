"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Eraser, Type, Pen } from "lucide-react";

interface SignaturePadProps {
  value: string;
  onChange: (signature: string) => void;
  userName: string;
}

export function SignaturePad({ value, onChange, userName }: SignaturePadProps) {
  const [signatureType, setSignatureType] = useState<"draw" | "type">("type");
  const [typedSignature, setTypedSignature] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 150;

    // Configure drawing context
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // If there's an existing signature and it's a data URL, draw it
    if (value && value.startsWith("data:image")) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = value;
    }
  }, [value]);

  // Handle mouse/touch drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e
      ? e.touches[0].clientX - rect.left
      : e.clientX - rect.left;
    const y = "touches" in e
      ? e.touches[0].clientY - rect.top
      : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e
      ? e.touches[0].clientX - rect.left
      : e.clientX - rect.left;
    const y = "touches" in e
      ? e.touches[0].clientY - rect.top
      : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (canvas) {
        // Save signature as data URL
        const dataUrl = canvas.toDataURL();
        onChange(dataUrl);
      }
      setIsDrawing(false);
    }
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  // Handle typed signature
  const handleTypedSignature = (text: string) => {
    setTypedSignature(text);
    onChange(text);
  };

  // Generate styled text signature
  useEffect(() => {
    if (signatureType === "type" && typedSignature) {
      onChange(typedSignature);
    }
  }, [signatureType, typedSignature]);

  return (
    <div className="space-y-3">
      <Tabs value={signatureType} onValueChange={(val) => setSignatureType(val as "draw" | "type")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="type" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            Type
          </TabsTrigger>
          <TabsTrigger value="draw" className="flex items-center gap-2">
            <Pen className="h-4 w-4" />
            Draw
          </TabsTrigger>
        </TabsList>

        <TabsContent value="type" className="space-y-3">
          <div className="space-y-2">
            <Input
              type="text"
              value={typedSignature}
              onChange={(e) => handleTypedSignature(e.target.value)}
              placeholder="Type your full name"
              className="text-lg"
            />
            <p className="text-xs text-gray-600">
              Type your full name as it appears on official documents
            </p>
          </div>

          {typedSignature && (
            <div className="p-4 border-2 border-gray-300 rounded-lg bg-white">
              <div className="text-center">
                <p
                  className="text-3xl font-serif italic"
                  style={{ fontFamily: "'Brush Script MT', cursive" }}
                >
                  {typedSignature}
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="draw" className="space-y-3">
          <div className="space-y-2">
            <div className="border-2 border-gray-300 rounded-lg bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full cursor-crosshair"
                style={{ touchAction: "none" }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600">
                Sign using your mouse or touchscreen
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearCanvas}
              >
                <Eraser className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

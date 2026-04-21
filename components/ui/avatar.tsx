"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { resolveStorageObjectUrl } from "@/lib/storage"
import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  const normalizedSrc = React.useMemo(() => {
    if (typeof props.src !== "string") {
      return props.src
    }

    const trimmedSrc = props.src.trim()
    if (!trimmedSrc) {
      return undefined
    }

    const isCareoPublicStorageReference =
      trimmedSrc.startsWith("/api/storage/object?bucket=careo-public") ||
      trimmedSrc.includes("/storage/v1/object/public/careo-public/") ||
      trimmedSrc.startsWith("careo-public/") ||
      trimmedSrc.startsWith("residents/") ||
      trimmedSrc.startsWith("avatars/") ||
      trimmedSrc.startsWith("profile-images/") ||
      trimmedSrc.startsWith("organization-logos/") ||
      trimmedSrc.startsWith("org-logos/") ||
      trimmedSrc.startsWith("care-home-logos/")

    if (!isCareoPublicStorageReference) {
      return trimmedSrc
    }

    return resolveStorageObjectUrl("careo-public", trimmedSrc) ?? undefined
  }, [props.src])

  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
      src={normalizedSrc}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }

"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoveRight, PhoneCall, MessageCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export const Hero = () => {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["efficient", "secure", "comprehensive", "modern", "trusted"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full">
      {/* Header Navigation */}
      <header className="w-full border-b">
        <div className="container mx-auto">
          <div className="flex items-center justify-between py-3 px-4 sm:px-6">
            {/* Logo */}
            <Link href="/" className="mt-1">
              <Image
                src="/Logo_CareO.png"
                alt="CareO Logo"
                width={90}
                height={24}
                className="object-cover max-h-6"
              />
            </Link>

            {/* Helpline Button */}
            <Link href="https://wa.me/447741068115" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm" className="gap-2">
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Helpline 24x7</span>
                <span className="sm:hidden">24x7</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto h-[calc(100vh-4rem)]">
        <div className="flex gap-4 h-full items-center justify-center flex-col py-4">
          <div className="flex gap-3 flex-col">
            <h1 className="text-4xl md:text-5xl max-w-2xl tracking-tighter text-center font-regular">
              <span className="text-primary">Care simplified with</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-2 md:pt-1">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-semibold"
                    initial={{ opacity: 0, y: "-100" }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>

            <p className="text-base md:text-lg leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center">
              Comprehensive healthcare management platform built for UK care homes
              and healthcare providers. Digital solutions for resident care, medication
              tracking, incident reporting, and regulatory compliance.
            </p>
          </div>
          <div className="flex flex-row gap-3">
            <Link href="/login">
              <Button variant="outline">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button>
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

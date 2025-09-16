"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface TimePickerProps {
  value?: string
  onChange?: (time: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Pick a time",
  disabled = false,
  className,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Generate hours (00-23)
  const hours = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, "0")
  )

  // Generate minutes (00-59 in 5-minute intervals)
  const minutes = Array.from({ length: 12 }, (_, i) => 
    (i * 5).toString().padStart(2, "0")
  )

  // Parse current value
  const [selectedHour, selectedMinute] = React.useMemo(() => {
    if (!value) return ["00", "00"]
    const parts = value.split(":")
    return [parts[0] || "00", parts[1] || "00"]
  }, [value])

  const handleTimeSelect = (hour: string, minute: string) => {
    const newTime = `${hour}:${minute}`
    onChange?.(newTime)
    setIsOpen(false)
  }

  // Format display value
  const displayValue = React.useMemo(() => {
    if (!value) return ""
    const [h, m] = value.split(":")
    const hour = parseInt(h)
    const period = hour >= 12 ? "PM" : "AM"
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour.toString().padStart(2, "0")}:${m} ${period}`
  }, [value])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Hours column */}
          <div className="border-r">
            <div className="p-2 text-xs font-semibold text-center border-b">
              Hour
            </div>
            <div className="h-[200px] overflow-y-auto">
              <div className="p-1">
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    variant={selectedHour === hour ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-center font-normal",
                      selectedHour === hour && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => handleTimeSelect(hour, selectedMinute)}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Minutes column */}
          <div>
            <div className="p-2 text-xs font-semibold text-center border-b">
              Minute
            </div>
            <div className="h-[200px] overflow-y-auto">
              <div className="p-1">
                {minutes.map((minute) => (
                  <Button
                    key={minute}
                    variant={selectedMinute === minute ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-center font-normal",
                      selectedMinute === minute && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => handleTimeSelect(selectedHour, minute)}
                  >
                    {minute}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
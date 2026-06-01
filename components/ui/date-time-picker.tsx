"use client"

import * as React from "react"
import { CalendarIcon, ClockIcon, ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatTimestampToUKTime } from "@/lib/date-utils"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TimePickerProps {
  value?: string
  onChange?: (time: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function TimePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Select time",
  className,
}: TimePickerProps) {
  // Parse hour, minute, period from 24h "HH:mm" format value
  const [hours24, mins] = (value || "00:00").split(":")
  const h24 = parseInt(hours24 || "0", 10)
  const period = h24 >= 12 ? "PM" : "AM"
  const h12 = h24 % 12 || 12
  const h12Str = h12.toString()
  const minsStr = mins || "00"

  // Constants
  const HOURS = React.useMemo(() => Array.from({ length: 12 }, (_, i) => (i + 1).toString()), [])
  const MINUTES = React.useMemo(() => Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0")), [])
  const PERIODS = React.useMemo(() => ["AM", "PM"], [])

  const handleTimeChange = (type: "h" | "m" | "p", val: string) => {
    let newH12 = h12Str
    let newM = minsStr
    let newP = period

    if (type === "h") newH12 = val
    if (type === "m") newM = val
    if (type === "p") newP = val

    let h = parseInt(newH12, 10)
    if (newP === "PM" && h < 12) h += 12
    if (newP === "AM" && h === 12) h = 0

    const formattedTime = `${h.toString().padStart(2, "0")}:${newM}`
    onChange?.(formattedTime)
  }

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Hour */}
      <Select 
        value={h12Str} 
        onValueChange={(val) => handleTimeChange("h", val)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[70px] h-9">
          <SelectValue placeholder="Hr" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Minute */}
      <Select 
        value={minsStr} 
        onValueChange={(val) => handleTimeChange("m", val)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[70px] h-9">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* AM/PM */}
      <Select 
        value={period} 
        onValueChange={(val) => handleTimeChange("p", val)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[85px] h-9">
          <SelectValue placeholder="AM/PM" />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface DateTimePickerProps {
  dateValue?: Date
  timeValue?: string
  onDateChange?: (date: Date | undefined) => void
  onTimeChange?: (time: string) => void
  disabled?: boolean
  dateLabel?: string
  timeLabel?: string
  className?: string
}

export function DateTimePicker({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  disabled = false,
  dateLabel = "Date",
  timeLabel = "Time",
  className
}: DateTimePickerProps) {

  return (
    <div className={cn("flex flex-col sm:flex-row gap-4", className)}>
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        <Label htmlFor="date-picker" className="px-1 text-sm">
          {dateLabel}
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start font-normal",
                !dateValue && "text-muted-foreground"
              )}
              disabled={disabled}
              type="button"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateValue ? dateValue.toLocaleDateString() : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={onDateChange}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-3 flex-1 min-w-0">
        <Label htmlFor="time-picker" className="px-1 text-sm">
          {timeLabel}
        </Label>
        <TimePicker
          value={timeValue}
          onChange={onTimeChange}
          disabled={disabled}
          placeholder="Select time"
          className="w-full"
        />
      </div>
    </div>
  )
}

interface FormDateTimePickerProps {
  value?: string // ISO string value from react-hook-form
  onChange?: (isoString: string) => void
  disabled?: boolean
  dateLabel?: string
  timeLabel?: string
  className?: string
  placeholder?: {
    date?: string
    time?: string
  }
}

/**
 * A date-time picker component designed for react-hook-form integration.
 * Takes and returns ISO string values while providing separate date and time selection.
 */
export function FormDateTimePicker({
  value,
  onChange,
  disabled = false,
  dateLabel = "Date",
  timeLabel = "Time",
  className,
  placeholder
}: FormDateTimePickerProps) {

  // Parse the ISO string into date and time components
  const { dateValue, timeValue } = React.useMemo(() => {
    if (!value) {
      return { dateValue: undefined, timeValue: formatTimestampToUKTime(new Date()) }
    }

    try {
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        return { dateValue: undefined, timeValue: "" }
      }

      // Format time as HH:mm
      const timeString = date.toTimeString().slice(0, 5)

      return {
        dateValue: date,
        timeValue: timeString
      }
    } catch {
      return { dateValue: undefined, timeValue: formatTimestampToUKTime(new Date()) }
    }
  }, [value])

  // Helper function to combine date and time into ISO string
  const combineDateTime = React.useCallback((date: Date | undefined, time: string) => {
    if (!date) return ""

    // If no time provided, use current UK time
    const timeToUse = time || formatTimestampToUKTime(new Date())
    const timeParts = timeToUse.split(":")
    const hours = parseInt(timeParts[0] || "9", 10)
    const minutes = parseInt(timeParts[1] || "0", 10)

    // Create new date object to avoid mutating the original
    const combined = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0)

    return combined.toISOString()
  }, [])

  // Handle date changes
  const handleDateChange = React.useCallback((newDate: Date | undefined) => {
    if (!newDate) {
      onChange?.("")
      return
    }

    // Use existing time value or current UK time
    const currentTime = timeValue || formatTimestampToUKTime(new Date())
    const newIsoString = combineDateTime(newDate, currentTime)
    onChange?.(newIsoString)
  }, [combineDateTime, timeValue, onChange])

  // Handle time changes
  const handleTimeChange = React.useCallback((newTime: string) => {
    if (!dateValue) {
      // If no date selected yet, select today's date
      const today = new Date()
      const newIsoString = combineDateTime(today, newTime)
      onChange?.(newIsoString)
      return
    }

    const newIsoString = combineDateTime(dateValue, newTime)
    onChange?.(newIsoString)
  }, [combineDateTime, dateValue, onChange])

  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false)

  return (
    <div className={cn("flex flex-col sm:flex-row gap-4", className)}>
      {/* Date Picker */}
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        <Label className="px-1 text-sm">
          {dateLabel}
        </Label>
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen} modal>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-between font-normal",
                !dateValue && "text-muted-foreground"
              )}
              disabled={disabled}
              type="button"
            >
              <span className="flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue
                  ? dateValue.toLocaleDateString()
                  : placeholder?.date || "Select date"
                }
              </span>
              <ChevronDownIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue}
              captionLayout="dropdown"
              onSelect={(date) => {
                if (date) {
                  handleDateChange(date)
                  setIsDatePickerOpen(false)
                }
              }}
              defaultMonth={dateValue || new Date()}
              startMonth={new Date(new Date().getFullYear(), 0)}
              endMonth={new Date(new Date().getFullYear() + 5, 11)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Picker */}
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        <Label className="px-1 text-sm">
          {timeLabel}
        </Label>
        <TimePicker
          value={timeValue}
          onChange={handleTimeChange}
          disabled={disabled}
          placeholder={placeholder?.time || "Select time"}
          className="w-full"
        />
      </div>
    </div>
  )
}
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
  // Generate all time options in 5-minute intervals (00:00 to 23:55)
  const timeOptions = React.useMemo(() => {
    const options: Array<{ value: string; label: string }> = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const hourStr = hour.toString().padStart(2, "0")
        const minuteStr = minute.toString().padStart(2, "0")
        const timeValue = `${hourStr}:${minuteStr}`

        // Format for display: "HH:MM AM/PM"
        const period = hour >= 12 ? "PM" : "AM"
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        const label = `${displayHour.toString().padStart(2, "0")}:${minuteStr} ${period}`

        options.push({ value: timeValue, label })
      }
    }
    return options
  }, [])

  // Find the current value in options, or round to nearest 5-minute interval
  const selectedValue = React.useMemo(() => {
    if (!value) return undefined

    const parts = value.split(":")
    const hour = parseInt(parts[0] || "9", 10)
    const minute = parseInt(parts[1] || "0", 10)

    // Round minute to nearest 5-minute interval
    const roundedMinute = Math.round(minute / 5) * 5
    const hourStr = hour.toString().padStart(2, "0")
    const minuteStr = roundedMinute.toString().padStart(2, "0")

    return `${hourStr}:${minuteStr}`
  }, [value])

  // Format display value
  const displayValue = React.useMemo(() => {
    if (!value) return ""
    const option = timeOptions.find(opt => opt.value === selectedValue)
    return option?.label || value
  }, [value, selectedValue, timeOptions])

  return (
    <Select
      value={selectedValue}
      onValueChange={(timeValue) => {
        onChange?.(timeValue)
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "w-full justify-start font-normal",
          !value && "text-muted-foreground",
          className
        )}
      >
        <ClockIcon className="mr-2 h-4 w-4" />
        <SelectValue placeholder={placeholder}>
          {displayValue || placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {timeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
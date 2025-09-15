"use client"

import * as React from "react"
import { CalendarIcon, ClockIcon } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [open, setOpen] = React.useState(false)

  // Generate hours (00-23)
  const hours = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, "0")
  )

  // Generate minutes (00-59 in 15-minute intervals)
  const minutes = Array.from({ length: 4 }, (_, i) => 
    (i * 15).toString().padStart(2, "0")
  )

  // Parse current value
  const [selectedHour, selectedMinute] = React.useMemo(() => {
    if (!value) return ["09", "00"]
    const parts = value.split(":")
    return [parts[0] || "09", parts[1] || "00"]
  }, [value])

  const handleTimeChange = (hour: string, minute: string) => {
    const timeValue = `${hour}:${minute}`
    onChange?.(timeValue)
    setOpen(false)
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          type="button"
        >
          <ClockIcon className="mr-2 h-4 w-4" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="flex items-center space-x-2">
          <div className="flex flex-col space-y-2">
            <Label className="text-xs font-medium text-center">Hour</Label>
            <Select
              value={selectedHour}
              onValueChange={(hour) => handleTimeChange(hour, selectedMinute)}
            >
              <SelectTrigger className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hours.map((hour) => (
                  <SelectItem key={hour} value={hour}>
                    {hour}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-lg font-semibold pt-6">:</div>

          <div className="flex flex-col space-y-2">
            <Label className="text-xs font-medium text-center">Minute</Label>
            <Select
              value={selectedMinute}
              onValueChange={(minute) => handleTimeChange(selectedHour, minute)}
            >
              <SelectTrigger className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {minutes.map((minute) => (
                  <SelectItem key={minute} value={minute}>
                    {minute}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
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
  // Debug logging
  React.useEffect(() => {
    console.log('FormDateTimePicker - value:', value)
  }, [value])

  // Parse the ISO string into date and time components
  const { dateValue, timeValue } = React.useMemo(() => {
    if (!value) {
      return { dateValue: undefined, timeValue: "" }
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
      return { dateValue: undefined, timeValue: "" }
    }
  }, [value])

  // Helper function to combine date and time into ISO string
  const combineDateTime = React.useCallback((date: Date | undefined, time: string) => {
    if (!date) return ""
    
    // If no time provided, use default to 09:00
    const timeToUse = time || "09:00"
    const timeParts = timeToUse.split(":")
    const hours = parseInt(timeParts[0] || "9", 10)
    const minutes = parseInt(timeParts[1] || "0", 10)
    
    // Create new date object to avoid mutating the original
    const combined = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0)
    
    return combined.toISOString()
  }, [])

  // Handle date changes
  const handleDateChange = React.useCallback((newDate: Date | undefined) => {
    console.log('handleDateChange - newDate:', newDate, 'timeValue:', timeValue)
    
    if (!newDate) {
      onChange?.("")
      return
    }
    
    // Use existing time value or default
    const currentTime = timeValue || "09:00"
    const newIsoString = combineDateTime(newDate, currentTime)
    console.log('handleDateChange - newIsoString:', newIsoString)
    onChange?.(newIsoString)
  }, [combineDateTime, timeValue, onChange])

  // Handle time changes
  const handleTimeChange = React.useCallback((newTime: string) => {
    console.log('handleTimeChange - newTime:', newTime, 'dateValue:', dateValue)
    
    if (!dateValue) {
      // If no date selected yet, select today's date
      const today = new Date()
      const newIsoString = combineDateTime(today, newTime)
      console.log('handleTimeChange - newIsoString (with today):', newIsoString)
      onChange?.(newIsoString)
      return
    }
    
    const newIsoString = combineDateTime(dateValue, newTime)
    console.log('handleTimeChange - newIsoString:', newIsoString)
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
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
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
              {dateValue 
                ? dateValue.toLocaleDateString() 
                : placeholder?.date || "Pick a date"
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={(date) => {
                handleDateChange(date)
                setIsDatePickerOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Input */}
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        <Label className="px-1 text-sm">
          {timeLabel}
        </Label>
        <Input
          type="time"
          value={timeValue}
          onChange={(e) => handleTimeChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder?.time || "Select time"}
          className="bg-background"
        />
      </div>
    </div>
  )
}
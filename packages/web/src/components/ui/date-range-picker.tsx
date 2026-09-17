"use client"
import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (date: DateRange | undefined) => void
  className?: string
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  return (
    <div className={cn("flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm", className)}>
      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">
        {value?.from ? (
          value.to ? (
            `${format(value.from, "dd/MM/yyyy")} - ${format(value.to, "dd/MM/yyyy")}`
          ) : (
            format(value.from, "dd/MM/yyyy")
          )
        ) : (
          "Seleccionar rango"
        )}
      </span>
    </div>
  )
}

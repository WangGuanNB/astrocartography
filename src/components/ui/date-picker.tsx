"use client";

import * as React from "react";
import { format } from "date-fns";
import { enUS, zhCN, ptBR, es, it } from "date-fns/locale";
import type { Locale } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// 语言映射：将 next-intl 的 locale 映射到 date-fns 的 locale
const localeMap: Record<string, Locale> = {
  en: enUS,
  zh: zhCN,
  pt: ptBR,
  es: es,
  it: it,
};

interface DatePickerProps {
  value?: string; // YYYY-MM-DD 格式
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  id,
}: DatePickerProps) {
  const locale = useLocale();
  const [open, setOpen] = React.useState(false);
  
  // 获取当前语言的 date-fns locale
  const dateFnsLocale = localeMap[locale] || enUS;
  
  // 将字符串转换为 Date 对象
  const selectedDate = value ? new Date(value + "T00:00:00") : undefined;
  
  // 处理日期选择
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // 格式化为 YYYY-MM-DD
      const formatted = format(date, "yyyy-MM-dd");
      onChange(formatted);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-10 text-sm bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white focus:border-purple-500 focus:ring-purple-500",
            !value && "text-gray-400",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(new Date(value + "T00:00:00"), "PPP", { locale: dateFnsLocale })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-gray-900 border-white/20" align="start">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          locale={dateFnsLocale}
          initialFocus
          className="bg-gray-900 text-white"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-medium text-white",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white hover:bg-white/10"
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-white/10 [&:has([aria-selected])]:bg-purple-500/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: cn(
              "h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-white hover:bg-white/10 hover:text-white rounded-md"
            ),
            day_range_end: "day-range-end",
            day_selected: "bg-purple-600 text-white hover:bg-purple-700 hover:text-white focus:bg-purple-600 focus:text-white",
            day_today: "bg-white/10 text-white font-semibold",
            day_outside: "day-outside text-gray-500 opacity-50 aria-selected:bg-white/10 aria-selected:text-gray-500 aria-selected:opacity-30",
            day_disabled: "text-gray-500 opacity-50",
            day_range_middle: "aria-selected:bg-purple-500/20 aria-selected:text-white",
            day_hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}




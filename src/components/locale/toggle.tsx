"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";

import { MdLanguage } from "react-icons/md";
import { localeNames, locales } from "@/i18n/locale";

export default function ({ isIcon = false }: { isIcon?: boolean }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // 获取当前语言，如果没有locale参数则说明是默认语言（英文）
  const locale = (params.locale as string) || "en";

  const handleSwitchLanguage = (value: string) => {
    if (value !== locale) {
      // 获取当前路径（usePathname 返回的路径不包含语言前缀）
      let currentPath = pathname || '/';
      
      // 确保 pathname 中不包含语言前缀（防御性检查）
      // 如果 pathname 意外包含了语言前缀，先移除它
      const localePrefixes = locales.join('|');
      const pathWithLocalePattern = new RegExp(`^/(${localePrefixes})(/.*)?$`);
      if (pathWithLocalePattern.test(currentPath)) {
        // 如果路径以语言前缀开头，移除语言前缀
        currentPath = currentPath.replace(new RegExp(`^/(${localePrefixes})`), '') || '/';
      }
      
      // 构建目标 URL
      // 如果目标语言是默认语言（en），且 localePrefix 是 "as-needed"，则不需要前缀
      let targetUrl = '';
      if (value === 'en') {
        // 默认语言：直接使用路径，不需要语言前缀
        targetUrl = currentPath === '/' ? '/' : currentPath;
      } else {
        // 其他语言：添加语言前缀
        targetUrl = currentPath === '/' ? `/${value}/` : `/${value}${currentPath}`;
      }
      
      // 统一使用 window.location 进行导航，确保生产环境正常工作
      window.location.href = targetUrl;
    }
  };

  return (
    <Select 
      value={locale || "en"} 
      onValueChange={handleSwitchLanguage}
    >
      <SelectTrigger className="flex h-9 items-center gap-1 border-none px-2 text-muted-foreground outline-hidden hover:bg-transparent focus:ring-0 focus:ring-offset-0 xl:h-10">
        <MdLanguage className="text-xl" />
        {!isIcon && (
          <span className="hidden xl:block">{localeNames[locale]}</span>
        )}
      </SelectTrigger>
      <SelectContent className="z-50 bg-background">
        {Object.keys(localeNames).map((key: string) => {
          const name = localeNames[key];
          return (
            <SelectItem 
              className="cursor-pointer px-4" 
              key={key} 
              value={key}
            >
              {name}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

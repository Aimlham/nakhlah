import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  niche: string;
  onNicheChange: (value: string) => void;
  platform: string;
  onPlatformChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  categories: string[];
  niches: string[];
  platforms: string[];
}

export function FilterBar({
  search, onSearchChange,
  category, onCategoryChange,
  niche, onNicheChange,
  platform, onPlatformChange,
  sort, onSortChange,
  categories, niches, platforms,
}: FilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="ابحث عن منتجات..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="ps-9"
          data-testid="input-search"
        />
      </div>
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="sm:w-[160px]" data-testid="select-category">
            <SelectValue placeholder="الفئة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الفئات</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={niche} onValueChange={onNicheChange}>
          <SelectTrigger className="sm:w-[160px]" data-testid="select-niche">
            <SelectValue placeholder="النيتش" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع النيتشات</SelectItem>
            {niches.map(n => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={platform} onValueChange={onPlatformChange}>
          <SelectTrigger className="sm:w-[160px]" data-testid="select-platform">
            <SelectValue placeholder="المنصة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المنصات</SelectItem>
            {platforms.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="sm:w-[180px]" data-testid="select-sort">
            <SelectValue placeholder="ترتيب حسب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">الأحدث أولاً</SelectItem>
            <SelectItem value="opportunity">أعلى فرصة</SelectItem>
            <SelectItem value="margin">أعلى هامش ربح</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

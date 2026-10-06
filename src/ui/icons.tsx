import { Building2, Plane, Wrench, Package, BookOpen, Users, GraduationCap, ShieldAlert, SearchCheck, FolderArchive, CalendarClock, BookMarked, Landmark, Handshake, FileText } from 'lucide-react'
import type { Category } from '../content/city'

export const CATEGORY_ICON: Record<Category, typeof Plane> = {
  management: Building2, aircraft: Plane, maintenance: Wrench, components: Package, data: BookOpen, personnel: Users, training: GraduationCap,
  safety: ShieldAlert, compliance: SearchCheck, records: FolderArchive, planning: CalendarClock, moe: BookMarked, authority: Landmark,
  contractor: Handshake, documents: FileText,
}
export function CatIcon({ cat, size = 14 }: { cat: Category; size?: number }) {
  const I = CATEGORY_ICON[cat]
  return <I size={size} strokeWidth={1.75} aria-hidden />
}

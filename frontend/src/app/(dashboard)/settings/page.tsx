"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listBatches, listEntries, type Batch, type Inspection } from "@/lib/api";
import { toast } from "sonner";
import {
  User,
  Building2,
  Users,
  Shield,
  Scan,
  FileSpreadsheet,
  Settings2,
  Bell,
  ScrollText,
  Lock,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Key,
} from "lucide-react";

// ─── Section Config ─────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "factories", label: "Factory Management", icon: Building2 },
  { id: "users", label: "User Management", icon: Users },
  { id: "roles", label: "Roles & Permissions", icon: Shield },
  { id: "ocr", label: "OCR Configuration", icon: Scan },
  { id: "exports", label: "Export Settings", icon: FileSpreadsheet },
  { id: "queue", label: "Processing Queue", icon: Settings2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "audit", label: "Audit Logs", icon: ScrollText },
  { id: "security", label: "Security", icon: Lock },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ─── Settings Page ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  function markDirty() { setDirty(true); }
  function resetDirty() { setDirty(false); }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Settings</h1>
          <p className="text-xs text-zinc-500">System configuration and management</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <AlertCircle className="size-3" />
              Unsaved changes
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={!dirty}
            onClick={() => { resetDirty(); toast.success("Changes discarded."); }}
            className="border-zinc-700 text-zinc-300"
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Reset
          </Button>
          <Button
            size="sm"
            disabled={!dirty || saving}
            onClick={() => { setSaving(true); setTimeout(() => { setSaving(false); resetDirty(); toast.success("Settings saved."); }, 800); }}
            className="bg-amber-600 hover:bg-amber-500 text-white"
          >
            {saving ? (
              <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Saving...</>
            ) : (
              <><Save className="mr-1.5 size-3.5" /> Save</>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* ─── Left Sidebar Navigation ─── */}
        <aside className="w-56 border-r border-zinc-800 shrink-0 hidden md:block overflow-y-auto">
          <nav className="p-3 space-y-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left ${
                    activeSection === section.id
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile section selector */}
        <div className="md:hidden w-full border-b border-zinc-800 p-3">
          <Select value={activeSection} onValueChange={(v) => setActiveSection((v ?? "profile") as SectionId)}>
            <SelectTrigger className="w-full bg-zinc-900 border-zinc-700 text-zinc-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTIONS.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ─── Content Area ─── */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === "profile" && <ProfileSection onDirty={markDirty} />}
          {activeSection === "factories" && <FactoriesSection />}
          {activeSection === "users" && <UsersSection />}
          {activeSection === "roles" && <RolesSection />}
          {activeSection === "ocr" && <OCRConfigSection onDirty={markDirty} />}
          {activeSection === "exports" && <ExportSettingsSection onDirty={markDirty} />}
          {activeSection === "queue" && <QueueSection onDirty={markDirty} />}
          {activeSection === "notifications" && <NotificationsSection onDirty={markDirty} />}
          {activeSection === "audit" && <AuditSection />}
          {activeSection === "security" && <SecuritySection onDirty={markDirty} />}
        </div>
      </div>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────────────

function SectionCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 mb-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        {desc && <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function FormField({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      {desc && <p className="text-xs text-zinc-500">{desc}</p>}
      {children}
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
      <div className="mb-3 text-zinc-600">{icon}</div>
      <p className="text-sm font-medium text-zinc-400">{title}</p>
      {desc && <p className="text-xs mt-1">{desc}</p>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Profile
// ═════════════════════════════════════════════════════════════════════════════

function ProfileSection({ onDirty }: { onDirty: () => void }) {
  const [name, setName] = useState("Admin User");
  const [email, setEmail] = useState("admin@mahindra.com");
  const [role, setRole] = useState("Administrator");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="max-w-2xl">
      <SectionCard title="Profile Information" desc="Manage your personal information">
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="size-14 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-lg">
              {name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">{name}</p>
              <p className="text-xs text-zinc-500">{role}</p>
            </div>
          </div>
          <FormField label="Full Name">
            <Input value={name} onChange={(e) => { setName(e.target.value); onDirty(); }} className="bg-zinc-900 border-zinc-700 text-zinc-200" />
          </FormField>
          <FormField label="Email Address">
            <Input value={email} onChange={(e) => { setEmail(e.target.value); onDirty(); }} className="bg-zinc-900 border-zinc-700 text-zinc-200" />
          </FormField>
          <FormField label="Role">
            <Input value={role} disabled className="bg-zinc-900 border-zinc-700 text-zinc-400 opacity-60" />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Change Password" desc="Update your account password">
        <div className="space-y-4">
          <FormField label="Current Password">
            <div className="relative">
              <Input type={showPw ? "text" : "password"} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="bg-zinc-900 border-zinc-700 text-zinc-200 pr-10" />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"><Eye className="size-3.5" /></button>
            </div>
          </FormField>
          <FormField label="New Password">
            <Input type={showPw ? "text" : "password"} value={newPw} onChange={(e) => { setNewPw(e.target.value); onDirty(); }} className="bg-zinc-900 border-zinc-700 text-zinc-200" />
          </FormField>
          <FormField label="Confirm New Password">
            <Input type={showPw ? "text" : "password"} value={confirmPw} onChange={(e) => { setConfirmPw(e.target.value); onDirty(); }} className="bg-zinc-900 border-zinc-700 text-zinc-200" />
          </FormField>
        </div>
      </SectionCard>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Factory Management
// ═════════════════════════════════════════════════════════════════════════════

function FactoriesSection() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listBatches({ page_size: 200 })
      .then((data) => { if (data) setBatches(data.batches); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const factories = new Map<string, { plants: Set<string>; lines: Set<string>; batchCount: number }>();
  batches.forEach((b) => {
    const f = b.factory_name || "Unnamed Factory";
    if (!factories.has(f)) factories.set(f, { plants: new Set(), lines: new Set(), batchCount: 0 });
    const entry = factories.get(f)!;
    entry.batchCount++;
    if (b.plant_name) entry.plants.add(b.plant_name);
    if (b.line_name) entry.lines.add(b.line_name);
  });

  if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-zinc-900/50 animate-pulse" />)}</div>;

  if (factories.size === 0) return <EmptyState icon={<Building2 className="size-10" />} title="No factories found" desc="Factories will appear once batches are created." />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{factories.size} factory{factories.size !== 1 ? "ies" : "y"}</p>
      </div>
      {Array.from(factories.entries()).map(([name, data]) => (
        <div key={name} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">{name}</h3>
              <p className="text-xs text-zinc-500">
                {data.batchCount} batch{data.batchCount !== 1 ? "es" : ""}
                {data.plants.size > 0 && ` \u00B7 ${data.plants.size} plant${data.plants.size !== 1 ? "s" : ""}`}
                {data.lines.size > 0 && ` \u00B7 ${data.lines.size} line${data.lines.size !== 1 ? "s" : ""}`}
              </p>
            </div>
            <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">{data.batchCount} batches</Badge>
          </div>
          {(data.plants.size > 0 || data.lines.size > 0) && (
            <div className="flex flex-wrap gap-4 text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
              {data.plants.size > 0 && <span>Plants: {Array.from(data.plants).join(", ")}</span>}
              {data.lines.size > 0 && <span>Lines: {Array.from(data.lines).join(", ")}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: User Management
// ═════════════════════════════════════════════════════════════════════════════

function UsersSection() {
  const [users] = useState([
    { id: 1, name: "Admin User", email: "admin@mahindra.com", role: "Administrator", status: "active", lastActive: "2026-07-08" },
    { id: 2, name: "Ramesh Kumar", email: "ramesh@mahindra.com", role: "Supervisor", status: "active", lastActive: "2026-07-07" },
    { id: 3, name: "Suresh Patel", email: "suresh@mahindra.com", role: "Operator", status: "active", lastActive: "2026-07-06" },
    { id: 4, name: "Amit Sharma", email: "amit@mahindra.com", role: "Quality Inspector", status: "active", lastActive: "2026-07-08" },
    { id: 5, name: "Vijay Singh", email: "vijay@mahindra.com", role: "Operator", status: "inactive", lastActive: "2026-06-28" },
  ]);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Role</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Last Active</th>
              <th className="py-3 px-4 w-20" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="py-3 px-4 font-medium text-zinc-200">{u.name}</td>
                <td className="py-3 px-4 text-zinc-400">{u.email}</td>
                <td className="py-3 px-4 text-zinc-300">{u.role}</td>
                <td className="py-3 px-4">
                  <Badge
                    variant={u.status === "active" ? "default" : "secondary"}
                    className={`text-[10px] ${u.status === "active" ? "bg-green-900/30 text-green-400 border-green-800" : "bg-zinc-800 text-zinc-500"}`}
                  >
                    {u.status}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-zinc-500 text-xs">{u.lastActive}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-xs" className="text-zinc-500"><Pencil className="size-3.5" /></Button>
                    <Button variant="ghost" size="icon-xs" className="text-zinc-500" onClick={() => setDeleteId(u.id)}><Trash2 className="size-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-zinc-200">Delete User</DialogTitle>
            <DialogDescription className="text-zinc-500">This action cannot be undone. The user will be permanently removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="border-zinc-700 text-zinc-300">Cancel</Button>
            <Button variant="destructive" onClick={() => { setDeleteId(null); toast.success("User deleted."); }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Roles & Permissions
// ═════════════════════════════════════════════════════════════════════════════

function RolesSection() {
  const roles = [
    { name: "Administrator", users: 1, permissions: "Full system access" },
    { name: "Supervisor", users: 1, permissions: "Verify, export, manage operators" },
    { name: "Quality Inspector", users: 1, permissions: "Verify inspection data" },
    { name: "Operator", users: 2, permissions: "Upload, view, basic verify" },
    { name: "Viewer", users: 0, permissions: "Read-only access" },
  ];

  return (
    <div className="space-y-3">
      {roles.map((r) => (
        <div key={r.name} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">{r.name}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{r.permissions}</p>
          </div>
          <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">{r.users} user{r.users !== 1 ? "s" : ""}</Badge>
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: OCR Configuration
// ═════════════════════════════════════════════════════════════════════════════

function OCRConfigSection({ onDirty }: { onDirty: () => void }) {
  const [engine, setEngine] = useState("paddleocr");
  const [lang, setLang] = useState("en");
  const [confThreshold, setConfThreshold] = useState("70");
  const [dpi, setDpi] = useState("300");
  const [denoise, setDenoise] = useState(true);
  const [deskew, setDeskew] = useState(true);
  const [clahe, setClahe] = useState(true);

  return (
    <div className="max-w-2xl space-y-6">
      <SectionCard title="OCR Engine" desc="Configure the OCR processing engine">
        <div className="space-y-4">
          <FormField label="Engine" desc="Which OCR engine to use for text extraction">
            <Select value={engine} onValueChange={(v) => { setEngine(v ?? ""); onDirty(); }}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-300"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paddleocr">PaddleOCR (Recommended)</SelectItem>
                <SelectItem value="easyocr">EasyOCR (Fallback)</SelectItem>
                <SelectItem value="tesseract">Tesseract</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Language" desc="Primary language for OCR">
            <Select value={lang} onValueChange={(v) => { setLang(v ?? ""); onDirty(); }}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-300"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="en-IN">English (India)</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Confidence Threshold (%)" desc="Minimum confidence to auto-accept OCR results">
            <Input type="number" value={confThreshold} onChange={(e) => { setConfThreshold(e.target.value); onDirty(); }} className="bg-zinc-900 border-zinc-700 text-zinc-200 w-32" min={0} max={100} />
          </FormField>
          <FormField label="PDF DPI" desc="DPI for PDF-to-image conversion">
            <Input type="number" value={dpi} onChange={(e) => { setDpi(e.target.value); onDirty(); }} className="bg-zinc-900 border-zinc-700 text-zinc-200 w-32" min={72} max={600} />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Image Enhancement" desc="Pre-processing pipeline settings">
        <div className="space-y-3">
          {[
            { label: "Denoise", key: denoise, set: setDenoise, desc: "Reduce image noise before OCR" },
            { label: "Deskew", key: deskew, set: setDeskew, desc: "Auto-rotate skewed pages" },
            { label: "CLAHE Contrast", key: clahe, set: setClahe, desc: "Enhance local contrast for better OCR" },
          ].map((opt) => (
            <div key={opt.label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-zinc-300">{opt.label}</p>
                <p className="text-xs text-zinc-500">{opt.desc}</p>
              </div>
              <button
                onClick={() => { opt.set(!opt.key); onDirty(); }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${opt.key ? "bg-amber-600" : "bg-zinc-700"}`}
              >
                <span className={`inline-block size-3.5 rounded-full bg-white transition-transform ${opt.key ? "translate-x-[1.125rem]" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Export Settings
// ═════════════════════════════════════════════════════════════════════════════

function ExportSettingsSection({ onDirty }: { onDirty: () => void }) {
  const [defaultFormat, setDefaultFormat] = useState("xlsx");
  const [autoExport, setAutoExport] = useState(false);
  const [naming, setNaming] = useState("batch_no");
  const [includeRaw, setIncludeRaw] = useState(false);

  return (
    <div className="max-w-2xl space-y-6">
      <SectionCard title="Export Defaults" desc="Configure export behavior">
        <div className="space-y-4">
          <FormField label="Default Format" desc="Preferred export file format">
            <Select value={defaultFormat} onValueChange={(v) => { setDefaultFormat(v ?? ""); onDirty(); }}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-300 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Naming Convention" desc="How export files are named">
            <Select value={naming} onValueChange={(v) => { setNaming(v ?? ""); onDirty(); }}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-300 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="batch_no">By Batch Number</SelectItem>
                <SelectItem value="date">By Date</SelectItem>
                <SelectItem value="factory">By Factory Name</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-zinc-300">Auto-Export on Completion</p>
              <p className="text-xs text-zinc-500">Automatically generate export when batch completes</p>
            </div>
            <button onClick={() => { setAutoExport(!autoExport); onDirty(); }} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoExport ? "bg-amber-600" : "bg-zinc-700"}`}>
              <span className={`inline-block size-3.5 rounded-full bg-white transition-transform ${autoExport ? "translate-x-[1.125rem]" : "translate-x-1"}`} />
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-zinc-300">Include Raw OCR</p>
              <p className="text-xs text-zinc-500">Include raw OCR text in exports</p>
            </div>
            <button onClick={() => { setIncludeRaw(!includeRaw); onDirty(); }} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${includeRaw ? "bg-amber-600" : "bg-zinc-700"}`}>
              <span className={`inline-block size-3.5 rounded-full bg-white transition-transform ${includeRaw ? "translate-x-[1.125rem]" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Processing Queue
// ═════════════════════════════════════════════════════════════════════════════

function QueueSection({ onDirty }: { onDirty: () => void }) {
  const [workers, setWorkers] = useState("8");
  const [maxRetries, setMaxRetries] = useState("3");
  const [timeout, setTimeout_] = useState("600");
  const [concurrency, setConcurrency] = useState("4");
  const [prefetch, setPrefetch] = useState("1");

  return (
    <div className="max-w-2xl space-y-6">
      <SectionCard title="Worker Configuration" desc="Celery worker pool settings">
        <div className="space-y-4">
          <FormField label="Worker Count" desc="Number of parallel OCR workers">
            <Input type="number" value={workers} onChange={(e) => { setWorkers(e.target.value); onDirty(); }} className="bg-zinc-900 border-zinc-700 text-zinc-200 w-32" min={1} max={32} />
          </FormField>
          <FormField label="Max Retries" desc="Maximum retry attempts for failed pages">
            <Input type="number" value={maxRetries} onChange={(e) => { setMaxRetries(e.target.value); onDirty(); }} className="bg-zinc-900 border-zinc-700 text-zinc-200 w-32" min={0} max={10} />
          </FormField>
          <FormField label="Soft Time Limit (s)" desc="Maximum processing time per page before timeout">
            <Input type="number" value={timeout} onChange={(e) => { setTimeout_(e.target.value); onDirty(); }} className="bg-zinc-900 border-zinc-700 text-zinc-200 w-32" min={30} max={3600} />
          </FormField>
          <FormField label="Prefetch Multiplier" desc="Tasks to prefetch per worker">
            <Input type="number" value={prefetch} onChange={(e) => { setPrefetch(e.target.value); onDirty(); }} className="bg-zinc-900 border-zinc-700 text-zinc-200 w-32" min={1} max={8} />
          </FormField>
        </div>
      </SectionCard>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Notifications
// ═════════════════════════════════════════════════════════════════════════════

function NotificationsSection({ onDirty }: { onDirty: () => void }) {
  const [emailNotif, setEmailNotif] = useState(true);
  const [batchComplete, setBatchComplete] = useState(true);
  const [batchFailed, setBatchFailed] = useState(true);
  const [needsReview, setNeedsReview] = useState(true);
  const [exportReady, setExportReady] = useState(false);
  const [emailAddress, setEmailAddress] = useState("admin@mahindra.com");
  const [webhookUrl, setWebhookUrl] = useState("");

  const toggles = [
    { label: "Email Notifications", key: emailNotif, set: setEmailNotif, desc: "Receive email alerts for events" },
    { label: "Batch Complete", key: batchComplete, set: setBatchComplete, desc: "When a batch finishes processing" },
    { label: "Batch Failed", key: batchFailed, set: setBatchFailed, desc: "When a batch encounters errors" },
    { label: "Needs Review", key: needsReview, set: setNeedsReview, desc: "When pages require manual review" },
    { label: "Export Ready", key: exportReady, set: setExportReady, desc: "When an export file is generated" },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <SectionCard title="Notification Preferences" desc="Configure which events trigger notifications">
        <div className="space-y-2">
          {toggles.map((t) => (
            <div key={t.label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-zinc-300">{t.label}</p>
                <p className="text-xs text-zinc-500">{t.desc}</p>
              </div>
              <button
                onClick={() => { t.set(!t.key); onDirty(); }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${t.key ? "bg-amber-600" : "bg-zinc-700"}`}
              >
                <span className={`inline-block size-3.5 rounded-full bg-white transition-transform ${t.key ? "translate-x-[1.125rem]" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Notification Channels" desc="Where to send notifications">
        <div className="space-y-4">
          <FormField label="Email Address" desc="Primary notification email">
            <Input value={emailAddress} onChange={(e) => { setEmailAddress(e.target.value); onDirty(); }} className="bg-zinc-900 border-zinc-700 text-zinc-200" />
          </FormField>
          <FormField label="Webhook URL (Optional)" desc="HTTP endpoint for webhook callbacks">
            <Input value={webhookUrl} onChange={(e) => { setWebhookUrl(e.target.value); onDirty(); }} placeholder="https://hooks.example.com/notify" className="bg-zinc-900 border-zinc-700 text-zinc-200" />
          </FormField>
        </div>
      </SectionCard>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Audit Logs
// ═════════════════════════════════════════════════════════════════════════════

function AuditSection() {
  const [entries, setEntries] = useState<Inspection[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      listEntries(),
      listBatches({ page_size: 50 }),
    ]).then(([e, b]) => {
      if (e) setEntries(e.slice(0, 100));
      if (b) setBatches(b.batches);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-zinc-900/50 animate-pulse" />)}</div>;

  const auditItems = [
    ...entries.map((e) => ({
      type: "inspection" as const,
      id: e.id,
      action: e.status === "verified" ? "Verified" : e.status === "failed" ? "Failed" : e.status === "needs_review" ? "Marked for Review" : "Updated",
      target: `Inspection #${e.id} - ${e.tractor_no || "Unidentified"}`,
      user: e.verified_by || "system",
      timestamp: e.updated_at || e.created_at,
      status: e.status,
    })),
    ...batches.map((b) => ({
      type: "batch" as const,
      id: b.id,
      action: b.status === "completed" ? "Completed" : b.status === "queued" ? "Queued" : b.status === "processing" ? "Started Processing" : b.deleted_at ? "Archived" : "Updated",
      target: `Batch ${b.batch_no}`,
      user: b.operator || "system",
      timestamp: b.updated_at || b.created_at,
      status: b.status,
    })),
  ].sort((a, b) => {
    const da = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const db = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return db - da;
  }).slice(0, 50);

  const filtered = auditItems.filter(
    (item) =>
      item.target.toLowerCase().includes(search.toLowerCase()) ||
      item.action.toLowerCase().includes(search.toLowerCase()) ||
      item.user.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search audit logs..."
          className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-200"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<ScrollText className="size-10" />} title="No audit entries found" desc="Try a different search term." />
      ) : (
        <div className="space-y-1">
          {filtered.map((item, i) => (
            <div key={`${item.type}-${item.id}-${i}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-800/30 transition-colors text-sm">
              <div className={`size-2 rounded-full shrink-0 ${
                item.status === "verified" || item.status === "completed" ? "bg-green-500" :
                item.status === "failed" ? "bg-red-500" :
                item.status === "needs_review" || item.status === "waiting_review" ? "bg-amber-500" :
                "bg-zinc-600"
              }`} />
              <span className="w-24 text-xs text-zinc-500 font-mono shrink-0">
                {item.timestamp ? new Date(item.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "\u2014"}
              </span>
              <span className="text-zinc-300 font-medium min-w-[120px]">{item.action}</span>
              <span className="text-zinc-400 flex-1 truncate">{item.target}</span>
              <span className="text-xs text-zinc-500 shrink-0">by {item.user}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Security
// ═════════════════════════════════════════════════════════════════════════════

function SecuritySection({ onDirty }: { onDirty: () => void }) {
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [minPasswordLength, setMinPasswordLength] = useState("8");
  const [requireMfa, setRequireMfa] = useState(false);
  const [mfaMethod, setMfaMethod] = useState("app");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="max-w-2xl space-y-6">
      <SectionCard title="Session & Password Policy" desc="Authentication security settings">
        <div className="space-y-4">
          <FormField label="Session Timeout (minutes)" desc="Auto-logout after inactivity">
            <Input type="number" value={sessionTimeout} onChange={(e) => { setSessionTimeout(e.target.value); onDirty(); }} className="bg-zinc-900 border-zinc-700 text-zinc-200 w-32" min={5} max={1440} />
          </FormField>
          <FormField label="Minimum Password Length" desc="Required minimum characters for passwords">
            <Input type="number" value={minPasswordLength} onChange={(e) => { setMinPasswordLength(e.target.value); onDirty(); }} className="bg-zinc-900 border-zinc-700 text-zinc-200 w-32" min={6} max={32} />
          </FormField>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-zinc-300">Require Multi-Factor Authentication</p>
              <p className="text-xs text-zinc-500">Enforce MFA for all users</p>
            </div>
            <button onClick={() => { setRequireMfa(!requireMfa); onDirty(); }} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${requireMfa ? "bg-amber-600" : "bg-zinc-700"}`}>
              <span className={`inline-block size-3.5 rounded-full bg-white transition-transform ${requireMfa ? "translate-x-[1.125rem]" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="API Key" desc="Programmatic access key for integrations">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                value={showApiKey ? apiKey : "\u2022".repeat(apiKey.length)}
                readOnly
                className="bg-zinc-900 border-zinc-700 text-zinc-200 font-mono text-xs pr-10"
              />
              <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                {showApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(apiKey); toast.success("API key copied."); }} className="border-zinc-700 text-zinc-300 shrink-0">
              <Copy className="mr-1 size-3.5" />
              Copy
            </Button>
          </div>
          <p className="text-xs text-zinc-500">This key grants programmatic access. Keep it secure.</p>
        </div>
      </SectionCard>
    </div>
  );
}

import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import type { TacticalScenarioTracingTemplate } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalEditorHudLayout } from "@/plugins/characterCombat/editor/lib/hudLayouts";
import type { TacticalEditorTemplateAsset } from "@/plugins/characterCombat/editor/redux/tacticalEditorSlice";

type TracingTemplateNumberField = "x" | "y" | "width" | "height" | "rotation";

type TacticalEditorTracingTemplateHudProps = {
  layout: TacticalEditorHudLayout;
  onLayoutChange: (layout: TacticalEditorHudLayout) => void;
  template: TacticalScenarioTracingTemplate | undefined;
  availableTemplates: TacticalEditorTemplateAsset[];
  busy: boolean;
  message: { kind: "error" | "success"; text: string } | null;
  editing: boolean;
  onSelectTemplate: (imagePath: string) => void | Promise<void>;
  onUploadTemplate: (file: File) => void | Promise<void>;
  onToggleEditing: () => void;
  onResetFit: () => void | Promise<void>;
  onUpdateTemplate: (update: Partial<TacticalScenarioTracingTemplate>) => void;
  onUpdateTemplateNumber: (field: TracingTemplateNumberField, value: number) => void;
  onRemoveTemplate: () => void;
};

const TacticalEditorTracingTemplateHud = ({
  layout,
  onLayoutChange,
  template,
  availableTemplates,
  busy,
  message,
  editing,
  onSelectTemplate,
  onUploadTemplate,
  onToggleEditing,
  onResetFit,
  onUpdateTemplate,
  onUpdateTemplateNumber,
  onRemoveTemplate,
}: TacticalEditorTracingTemplateHudProps) => (
  <FloatingPluginHud
    title="Tracing Template"
    layout={layout}
    onLayoutChange={onLayoutChange}
    className="w-72 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)"
  >
    <div className="max-h-[70vh] overflow-y-auto py-1 pr-1">
      <div className="mb-2 normal-case text-(--hud-text-dim)">
        Editor-only reference image rendered beneath the grid.
      </div>
      <label className="mb-2 block font-bold text-cyan-200">Template image
        <select
          aria-label="Template image"
          value={template?.imagePath ?? ""}
          disabled={busy}
          onChange={(event) => void onSelectTemplate(event.target.value)}
          className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[9px] normal-case text-slate-100 disabled:opacity-40"
        >
          <option value="">Choose an image</option>
          {template
            && !availableTemplates.some((asset) => asset.imagePath === template.imagePath)
            && <option value={template.imagePath}>Current template</option>}
          {availableTemplates.map((asset) => (
            <option key={asset.id} value={asset.imagePath}>
              {asset.label}{asset.source === "uploaded" ? " (uploaded)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="mb-2 block border border-cyan-600 px-2 py-2 text-center font-bold text-cyan-100">
        {busy ? "Working…" : "Upload image"}
        <input
          aria-label="Upload tracing template"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void onUploadTemplate(file);
          }}
        />
      </label>
      {template && <>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={editing}
            disabled={!template.visible}
            onClick={onToggleEditing}
            className={`h-8 border font-bold disabled:opacity-40 ${editing ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-cyan-600 text-cyan-100"}`}
          >
            {editing ? "Finish adjusting" : "Adjust on map"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onResetFit()}
            className="h-8 border border-amber-500 font-bold text-amber-100 disabled:opacity-40"
          >
            Reset to fit
          </button>
        </div>
        <div className="mb-2 grid grid-cols-2 gap-2">
          {(["x", "y", "width", "height", "rotation"] as const).map((field) => (
            <label key={field} className="font-bold text-cyan-200">{field}
              <input
                aria-label={`Template ${field}`}
                type="number"
                min={field === "width" || field === "height" ? 0.25 : undefined}
                step="0.1"
                value={Number(template[field].toFixed(3))}
                onChange={(event) => onUpdateTemplateNumber(
                  field,
                  Number.parseFloat(event.target.value),
                )}
                className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-2 text-[9px] normal-case text-slate-100"
              />
            </label>
          ))}
          <label className="flex items-end">
            <span className="flex h-7 w-full items-center gap-2 border border-(--hud-border) px-2 font-bold text-cyan-200">
              <input
                aria-label="Lock template aspect ratio"
                type="checkbox"
                checked={template.lockAspectRatio}
                onChange={(event) => onUpdateTemplate({
                  lockAspectRatio: event.target.checked,
                })}
              />
              Lock ratio
            </span>
          </label>
        </div>
        <label className="mb-2 block font-bold text-cyan-200">
          Opacity · {Math.round(template.opacity * 100)}%
          <input
            aria-label="Template opacity"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={template.opacity}
            onChange={(event) => onUpdateTemplate({
              opacity: Number.parseFloat(event.target.value),
            })}
            className="mt-1 w-full"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex h-8 items-center gap-2 border border-(--hud-border) px-2 font-bold text-cyan-200">
            <input
              aria-label="Show tracing template on map"
              type="checkbox"
              checked={template.visible}
              onChange={(event) => onUpdateTemplate({ visible: event.target.checked })}
            />
            Visible
          </label>
          <button
            type="button"
            onClick={onRemoveTemplate}
            className="h-8 border border-red-500 font-bold text-red-100"
          >
            Remove
          </button>
        </div>
      </>}
      {message && (
        <div
          role="status"
          className={`mt-2 border p-2 normal-case ${message.kind === "error" ? "border-red-500/70 bg-red-950/60 text-red-100" : "border-emerald-500/70 bg-emerald-950/50 text-emerald-100"}`}
        >
          {message.text}
        </div>
      )}
    </div>
  </FloatingPluginHud>
);

export default TacticalEditorTracingTemplateHud;

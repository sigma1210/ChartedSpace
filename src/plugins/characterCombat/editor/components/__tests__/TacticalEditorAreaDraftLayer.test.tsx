/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { RaisedAreaDraft } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import TacticalEditorAreaDraftLayer, {
  type TacticalEditorAreaDraftPreview,
} from "../TacticalEditorAreaDraftLayer";

const draft = (segments: RaisedAreaDraft["segments"]): RaisedAreaDraft => ({
  target: "area",
  start: { x: 1, y: 1 },
  current: { x: 5, y: 4 },
  hover: { x: 1, y: 1 },
  segments,
  outgoingControl: null,
});

const renderLayer = ({
  areaDraft = draft([]),
  preview = { segment: null, cells: [] },
  penNodeDrag = null,
  onBeginControlDrag = jest.fn(),
}: {
  areaDraft?: RaisedAreaDraft | null;
  preview?: TacticalEditorAreaDraftPreview;
  penNodeDrag?: { anchor: { x: number; y: number }; handle: { x: number; y: number } } | null;
  onBeginControlDrag?: (segmentIndex: number) => void;
} = {}) => render(<svg>
  <TacticalEditorAreaDraftLayer
    draft={areaDraft}
    preview={preview}
    penNodeDrag={penNodeDrag}
    onBeginControlDrag={onBeginControlDrag}
  />
</svg>);

describe("tactical editor area draft layer", () => {
  it("renders enclosed preview cells, line segments, and endpoint markers", () => {
    renderLayer({
      areaDraft: draft([{ kind: "line", from: { x: 1, y: 1 }, to: { x: 5, y: 1 } }]),
      preview: { segment: null, cells: [{ x: 2, y: 2 }, { x: 3, y: 2 }] },
    });

    const layer = screen.getByTestId("raised-area-draft-preview");
    expect(layer.querySelectorAll("rect")).toHaveLength(2);
    expect(screen.getByTestId("raised-area-draft-segment-0").getAttribute("x2")).toBe("5");
    expect(layer.querySelector('circle[r="0.3"]')?.getAttribute("cx")).toBe("1");
    expect(layer.querySelector('circle[r="0.22"]')?.getAttribute("cx")).toBe("5");
  });

  it("renders a quadratic segment and starts its control drag without bubbling", () => {
    const onBeginControlDrag = jest.fn();
    const onParentPointerDown = jest.fn();
    render(<svg onPointerDown={onParentPointerDown}>
      <TacticalEditorAreaDraftLayer
        draft={draft([{
          kind: "quadratic",
          from: { x: 1, y: 1 },
          control: { x: 3, y: 4 },
          to: { x: 5, y: 1 },
        }])}
        preview={{ segment: null, cells: [] }}
        penNodeDrag={null}
        onBeginControlDrag={onBeginControlDrag}
      />
    </svg>);

    expect(screen.getByTestId("raised-area-draft-segment-0").getAttribute("d")).toBe("M 1 1 Q 3 4 5 1");
    const handle = screen.getByTestId("raised-area-draft-segment-0-control-handle");
    handle.setPointerCapture = jest.fn();
    fireEvent.pointerDown(handle, { pointerId: 7 });

    expect(onBeginControlDrag).toHaveBeenCalledWith(0);
    expect(onParentPointerDown).not.toHaveBeenCalled();
    expect(handle.setPointerCapture).toHaveBeenCalled();
  });

  it("renders cubic paths and their two control guides", () => {
    renderLayer({ areaDraft: draft([{
      kind: "cubic",
      from: { x: 1, y: 1 },
      control1: { x: 2, y: 4 },
      control2: { x: 4, y: 4 },
      to: { x: 5, y: 1 },
    }]) });

    const layer = screen.getByTestId("raised-area-draft-preview");
    expect(screen.getByTestId("raised-area-draft-segment-0").getAttribute("d")).toBe("M 1 1 C 2 4 4 4 5 1");
    expect(layer.querySelectorAll('line[stroke="#a78bfa"]')).toHaveLength(2);
    expect(layer.querySelectorAll('circle[fill="#7c3aed"]')).toHaveLength(2);
  });

  it("renders straight and curved live closing previews", () => {
    const { rerender } = renderLayer({
      preview: { segment: { kind: "line", from: { x: 5, y: 4 }, to: { x: 1, y: 1 } }, cells: [] },
    });

    expect(screen.getByTestId("raised-area-draft-closing-segment").tagName.toLowerCase()).toBe("line");
    rerender(<svg>
      <TacticalEditorAreaDraftLayer
        draft={draft([])}
        preview={{
          segment: { kind: "quadratic", from: { x: 5, y: 4 }, control: { x: 3, y: 6 }, to: { x: 1, y: 1 } },
          cells: [],
        }}
        penNodeDrag={null}
        onBeginControlDrag={jest.fn()}
      />
    </svg>);

    expect(screen.getByTestId("raised-area-draft-closing-segment").getAttribute("d")).toBe("M 5 4 Q 3 6 1 1");
  });

  it("shows the reflected tangent guide only after the drag threshold", () => {
    const { rerender } = renderLayer({ penNodeDrag: { anchor: { x: 4, y: 4 }, handle: { x: 4.05, y: 4 } } });

    expect(screen.queryByTestId("raised-area-draft-tangent-guide")).toBeNull();
    rerender(<svg>
      <TacticalEditorAreaDraftLayer
        draft={draft([])}
        preview={{ segment: null, cells: [] }}
        penNodeDrag={{ anchor: { x: 4, y: 4 }, handle: { x: 6, y: 5 } }}
        onBeginControlDrag={jest.fn()}
      />
    </svg>);

    const guide = screen.getByTestId("raised-area-draft-tangent-guide");
    expect(guide.querySelector("line")?.getAttribute("x1")).toBe("2");
    expect(guide.querySelector("line")?.getAttribute("y1")).toBe("3");
  });

  it("renders nothing when there is no active area draft", () => {
    renderLayer({ areaDraft: null });

    expect(screen.queryByTestId("raised-area-draft-preview")).toBeNull();
  });
});

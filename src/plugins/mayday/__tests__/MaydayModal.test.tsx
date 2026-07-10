import { renderToStaticMarkup } from "react-dom/server";
import { MaydayModal } from "../MaydayModal";

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (selector: (state: unknown) => unknown) => selector({
    ui: { activeModal: null },
  }),
}));

describe("MaydayModal", () => {
  it("does not mount Mayday HTML controls while the modal is closed", () => {
    expect(renderToStaticMarkup(<MaydayModal />)).toBe("");
  });
});

export interface MaydayState {
  enabled: boolean;
}

export const initialMaydayState: MaydayState = {
  enabled: true,
};

const maydayReducer = (
  state: MaydayState = initialMaydayState,
) => state;

export default maydayReducer;

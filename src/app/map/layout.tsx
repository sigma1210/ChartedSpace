import StoreProvider from "../../components/StoreProvider";
import MapDataPreloader from "./MapDataPreloader";

const MapLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreProvider>
      <MapDataPreloader />
      {children}
    </StoreProvider>
  );
}
export default MapLayout

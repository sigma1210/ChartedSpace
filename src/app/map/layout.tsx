import StoreProvider from "../../components/StoreProvider";

const MapLayout = ({ children }: { children: React.ReactNode }) => {
  return <StoreProvider>{children}</StoreProvider>;
}
export default MapLayout

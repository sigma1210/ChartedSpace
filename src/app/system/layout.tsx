import StoreProvider from "@/components/StoreProvider";
import SystemDataPreloader from "./SystemDataPreloader";

const SystemLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreProvider>
      <SystemDataPreloader />
      {children}
    </StoreProvider>
  );
};

export default SystemLayout;

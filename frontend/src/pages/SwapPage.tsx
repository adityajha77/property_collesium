import Navbar from "@/components/Navbar";
import SwapPanel from "@/components/SwapPanel";

const SwapPage = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 parallax-bg -z-10" />
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] pt-16"> {/* Adjust pt-16 based on Navbar height */}
        <SwapPanel />
      </div>
    </div>
  );
};

export default SwapPage;

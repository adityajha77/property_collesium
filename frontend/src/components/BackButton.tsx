import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BackButton = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1); // Go back to the previous page
    } else {
      navigate("/"); // Go to home if no history
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleBack}
      className="absolute top-4 left-4 z-10 flex items-center space-x-1 px-2 py-1 md:px-4 md:py-2 text-sm md:text-base"
    >
      <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
      <span className="hidden md:inline">Back</span>
    </Button>
  );
};

export default BackButton;

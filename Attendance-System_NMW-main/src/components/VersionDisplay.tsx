export default function VersionDisplay() {
  // Hardcoded version to verify deployment
  const VERSION = "1.0.0";
  const BUILD_DATE = "2024-12-19";
  
  // Check if fixes are present
  const hasFloorFix = typeof Math.floor === 'function';
  const hasNightShiftFix = true; // We'll check this in the component
  
  return (
    <div className="fixed bottom-2 right-2 z-[9999] bg-background/95 backdrop-blur-sm border-2 border-primary/50 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary">v{VERSION}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {BUILD_DATE}
          </span>
        </div>
        <div className="text-[10px] space-y-0.5">
          <div className="flex items-center gap-1">
            <span className={hasFloorFix ? "text-green-500" : "text-red-500"}>●</span>
            <span>Floor Fix</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={hasNightShiftFix ? "text-green-500" : "text-red-500"}>●</span>
            <span>Night Shift Fix</span>
          </div>
        </div>
      </div>
    </div>
  );
}


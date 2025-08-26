import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-sage-bright/50 hover:bg-sage-bright/10 hover:border-sage-glow transition-all duration-200 bg-[hsl(100,20%,85%)]"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-orange-bright" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-sage-bright" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="bg-card/95 backdrop-blur-sm border-sage-bright/20"
      >
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="font-mono text-sm hover:bg-sage-bright/10 focus:bg-sage-bright/10"
        >
          <Sun className="mr-2 h-4 w-4 text-orange-bright" />
          <span className="text-sage-bright">Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="font-mono text-sm hover:bg-sage-bright/10 focus:bg-sage-bright/10"
        >
          <Moon className="mr-2 h-4 w-4 text-sage-bright" />
          <span className="text-sage-bright">Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="font-mono text-sm hover:bg-sage-bright/10 focus:bg-sage-bright/10"
        >
          <Monitor className="mr-2 h-4 w-4 text-sage-bright" />
          <span className="text-sage-bright">System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
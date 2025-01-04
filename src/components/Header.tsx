import { ModeToggle } from "./ModeToggle";
import { UserNav } from "./UserNav";
import { GitHubConnect } from "./GitHubConnect";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/favicon.ico" alt="Logo" className="w-6 h-6" />
          <span className="font-bold">Lovable</span>
        </div>
        <div className="flex items-center gap-4">
          <GitHubConnect />
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
};
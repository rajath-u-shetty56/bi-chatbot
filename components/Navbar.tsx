"use client";

import { Clipboard, Github, MessageSquare, Text } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "./ui/button";

export const Navbar = () => {
  const router = useRouter();

  const handleHomeClick = () => {
    router.refresh(); // refreshes current route — clears state
  };

  return (
    <header className="bg-zinc-900 text-white h-16 border-b border-zinc-800 flex items-center justify-between py-2">
      <div
        onClick={handleHomeClick}
        className="cursor-pointer flex items-center gap-4 border-r border-zinc-800 h-16 pr-32 border-r-2 relative group"
      >
        <MessageSquare className="h-5 w-5 text-zinc-400 ml-5" />
        <h1 className="">Bi-Chatbot</h1>
        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-700 ease-in-out"></span>
      </div>

      <div>
        <nav className="flex items-center ">
          {[{ name: "Home", href: "/" }].map(({ name, href }) => (
            <Link
              key={name}
              href={href}
              onClick={() => router.refresh()}
              className="text-zinc-400 px-6 hover:text-zinc-300 items-center flex border-zinc-800 border-l-2 h-16 relative group"
            >
              {name}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-700 ease-in-out"></span>
            </Link>
          ))}
          <div className="flex items-center border-l border-zinc-800 border-l-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-16 w-16 rounded-none relative group"
              asChild
            >
              <Link href="https://github.com">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-700 ease-in-out"></span>
              </Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
};

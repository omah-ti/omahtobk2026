"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import LogOutDialog from "@/components/log-out-dialog";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Home", href: "/dashboard-home", icon: "/icons/home.svg" },
  { label: "Progress", href: "/dashboard-home/progress", icon: "/icons/trending-up.svg" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const NavLinks = ({ onClose }: { onClose?: () => void }) => (
    <>
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`flex items-center w-full gap-2 rounded-[8px] transition-all
              ${isActive
                ? "px-[18px] py-[10px] bg-[#6E97F2] border border-[#6E97F2] shadow-[0_1px_2px_0_rgba(16,24,40,0.05)]"
                : "px-4 py-[10px] bg-white border border-[#F0F0F0]"
              }`}
          >
            <Image
              src={item.icon}
              alt={item.label}
              width={20}
              height={20}
              className={isActive ? "brightness-0 invert" : "brightness-0"}
            />
            <span className={`text-sm font-normal leading-[21px] ${isActive ? "text-white" : "text-[#333]"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      <aside className="hidden md:flex flex-col gap-9 w-[280px] min-h-screen shrink-0 px-10 pt-[57px] pb-10 bg-[#F5F7FF]">
        <div className="flex items-center gap-5 w-full">
          <Image
            src="/assets/default-robot.webp"
            alt="OmahTOBK Logo"
            width={49}
            height={45}
            className="shrink-0"
          />
          <div className="flex flex-col gap-[3px] min-w-0">
            <span className="font-bold text-base leading-5 text-[#6E97F2] whitespace-nowrap">
              OmahTOBK
            </span>
            <span className="text-sm font-normal leading-5 text-[#333] whitespace-nowrap">
              by Ilmu Komputer UGM
            </span>
          </div>
        </div>
        <nav className="flex flex-col gap-3 w-full">
          <NavLinks />
        </nav>
      </aside>

      <div className="md:hidden flex items-center justify-between w-full bg-[#F5F7FF] px-4 pt-4 pb-4 fixed top-0 left-0 z-40">
        <div className="flex items-center gap-[20px]">
          <Image
            src="/assets/default-robot.webp"
            alt="OmahTOBK Logo"
            width={38}
            height={35}
            className="shrink-0"
          />
          <div className="flex flex-col gap-[3px]">
            <span className="font-bold text-base leading-5 text-[#6E97F2] whitespace-nowrap">
              OmahTOBK
            </span>
            <span className="text-sm font-normal leading-5 text-[#333] whitespace-nowrap">
              by Ilmu Komputer UGM
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-[52px] h-[52px] rounded-[8px] bg-[#6E97F2] shrink-0"
        >
          <Menu size={20} color="white" />
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setIsOpen(false)} />
      )}

      <div className={`md:hidden fixed top-0 right-0 h-full w-[215px] bg-[#F5F7FF] z-50 flex flex-col justify-between py-[30px] px-4 transition-transform duration-300
        ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex flex-col gap-[23px]">
          <div className="flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center w-[52px] h-[52px] rounded-[8px] bg-[#6E97F2]"
            >
              <X size={20} color="white" />
            </button>
          </div>
          <nav className="flex flex-col gap-3 w-full">
            <NavLinks onClose={() => setIsOpen(false)} />
          </nav>
        </div>

        <LogOutDialog>
          <Button
            variant="outline"
            className="flex items-center justify-center gap-2 w-full py-[10px] px-4 rounded-[8px] border border-red-300 text-red-500 text-sm font-normal bg-transparent hover:bg-red-50 hover:text-red-500"
          >
            <LogOut size={16} />
            Log Out
          </Button>
        </LogOutDialog>
      </div>
    </>
  );
}
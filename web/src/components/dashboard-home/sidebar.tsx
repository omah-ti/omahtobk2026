"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";

const navItems = [
  {
    label: "Home",
    href: "/dashboard-home",
    icon: "/icons/home.svg",
  },
  {
    label: "Progress",
    href: "/dashboard-home/progress",
    icon: "/icons/trending-up.webp",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
            className={`flex items-center w-full gap-2 rounded-lg transition-all
              ${isActive
                ? "px-[18px] py-[10px] bg-[#6E97F2] border border-[#6E97F2] shadow-[0_1px_2px_0_rgba(16,24,40,0.05)]"
                : "px-4 py-[10px] bg-white border border-[#F0F0F0]"
              }`}
          >
            <Image
              src={item.icon} alt={item.label} width={20} height={20} className={item.icon === "/icons/home.svg" || isActive ? "brightness-0 invert" : ""}/>
            <span
              className={`text-sm font-normal leading-[21px] font-[Geologica]
                ${isActive ? "text-white" : "text-[#333]"}`}
            >
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
            <span className="font-bold text-base leading-5 text-[#6E97F2] font-['Plus_Jakarta_Sans'] whitespace-nowrap">
              OmahTOBK
            </span>
            <span className="text-sm font-normal leading-5 text-[#333] font-['Plus_Jakarta_Sans'] whitespace-nowrap">
              by Ilmu Komputer UGM
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-3 w-full">
          <NavLinks />
        </nav>
      </aside>

      <div className="md:hidden flex items-center justify-between px-5 py-4 bg-white border-b border-[#F0F0F0] w-full fixed top-0 left-0 z-40">
        <div className="flex items-center gap-3">
          <Image
            src="/assets/default-robot.webp"
            alt="OmahTOBK Logo"
            width={38}
            height={35}
            className="shrink-0"
          />
          <div className="flex flex-col gap-[2px] min-w-0">
            <span className="font-bold text-base leading-5 text-[#6E97F2] font-['Plus_Jakarta_Sans'] whitespace-nowrap">
              OmahTOBK
            </span>
            <span className="text-sm font-normal leading-5 text-[#333] font-['Plus_Jakarta_Sans'] whitespace-nowrap">
              by Ilmu Komputer UGM
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-lg bg-[#6E97F2] text-white"
        >
          <Menu size={20} />
        </button>
      </div>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`md:hidden fixed top-0 right-0 h-full w-[220px] bg-white z-50 flex flex-col justify-between py-6 px-4 shadow-xl transition-transform duration-300
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg bg-[#6E97F2] text-white"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex flex-col gap-3">
            <NavLinks />
          </nav>
        </div>

        <button className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border border-red-300 text-red-500 text-sm font-normal font-[Geologica]">
          <LogOut size={16} />
          Log Out
        </button>
      </div>
    </>
  );
}
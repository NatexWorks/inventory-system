"use client";
import Link from "next/link";
import {
  MdArrowForwardIos,
  MdDashboard,
  MdInventory,
  MdCategory,
  MdShoppingCart,
  MdGroups,
  MdBarChart,
  MdSettings,
  MdAccountCircle,
  MdClose,
  MdAddBox,
} from "react-icons/md";
import { usePathname } from "next/navigation";

export default function Sidebar({ open, handleClick, className = "", user }) {
  // Navigation items are declared in one place so the sidebar is easy to extend.
  const menuItems = [
    { name: "Dashboard", icon: <MdDashboard />, href: "/" },
    { name: "Add Product", icon: <MdAddBox />, href: "/addProducts" },
    { name: "Products", icon: <MdInventory />, href: "/products" },
    { name: "Categories", icon: <MdCategory />, href: "/categories" },
    { name: "Orders", icon: <MdShoppingCart />, href: "/orders" },
    { name: "Suppliers", icon: <MdGroups />, href: "/suppliers" },
    { name: "Reports", icon: <MdBarChart />, href: "/reports" },
    { name: "Settings", icon: <MdSettings />, href: "/settings" },
  ];

  const pathname = usePathname();

  // Marks the current route so the active section can be highlighted.
  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <div className={`flex min-h-screen flex-col border-r border-slate-800/80 bg-linear-to-b from-[#081028] to-[#0b1739] text-white transition-all duration-300 ${open ? "w-72" : "w-0 overflow-hidden"} ${className}`}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <MdInventory className="text-2xl text-blue-400" />
            Inventory SaaS
          </h1>
          <button
            type="button"
            onClick={handleClick}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/80 transition hover:bg-white/15"
            aria-label={open ? "Close sidebar" : "Open sidebar"}
          >
            <MdClose className="text-2xl" />
          </button>
        </div>

        <div className="flex-1 px-3 py-4">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={`mb-2 flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200 ${
                isActive(item.href)
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.name}</span>
              {isActive(item.href) ? <MdArrowForwardIos className="ml-auto text-xs" /> : null}
            </Link>
          ))}
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
              <MdAccountCircle className="text-4xl text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-semibold">{user?.name || "Loading profile..."}</p>
              <p className="text-xs text-gray-400">{user?.email || "Please wait"}</p>
            </div>
          </div>
        </div>
    </div>
    </>
  );
}

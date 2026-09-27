import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";

export default function MultiSelectDropdown({
  label,
  options = [],
  selectedIds = [],
  onChange,
  placeholder = "Seleccionar opciones...",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (id) => {
    const safeSelected = selectedIds || [];
    if (safeSelected.includes(id)) {
      onChange(safeSelected.filter((item) => item !== id));
    } else {
      onChange([...safeSelected, id]);
    }
  };

  const selectedItems = options.filter((opt) =>
    (selectedIds || []).includes(opt.id),
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="block font-semibold text-slate-700 mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white flex items-center justify-between outline-none focus:border-indigo-600 transition min-h-[38px]"
      >
        <div className="flex flex-wrap gap-1 items-center max-w-[90%] overflow-hidden">
          {selectedItems.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            selectedItems.map((item) => (
              <span
                key={item.id}
                className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-md font-medium flex items-center gap-1 text-[11px]"
              >
                {item.nombre}
                <X
                  className="w-3 h-3 hover:text-indigo-900 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(item.id);
                  }}
                />
              </span>
            ))
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto p-1.5 space-y-1">
          {options.length === 0 ? (
            <div className="text-slate-400 text-center py-2 text-[11px] italic">
              No hay opciones disponibles
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = (selectedIds || []).includes(opt.id);
              return (
                <div
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition ${
                    isSelected
                      ? "bg-indigo-50 font-bold text-indigo-700"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="truncate">{opt.nombre}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

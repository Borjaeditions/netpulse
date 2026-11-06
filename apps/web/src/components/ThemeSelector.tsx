import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react";
import type { Theme } from "../hooks/useTheme";

interface Props {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

const options = [
  { value: "system", label: "Automático", Icon: Monitor },
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Oscuro", Icon: Moon },
] as const;

export default function ThemeSelector({ theme, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === theme)!;
  const SelectedIcon = selected.Icon;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="theme-selector" ref={containerRef}>
      <button
        type="button"
        className="theme-trigger"
        aria-label={`Apariencia: ${selected.label}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        <SelectedIcon size={18} />
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="theme-menu">
          {options.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              className={`theme-option ${
                theme === value ? "selected" : ""
              }`}
              onClick={() => {
                onChange(value);
                setOpen(false);
              }}
            >
              <Icon size={17} />
              <span>{label}</span>
              {theme === value && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

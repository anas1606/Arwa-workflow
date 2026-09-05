import React from "react";
import clsx from "clsx";
import Link from "next/link";

const Button = ({
    children,
    onClick,
    type = "button",
    variant = "primary",
    size = "md",
    text = "",
    icon: Icon,
    iconPosition = "left",
    className = "",
    disabled = false,
    href = "",
}) => {
    const baseStyle =
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50";

    const sizes = {
        sm: "min-h-10 px-3 py-1.5 text-xs",
        md: "min-h-11 px-3.5 text-sm sm:min-h-10",
        square: "h-11 w-11 min-w-0 p-2 sm:h-10 sm:w-10"
    };

    const variants = {
        primary: "bg-brand-600 text-white shadow-md shadow-brand-600/20 hover:bg-brand-700",
        secondary: "border border-ink-400/28 text-ink-800 hover:bg-white/85 bg-white/62 backdrop-blur-md backdrop-saturate-150 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-white)_85%,transparent)]",
        ghost: "text-ink-600 hover:bg-white/55 hover:text-ink-900",
        danger: "bg-danger-600 text-white hover:bg-danger-700 shadow-md shadow-danger-600/20",
    };

    const iconSize = size === "sm" || size === "square" ? 14 : 18;

    const content = (
        <>
            {Icon && iconPosition === "left" && (
                typeof Icon === "function" ? Icon({ size: iconSize }) : <Icon size={iconSize} />
            )}
            {(children || text) && <span className="leading-none">{children || text}</span>}
            {Icon && iconPosition === "right" && (
                typeof Icon === "function" ? Icon({ size: iconSize }) : <Icon size={iconSize} />
            )}
        </>
    );

    const commonClasses = clsx(baseStyle, variants[variant], sizes[size], className);

    if (href) {
        return (
            <Link href={href} className={commonClasses}>
                {content}
            </Link>
        );
    }

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={commonClasses}
        >
            {content}
        </button>
    );
};

export default Button;
